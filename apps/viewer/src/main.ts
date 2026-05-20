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

function renderSurfaces(
  container: HTMLElement,
  processor: MessageProcessor<any>,
  modeHint?: string,
): void {
  const surfaces = Array.from(processor.model.surfacesMap.values());
  if (surfaces.length === 0) {
    showState(container, "No renderable surfaces generated.");
    return;
  }

  container.innerHTML = "";
  if (modeHint) {
    const hint = document.createElement("p");
    hint.className = "viewer-state";
    hint.textContent = modeHint;
    container.appendChild(hint);
  }

  for (const surface of surfaces) {
    const el = document.createElement("a2learn-markdown-surface") as any;
    el.surface = surface;
    container.appendChild(el);
  }
}

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

  processor.processMessages(startData.messages);
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
  renderSurfaces(container, processor, "Offline mode: Previewing message file only, no interaction callbacks.");
}

async function bootstrapViewer() {
  const root = setupRoot();
  if (!root) {
    return;
  }
  const initialConfig = configFromLocation();
  applyEmbedFlag(initialConfig.embed);
  applyThemeVars(initialConfig.source.themeVars);

  const title = initialConfig.embed ? "" : "A2Learn Viewer";
  const subtitle = initialConfig.embed
    ? ""
    : "For previewing Agent-generated A2UI Surfaces, with real-time loading and basic error feedback.";

  renderAppFrame(
    root,
    title,
    subtitle,
    `<section id="surface-container" aria-live="polite">
      <p class="viewer-state loading">Loading A2UI message file, please wait...</p>
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
    try {
      if (cfg.source.mode === "online") {
        await bootstrapOnline(container, cfg.source);
        stopResize();
        stopResize = setupAutoResize(container, () => parentOrigin);
        return;
      }
    } catch (err) {
      showState(
        container,
        `Online mode unavailable, downgrading to offline preview.\nReason: ${String(err)}`,
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
