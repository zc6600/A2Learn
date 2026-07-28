import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";
import "@a2learn/viewer-kit/markdown-surface";
import {
  injectBaseTheme,
  renderAppFrame,
  showState,
} from "@a2learn/viewer-kit/page-shell";
import { bootstrapGallery } from "@a2learn/viewer-kit/gallery/gallery-ui";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;


type SessionStartResponse = {
  session_id: string;
  mode: "online";
  messages: A2uiMessage[];
};

type SessionActionResponse = {
  session_id: string;
  messages: A2uiMessage[];
  action_count: number;
};

type ViewerSourceOffline = {
  mode: "offline";
  messagesUrl: string;
  themeVars?: Record<string, string>;
};

type ViewerSourceOnline = {
  mode: "online";
  apiBaseUrl: string;
  resourcePath?: string;
  resourceText?: string;
  headers?: Record<string, string>;
  themeVars?: Record<string, string>;
};

type ViewerRuntimeConfig = {
  embed: boolean;
  source: ViewerSourceOffline | ViewerSourceOnline;
};

type InitMessage = {
  type: "a2learn:init";
  source:
    | {
        mode: "offline";
        messagesUrl?: string;
        themeVars?: Record<string, string>;
      }
    | {
        mode: "online";
        apiBaseUrl?: string;
        resourcePath?: string;
        resourceText?: string;
        headers?: Record<string, string>;
        themeVars?: Record<string, string>;
      };
};

type ReadyMessage = {
  type: "a2learn:ready";
};

type ResizeMessage = {
  type: "a2learn:resize";
  height: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeThemeVars(input: unknown): Record<string, string> | undefined {
  if (!isPlainObject(input)) {
    return undefined;
  }
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    if (!key.startsWith("--")) {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    entries.push([key, value]);
  }
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function applyThemeVars(vars?: Record<string, string>): void {
  if (!vars) {
    return;
  }
  for (const [key, value] of Object.entries(vars)) {
    if (!key.startsWith("--")) {
      continue;
    }
    document.documentElement.style.setProperty(key, value);
  }
}

function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, "");
}

function configFromLocation(): ViewerRuntimeConfig {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get("embed") === "1";

  const modeRaw = (params.get("mode") || "").toLowerCase();
  const messagesUrlParam = params.get("messagesUrl") || "";
  const apiBaseUrlParam = params.get("apiBaseUrl") || params.get("apiUrl") || "";
  const resourcePathParam = params.get("resourcePath") || "";
  const resourceTextParam = params.get("resourceText") || "";
  const headersParam = params.get("headers") || "";
  const themeParam = params.get("themeVars") || params.get("theme") || "";
  const parsedHeaders = headersParam ? safeJsonParse(headersParam) : undefined;
  const parsedTheme = themeParam ? safeJsonParse(themeParam) : undefined;
  const headers = isPlainObject(parsedHeaders)
    ? Object.fromEntries(
        Object.entries(parsedHeaders).filter(([, v]) => typeof v === "string") as Array<[
          string,
          string,
        ]>,
      )
    : undefined;
  const themeVars = normalizeThemeVars(parsedTheme);

  const envApiUrl = (import.meta.env.VITE_A2LEARN_API_URL || "").trim();
  const envMessagesUrl = (import.meta.env.VITE_A2LEARN_MESSAGES_URL || "").trim();
  const envResourcePath = (import.meta.env.VITE_A2LEARN_RESOURCE_PATH || "").trim();
  const envResourceText = (import.meta.env.VITE_A2LEARN_RESOURCE_TEXT || "").trim();

  const apiBaseUrl = (apiBaseUrlParam || envApiUrl).trim();
  const messagesUrl = (messagesUrlParam || envMessagesUrl || "/generated/site_messages.json").trim();
  const resourcePath = (resourcePathParam || envResourcePath).trim() || undefined;
  const resourceText = (resourceTextParam || envResourceText).trim() || undefined;

  const preferredMode = modeRaw === "online" || modeRaw === "offline" ? (modeRaw as "online" | "offline") : undefined;
  const resolvedMode = preferredMode || (apiBaseUrl ? "online" : "offline");

  if (resolvedMode === "online") {
    return {
      embed,
      source: {
        mode: "online",
        apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
        resourcePath,
        resourceText,
        headers,
        themeVars,
      },
    };
  }
  return {
    embed,
    source: {
      mode: "offline",
      messagesUrl,
      themeVars,
    },
  };
}

function applyEmbedFlag(embed: boolean): void {
  if (embed) {
    document.documentElement.dataset.a2learnEmbed = "1";
  } else {
    delete document.documentElement.dataset.a2learnEmbed;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (!k || typeof v !== "string") {
        continue;
      }
      headers[k] = v;
    }
  }
  return headers;
}

function setupRoot(): HTMLElement | null {
  const root = document.getElementById("app");
  if (!root) {
    return null;
  }
  root.setAttribute("role", "main");
  injectBaseTheme();
  return root;
}

function extractLastCreatedSurfaceId(messages: A2uiMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        return surfaceId;
      }
    }
  }
  return null;
}

function injectRoutingTheme(): void {
  if (document.getElementById("a2learn-routing-theme")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "a2learn-routing-theme";
  style.textContent = `
    .surface-tabs-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      margin-bottom: 24px;
    }
    .surface-tabs {
      display: flex;
      gap: 8px;
      padding: 6px;
      border-radius: 12px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 92%, var(--a2ui-color-secondary));
      border: 1px solid var(--a2ui-color-border);
      overflow-x: auto;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none;  /* IE and Edge */
    }
    .surface-tabs::-webkit-scrollbar {
      display: none; /* Chrome, Safari and Opera */
    }
    .surface-tab {
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 600;
      color: var(--app-muted);
      border-radius: 8px;
      cursor: pointer;
      border: none;
      background: transparent;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .surface-tab:hover {
      color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 8%, transparent);
    }
    .surface-tab.active {
      color: #ffffff;
      background: var(--a2ui-color-primary);
      box-shadow: 0 4px 12px color-mix(in oklab, var(--a2ui-color-primary) 30%, transparent);
    }
  `;
  document.head.appendChild(style);
}

function getSurfaceTitle(surface: any): string {
  if (surface.title) return surface.title;
  if (surface.name) return surface.name;
  
  if (surface.componentsMap && surface.componentsMap.size > 0) {
    const components = Array.from(surface.componentsMap.values()) as any[];
    
    // Look for first Text component with variant h1/h2
    const headingComp = components.find((c: any) => c.component === "Text" && (c.variant === "h1" || c.variant === "h2") && c.text);
    if (headingComp) {
      return headingComp.text;
    }
    
    // Look for any component with title
    const titleComp = components.find((c: any) => c.title);
    if (titleComp) {
      return titleComp.title;
    }

    // Look for any Text component
    const anyTextComp = components.find((c: any) => c.component === "Text" && c.text);
    if (anyTextComp) {
      return anyTextComp.text;
    }
  }
  
  const id = surface.id || "Page";
  return id
    .replace(/^site-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function renderSurfaces(
  container: HTMLElement,
  processor: MessageProcessor<any>,
  modeHint?: string,
): void {
  injectRoutingTheme();

  const surfaces = Array.from(processor.model.surfacesMap.values());
  if (surfaces.length === 0) {
    showState(container, "No renderable surfaces generated.");
    return;
  }

  container.innerHTML = "";

  // Determine the active surface ID
  const hash = window.location.hash;
  let activeId: string | null = null;
  if (hash.startsWith("#/")) {
    const parsedId = hash.slice(2);
    if (surfaces.some(s => s.id === parsedId)) {
      activeId = parsedId;
    }
  }
  
  if (!activeId && surfaces.length > 0) {
    activeId = surfaces[0].id ?? null;
  }

  // Render tab bar if there are multiple surfaces
  if (surfaces.length > 1) {
    const tabsContainer = document.createElement("div");
    tabsContainer.className = "surface-tabs-container";

    const tabsList = document.createElement("div");
    tabsList.className = "surface-tabs";
    tabsList.setAttribute("role", "tablist");

    for (const surface of surfaces) {
      const surfaceId = surface.id ?? "";
      const isActive = surfaceId === activeId;
      const tabButton = document.createElement("button");
      tabButton.className = `surface-tab${isActive ? " active" : ""}`;
      tabButton.setAttribute("role", "tab");
      tabButton.setAttribute("aria-selected", isActive ? "true" : "false");
      tabButton.setAttribute("data-surface-id", surfaceId);
      
      const tabTitle = getSurfaceTitle(surface);
      tabButton.textContent = tabTitle;

      tabButton.addEventListener("click", () => {
        window.location.hash = `#/${surfaceId}`;
      });

      tabsList.appendChild(tabButton);
    }
    tabsContainer.appendChild(tabsList);
    container.appendChild(tabsContainer);
  }

  // Render only the active surface
  const activeSurface = surfaces.find(s => s.id === activeId);
  if (activeSurface) {
    const el = document.createElement("a2learn-markdown-surface") as any;
    el.surface = activeSurface;
    el.setAttribute("data-surface-id", activeSurface.id ?? "");
    container.appendChild(el);
  }
}

// Register window hashchange listener once
window.addEventListener("hashchange", () => {
  if (activeRuntime) {
    renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
  }
});


function modeHintForSending(container: HTMLElement, isSending: boolean): void {
  const first = container.querySelector(".viewer-state");
  if (!first) {
    return;
  }
  const next = first as HTMLParagraphElement;
  if (isSending) {
    next.textContent = "Online mode connected, syncing latest interaction with Agent...";
  } else {
    next.textContent = "Online mode connected, supporting interaction callbacks and incremental updates.";
  }
}

function postToParent(message: ReadyMessage | ResizeMessage, targetOrigin: string): void {
  if (window.parent === window) {
    return;
  }
  try {
    window.parent.postMessage(message, targetOrigin);
  } catch {
    // ignore
  }
}

function setupAutoResize(container: HTMLElement, getTargetOrigin: () => string): () => void {
  if (window.parent === window) {
    return () => {};
  }
  let raf = 0;
  const send = () => {
    if (raf) {
      cancelAnimationFrame(raf);
    }
    raf = requestAnimationFrame(() => {
      const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      postToParent({ type: "a2learn:resize", height }, getTargetOrigin());
    });
  };
  const observer = new ResizeObserver(() => send());
  observer.observe(document.documentElement);
  observer.observe(container);
  send();
  return () => {
    observer.disconnect();
    if (raf) {
      cancelAnimationFrame(raf);
    }
  };
}

async function bootstrapOnline(
  container: HTMLElement,
  source: ViewerSourceOnline,
): Promise<boolean> {
  const startPayload = {
    resource_path: source.resourcePath || undefined,
    resource_text: source.resourceText || undefined,
  };
  const startResponse = await fetch(`${source.apiBaseUrl}/api/session/start`, {
    method: "POST",
    headers: buildHeaders(source.headers),
    body: JSON.stringify(startPayload),
  });
  if (!startResponse.ok) {
    throw new Error(`Online session initialization failed (${startResponse.status})`);
  }
  const startData = (await startResponse.json()) as SessionStartResponse;
  const sessionId = startData.session_id;
  if (!sessionId || !Array.isArray(startData.messages)) {
    throw new Error("Online session response format error.");
  }

  let isSendingAction = false;

  const pendingActions: any[] = [];
  const MAX_PENDING_ACTIONS = 50;

  const processor = new MessageProcessor([a2learnCatalog], (action: any) => {
    if (!sessionId || !action) return;
    pendingActions.push(action);
    if (pendingActions.length > MAX_PENDING_ACTIONS) {
      pendingActions.shift();
    }
    modeHintForSending(container, true);
    void flushPendingActions();
  });

  const flushPendingActions = async () => {
    if (isSendingAction) return;
    const next = pendingActions.shift();
    if (!next) {
      modeHintForSending(container, false);
      return;
    }
    isSendingAction = true;
    try {
      const res = await fetch(`${source.apiBaseUrl}/api/session/${sessionId}/action`, {
        method: "POST",
        headers: buildHeaders(source.headers),
        body: JSON.stringify({ action: next }),
      });
      if (!res.ok) {
        throw new Error(`Interaction callback failed (${res.status})`);
      }
      const data = (await res.json()) as SessionActionResponse;
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        processor.processMessages(data.messages);
        const lastCreatedId = extractLastCreatedSurfaceId(data.messages);
        if (lastCreatedId) {
          window.location.hash = `#/${lastCreatedId}`;
        }
        renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
      }
    } catch (err) {
      showState(
        container,
        `Online interaction callback failed: ${String(err)}\nPlease check API service status and retry.`,
        "error",
      );
    } finally {
      isSendingAction = false;
      if (pendingActions.length === 0) {
        modeHintForSending(container, false);
        return;
      }
      void flushPendingActions();
    }
  };

  activeRuntime = {
    container,
    processor,
    modeHint: "Online mode connected, supporting interaction callbacks and incremental updates.",
  };

  processor.processMessages(startData.messages);
  const startCreatedId = extractLastCreatedSurfaceId(startData.messages);
  if (startCreatedId) {
    window.location.hash = `#/${startCreatedId}`;
  }
  renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
  return true;
}

async function bootstrapOffline(container: HTMLElement, source: ViewerSourceOffline): Promise<void> {
  const configuredUrl = source.messagesUrl || "/generated/site_messages.json";
  const separator = configuredUrl.includes("?") ? "&" : "?";
  const res = await fetch(`${configuredUrl}${separator}ts=${Date.now()}`);
  if (!res.ok) {
    showState(container, "Unable to load A2UI messages, please run Agent to generate messages first.", "error");
    return;
  }
  const messages = await res.json();

  const processor = new MessageProcessor([a2learnCatalog]);
  try {
    processor.processMessages(messages);
  } catch (err) {
    showState(container, `A2UI message processing failed: ${String(err)}`, "error");
    return;
  }

  activeRuntime = {
    container,
    processor,
    modeHint: "Offline mode: Previewing message file only, no interaction callbacks.",
  };

  const lastCreatedId = extractLastCreatedSurfaceId(messages);
  if (lastCreatedId) {
    window.location.hash = `#/${lastCreatedId}`;
  }
  renderSurfaces(container, processor, "Offline mode: Previewing message file only, no interaction callbacks.");
}

const LOCAL_STORAGE_KEY = "a2learn_user_api_key";

function getStoredApiKey(): string {
  try {
    return (localStorage.getItem(LOCAL_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function setStoredApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function updateKeyPillStatus(): void {
  const pill = document.getElementById("app-key-pill");
  if (!pill) return;
  const key = getStoredApiKey();
  if (key) {
    pill.className = "app-key-pill active";
    pill.textContent = "🔑 API Key 已配置";
  } else {
    pill.className = "app-key-pill missing";
    pill.textContent = "🔑 API Key 待配置";
  }
}

function initAppControls(onGenerate: (promptText: string) => void): void {
  const settingsBtn = document.getElementById("app-settings-btn");
  const modal = document.getElementById("app-settings-modal");
  const closeBtn = document.getElementById("app-modal-close");
  const saveBtn = document.getElementById("app-modal-save");
  const clearBtn = document.getElementById("app-modal-clear");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  const form = document.getElementById("app-prompt-form") as HTMLFormElement | null;
  const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;

  updateKeyPillStatus();

  const openModal = () => {
    if (keyInput) keyInput.value = getStoredApiKey();
    modal?.classList.remove("hidden");
  };

  const closeModal = () => {
    modal?.classList.add("hidden");
  };

  settingsBtn?.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  saveBtn?.addEventListener("click", () => {
    if (keyInput) {
      setStoredApiKey(keyInput.value);
      updateKeyPillStatus();
    }
    closeModal();
  });

  clearBtn?.addEventListener("click", () => {
    setStoredApiKey("");
    if (keyInput) keyInput.value = "";
    updateKeyPillStatus();
    closeModal();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const promptText = (promptInput?.value || "").trim();
    if (!promptText) return;

    const key = getStoredApiKey();
    if (!key) {
      openModal();
      alert("请先点击右上角配置你的 OpenRouter API Key 以调用 AI 引擎。");
      return;
    }
    onGenerate(promptText);
  });

  const chips = document.querySelectorAll(".app-preset-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = chip.getAttribute("data-preset");
      if (preset) {
        if (promptInput) promptInput.value = preset;
        const key = getStoredApiKey();
        if (!key) {
          openModal();
          alert("请先配置你的 OpenRouter API Key 以开始生成流程！");
          return;
        }
        onGenerate(preset);
      }
    });
  });

  window.addEventListener("a2learn-explore-concept", (e: Event) => {
    const concept = (e as CustomEvent).detail?.concept;
    if (!concept) return;
    const promptText = `详细解释 ${concept}`;
    if (promptInput) promptInput.value = promptText;

    const key = getStoredApiKey();
    if (!key) {
      openModal();
      alert("请先点击右上角配置你的 OpenRouter API Key 以调用 AI 引擎。");
      return;
    }
    onGenerate(promptText);
  });
}

async function bootstrapViewer() {
  const root = setupRoot();
  if (!root) {
    return;
  }
  const initialConfig = configFromLocation();
  applyEmbedFlag(initialConfig.embed);
  applyThemeVars(initialConfig.source.themeVars);

  const title = initialConfig.embed ? "" : "A2Learn Showcase Generator";
  const subtitle = initialConfig.embed
    ? ""
    : "AI 驱动的动态教学 Showcase 引擎 · 自动规划课程大纲并实时生成 A2UI 界面";

  renderAppFrame(
    root,
    title,
    subtitle,
    `<section id="surface-container" aria-live="polite">
      <p class="viewer-state loading">正在加载 A2UI Showcase 界面，请稍候...</p>
    </section>`,
  );

  const container = document.getElementById("surface-container");
  if (!container) {
    return;
  }

  let parentOrigin = "*";
  let stopResize = setupAutoResize(container, () => parentOrigin);
  if (initialConfig.embed) {
    postToParent({ type: "a2learn:ready" }, parentOrigin);
  }

  const startWithConfig = async (cfg: ViewerRuntimeConfig) => {
    applyEmbedFlag(cfg.embed);
    applyThemeVars(cfg.source.themeVars);

    // Merge stored API Key if present
    const storedKey = getStoredApiKey();
    if (cfg.source.mode === "online" && storedKey) {
      cfg.source.headers = {
        ...(cfg.source.headers || {}),
        Authorization: `Bearer ${storedKey}`,
      };
    }

    try {
      if (cfg.source.mode === "online") {
        showState(container, "🧠 AI Agent 正在规划大纲与生成 A2UI 组件，请稍候...", "loading");
        await bootstrapOnline(container, cfg.source);
        stopResize();
        stopResize = setupAutoResize(container, () => parentOrigin);
        return;
      }
    } catch (err) {
      showState(
        container,
        `Online 交互生成失败（可能缺少有效的 API Key 或 API 服务未连通）。\n错误信息: ${String(err)}\n降级到 Offline 预设视图展示。`,
        "error",
      );
    }
    await bootstrapOffline(
      container,
      cfg.source.mode === "offline"
        ? cfg.source
        : { mode: "offline", messagesUrl: "/generated/site_messages.json" },
    );
    stopResize();
    stopResize = setupAutoResize(container, () => parentOrigin);
  };

  if (!initialConfig.embed) {
    initAppControls((promptText: string) => {
      const currentApiUrl =
        initialConfig.source.mode === "online"
          ? initialConfig.source.apiBaseUrl
          : (import.meta.env.VITE_A2LEARN_API_URL || "http://127.0.0.1:8008").trim();

      const userKey = getStoredApiKey();
      const onlineConfig: ViewerRuntimeConfig = {
        embed: false,
        source: {
          mode: "online",
          apiBaseUrl: normalizeBaseUrl(currentApiUrl),
          resourceText: promptText,
          headers: userKey ? { Authorization: `Bearer ${userKey}` } : undefined,
        },
      };
      void startWithConfig(onlineConfig);
    });
  }

  const onMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!isPlainObject(data)) {
      return;
    }
    if (data.type === "a2learn:init" && isPlainObject((data as any).source)) {
      const source = (data as InitMessage).source;
      parentOrigin = event.origin || "*";

      const themeVarsFromSource = normalizeThemeVars((source as any).themeVars);

      if (source.mode === "online" && typeof (source as any).apiBaseUrl === "string") {
        const next: ViewerRuntimeConfig = {
          embed: true,
          source: {
            mode: "online",
            apiBaseUrl: normalizeBaseUrl(String((source as any).apiBaseUrl || "")),
            resourcePath: typeof (source as any).resourcePath === "string" ? String((source as any).resourcePath) : undefined,
            resourceText: typeof (source as any).resourceText === "string" ? String((source as any).resourceText) : undefined,
            headers: isPlainObject((source as any).headers)
              ? Object.fromEntries(
                  Object.entries((source as any).headers).filter(([, v]) => typeof v === "string") as Array<[
                    string,
                    string,
                  ]>,
                )
              : undefined,
            themeVars: themeVarsFromSource,
          },
        };
        void startWithConfig(next);
        return;
      }

      if (source.mode === "offline" && typeof (source as any).messagesUrl === "string") {
        const next: ViewerRuntimeConfig = {
          embed: true,
          source: {
            mode: "offline",
            messagesUrl: String((source as any).messagesUrl || "").trim() || "/generated/site_messages.json",
            themeVars: themeVarsFromSource,
          },
        };
        void startWithConfig(next);
      }
    }
  };

  window.addEventListener("message", onMessage);
  await startWithConfig(initialConfig);
}

async function bootstrap() {
  if (import.meta.env.MODE === "gallery") {
    const root = setupRoot();
    if (root) {
      bootstrapGallery(root);
    }
    return;
  }
  await bootstrapViewer();
}

bootstrap().catch((err) => {
  const root = document.getElementById("app");
  if (!root) {
    return;
  }
  const target =
    document.getElementById("gallery-preview") ||
    document.getElementById("surface-container") ||
    root;
  showState(target as HTMLElement, String(err), "error");
});
