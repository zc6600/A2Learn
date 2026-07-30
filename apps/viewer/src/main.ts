import { A2uiMessage, MessageProcessor } from "@a2ui/web_core/v0_9";
import { a2learnCatalog } from "@a2learn/a2learn-catalog";
import "@a2ui/lit/v0_9";
import "@a2learn/viewer-kit/markdown-surface";
import {
  injectBaseTheme,
  renderAppFrame,
  renderExamplesStrip,
  showState,
  type AppChromeStrings,
  type ExampleCardItem,
} from "@a2learn/viewer-kit/page-shell";
import { bootstrapGallery } from "@a2learn/viewer-kit/gallery/gallery-ui";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;


type SessionStatus = "pending" | "ready" | "error";

type SessionStartResponse = {
  session_id: string;
  mode: "online";
  status: SessionStatus;
  messages: A2uiMessage[];
};

type SessionStatusResponse = {
  session_id: string;
  status: SessionStatus;
  messages: A2uiMessage[];
  error?: string | null;
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
  // Having VITE_A2LEARN_API_URL configured only means the online-generation
  // *feature* is available (used later when the user submits a prompt via
  // onGenerate) — it must not, by itself, make a bare page load (or a stale
  // hash deep link) try to auto-generate with no prompt. Only resolve to
  // "online" here if the caller actually asked for it (mode=online) or gave
  // something to generate from (resourceText/resourcePath).
  const resolvedMode =
    preferredMode || (apiBaseUrl && (resourceText || resourcePath) ? "online" : "offline");

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

type Lang = "zh" | "en";

const LANG_STORAGE_KEY = "a2learn_lang";

function getLang(): Lang {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

const T: Record<
  Lang,
  {
    subtitle: string;
    examplesStripTitle: string;
    pickExamplePrompt: string;
    loadingShowcase: string;
    agentPlanning: string;
    onlineFailedPrefix: string;
    onlineFailedFallback: string;
    noBackendConfigured: string;
    needApiKeyExplore: string;
    needApiKeyPreset: string;
    staticTreeLeafNote: string;
  }
> = {
  zh: {
    subtitle: "AI 驱动的动态教学 Showcase 引擎 · 自动规划课程大纲并实时生成 A2UI 界面",
    examplesStripTitle: "📚 案例陈列（无需 API Key，静态预生成示例）",
    pickExamplePrompt: "👋 从下方选择一个案例查看效果，或点击右上角配置 API Key 后输入你自己的学习主题实时生成。",
    loadingShowcase: "正在加载 A2UI Showcase 界面，请稍候...",
    agentPlanning: "🧠 AI Agent 正在规划大纲与生成 A2UI 组件，请稍候...",
    onlineFailedPrefix: "Online 交互生成失败（可能缺少有效的 API Key 或 API 服务未连通）。",
    onlineFailedFallback: "降级到 Offline 预设视图展示。",
    noBackendConfigured:
      "尚未配置在线生成后端（VITE_A2LEARN_API_URL）。当前部署仅支持浏览左上方的静态案例陈列；如需 BYOK 实时生成，请先部署后端并在构建前端时设置该环境变量，详见 DEPLOY.md。",
    needApiKeyExplore: "请先点击右上角配置你的 OpenRouter API Key 以调用 AI 引擎。",
    needApiKeyPreset: "请先配置你的 OpenRouter API Key 以开始生成流程！",
    staticTreeLeafNote: "静态案例陈列仅展示到这一层；连接 BYOK 在线后端后可继续深入生成完整内容。",
  },
  en: {
    subtitle: "An AI-driven dynamic teaching showcase engine · auto-plans a curriculum outline and generates the A2UI interface live",
    examplesStripTitle: "📚 Example Gallery (no API key needed — static pre-generated demos)",
    pickExamplePrompt:
      "👋 Pick an example below to see it in action, or configure your API key in the top right and enter your own topic to generate one live.",
    loadingShowcase: "Loading the A2UI showcase interface, please wait...",
    agentPlanning: "🧠 The AI agent is planning the outline and generating A2UI components, please wait...",
    onlineFailedPrefix: "Live generation failed (invalid API key, or the API service is unreachable).",
    onlineFailedFallback: "Falling back to the offline preset view.",
    noBackendConfigured:
      "No live-generation backend is configured (VITE_A2LEARN_API_URL). This deployment only supports browsing the static example gallery above; to enable BYOK live generation, deploy the backend and set that environment variable when building the frontend — see DEPLOY.md.",
    needApiKeyExplore: "Please configure your OpenRouter API Key in the top right before using the AI engine.",
    needApiKeyPreset: "Please configure your OpenRouter API Key first to start generating!",
    staticTreeLeafNote: "This static example only goes this deep; connect a BYOK online backend to keep generating deeper content.",
  },
};

const CHROME_STRINGS: Record<Lang, AppChromeStrings> = {
  zh: {
    promptPlaceholder: "输入你想学习的知识主题（例如：解释 Hash Map 机制...）",
    submitLabel: "⚡ 实时生成 Showcase",
    presetsLabel: "热门推荐：",
    presets: [
      { label: "Hash Map 原理", prompt: "Explain how a Hash Map works step by step in detail with visual mental model and code example" },
      { label: "Transformer 架构", prompt: "Explain the Transformer architecture and attention mechanism in deep learning" },
      { label: "HTTP/3 协议", prompt: "Explain HTTP/3 protocol QUIC features and advantages over HTTP/2" },
      { label: "三体星系天体物理", prompt: "Explain the Three Body Problem orbital dynamics in astrophysics" },
    ],
    settingsBtnLabel: "⚙️ API Key",
    settingsBtnTitle: "设置 OpenRouter API Key",
    keyPillMissingLabel: "🔑 API Key 待配置",
    modalTitle: "⚙️ 配置 API Key (BYOK 模式)",
    modalBodyIntroHtml:
      "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将仅保存在浏览器本地（<code>localStorage</code>），每次交互时透传给后端，绝不上交服务器保存。",
    modalBodyFooter: "无 API Key？你也可以直接点击主页顶部的热门推荐，预览预置的精美 Showcase。",
    modalClearLabel: "清空 Key",
    modalSaveLabel: "保存配置",
  },
  en: {
    promptPlaceholder: "Enter a topic you want to learn (e.g., Explain how Hash Maps work...)",
    submitLabel: "⚡ Generate Showcase Live",
    presetsLabel: "Popular picks:",
    presets: [
      { label: "Hash Map Internals", prompt: "Explain how a Hash Map works step by step in detail with visual mental model and code example" },
      { label: "Transformer Architecture", prompt: "Explain the Transformer architecture and attention mechanism in deep learning" },
      { label: "HTTP/3 Protocol", prompt: "Explain HTTP/3 protocol QUIC features and advantages over HTTP/2" },
      { label: "Three-Body Problem Physics", prompt: "Explain the Three Body Problem orbital dynamics in astrophysics" },
    ],
    settingsBtnLabel: "⚙️ API Key",
    settingsBtnTitle: "Configure OpenRouter API Key",
    keyPillMissingLabel: "🔑 API Key not set",
    modalTitle: "⚙️ Configure API Key (BYOK mode)",
    modalBodyIntroHtml:
      "Enter your <strong>OpenRouter API Key</strong>. It's stored only in your browser (<code>localStorage</code>) and passed through to the backend on each request — it is never saved on our servers.",
    modalBodyFooter: "No API key? You can still click the popular picks above, or browse the pre-generated example gallery below.",
    modalClearLabel: "Clear Key",
    modalSaveLabel: "Save",
  },
};

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

function extractFirstCreatedSurfaceId(messages: A2uiMessage[]): string | null {
  for (const msg of messages) {
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        return surfaceId;
      }
    }
  }
  return null;
}

// Collects every surfaceId a set of messages ever creates, so a valid deep
// link (e.g. #/surface-module-1) can be told apart from a stale/missing hash.
function extractAllSurfaceIds(messages: A2uiMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const msg of messages) {
    if (msg && typeof msg === "object" && "createSurface" in msg) {
      const surfaceId = (msg as any).createSurface?.surfaceId;
      if (typeof surfaceId === "string") {
        ids.add(surfaceId);
      }
    }
  }
  return ids;
}

function readCurrentSurfaceHash(): string {
  return window.location.hash.startsWith("#/") ? window.location.hash.slice(2) : "";
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
  if (surface.name) return surface.name;
  
  if (surface.componentsMap && surface.componentsMap.size > 0) {
    const components = Array.from(surface.componentsMap.values()) as any[];
    
    // Look for first Text component with variant h1/h2
    const headingComp = components.find((c: any) => c.component === "Text" && (c.variant === "h1" || c.variant === "h2") && c.text);
    if (headingComp && headingComp.text) {
      return headingComp.text;
    }

    // Look for custom catalog components with title (ConceptCard, AnalogyCard, MentalModel, DetailedExplanation, etc.)
    const titleComp = components.find((c: any) => c.title && typeof c.title === "string");
    if (titleComp) {
      return titleComp.title;
    }
    
    // Look for any Text component
    const anyTextComp = components.find((c: any) => c.component === "Text" && c.text);
    if (anyTextComp && anyTextComp.text) {
      return anyTextComp.text;
    }
  }
  
  const rawId = (surface.id || "Page").toLowerCase();
  const lang = getLang();
  const fallbackLabels: Record<string, [string, string]> = {
    concept: ["💡 核心概念", "💡 Core Concept"],
    analogy: ["💡 直觉类比", "💡 Intuitive Analogy"],
    quiz: ["✍️ 自测练习", "✍️ Self Check"],
    outline: ["📚 课程大纲", "📚 Course Outline"],
    detail: ["📖 详细讲解", "📖 Deep Dive"],
    mental: ["🧠 心智模型", "🧠 Mental Model"],
  };
  const pickLabel = (key: string) => fallbackLabels[key][lang === "zh" ? 0 : 1];
  if (rawId.includes("main") || rawId.includes("concept")) return pickLabel("concept");
  if (rawId.includes("analogy")) return pickLabel("analogy");
  if (rawId.includes("quiz") || rawId.includes("test")) return pickLabel("quiz");
  if (rawId.includes("outline")) return pickLabel("outline");
  if (rawId.includes("detail") || rawId.includes("explain")) return pickLabel("detail");
  if (rawId.includes("mode") || rawId.includes("mental")) return pickLabel("mental");

  const cleanId = rawId
    .replace(/^site-/, "")
    .replace(/^surface-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return cleanId || (lang === "zh" ? "学习页面" : "Learning Page");
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

  // A2UI's own component ids aren't reflected as DOM attributes anywhere, so
  // components like LearningPath that want to scroll to "targetComponentId"
  // have nothing to query for. Stamp data-component-id after Lit's initial
  // render settles (macrotask, so it runs after Lit's microtask-based
  // update cycle) so those lookups can actually find their target.
  setTimeout(() => stampComponentIds(container), 0);
}

// Catalog components (ConceptCard, LearningPath, etc.) are Lit elements that
// render into their own shadow roots, and a2ui-surface itself is shadow-DOM
// too — so a plain container.querySelectorAll("*") never reaches most of the
// tree. Recurse into every node's shadowRoot as well.
function stampComponentIds(root: ParentNode): void {
  const nodes = root.querySelectorAll<HTMLElement>("*");
  nodes.forEach((node) => {
    const ctx = (node as any).context;
    const id = ctx?.componentModel?.id;
    if (typeof id === "string" && id && !node.hasAttribute("data-component-id")) {
      node.setAttribute("data-component-id", id);
    }
    const shadow = (node as any).shadowRoot as ShadowRoot | null | undefined;
    if (shadow) {
      stampComponentIds(shadow);
    }
  });
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

// /api/session/start returns "pending" immediately — the 3-step LLM pipeline
// (plan_curriculum -> build_site -> generate_a2ui_messages) keeps running
// server-side in a background thread, since it routinely takes well over
// Cloudflare's ~100s edge timeout for a single synchronous request/response.
// Poll /status until the backend flips it to "ready" (or "error").
async function pollSessionUntilReady(
  apiBaseUrl: string,
  headers: Record<string, string>,
  sessionId: string,
): Promise<A2uiMessage[]> {
  const POLL_INTERVAL_MS = 2500;
  const MAX_WAIT_MS = 15 * 60 * 1000;
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const res = await fetch(`${apiBaseUrl}/api/session/${sessionId}/status`, { headers });
    if (!res.ok) {
      throw new Error(`Session status check failed (${res.status})`);
    }
    const data = (await res.json()) as SessionStatusResponse;
    if (data.status === "ready") {
      return data.messages;
    }
    if (data.status === "error") {
      throw new Error(data.error || "Generation failed on the server.");
    }
  }
  throw new Error("Timed out waiting for generation to complete.");
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
  if (!sessionId) {
    throw new Error("Online session response format error.");
  }

  let initialMessages: A2uiMessage[];
  if (startData.status === "error") {
    throw new Error("Generation failed on the server.");
  } else if (startData.status === "ready" && Array.isArray(startData.messages) && startData.messages.length > 0) {
    initialMessages = startData.messages;
  } else {
    initialMessages = await pollSessionUntilReady(source.apiBaseUrl, buildHeaders(source.headers), sessionId);
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

  processor.processMessages(initialMessages);
  const startCreatedId = extractLastCreatedSurfaceId(initialMessages);
  if (startCreatedId) {
    window.location.hash = `#/${startCreatedId}`;
  }
  renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
  return true;
}

// Static offline previews have no backend to ask for new content, but a few
// components (SectionNavigator, KnowledgeTree) dispatch an action on every
// click regardless of mode. Without a handler those actions silently went
// nowhere — cards looked clickable but did nothing. This gives them a real,
// honest local behavior: SectionNavigator switches which card is highlighted
// as current; KnowledgeTree steps into a child using the data it already has
// (there's no deeper content to fetch in a static demo, so descending shows
// the tree's own "leaf node" empty state instead of pretending to load more).
function extractInitialComponentSnapshots(messages: unknown): Map<string, Record<string, unknown>> {
  const snapshot = new Map<string, Record<string, unknown>>();
  if (!Array.isArray(messages)) return snapshot;
  for (const msg of messages) {
    const update = (msg as any)?.updateComponents;
    if (!update || !Array.isArray(update.components)) continue;
    for (const comp of update.components) {
      if (comp && typeof comp.id === "string" && !snapshot.has(comp.id)) {
        snapshot.set(comp.id, comp);
      }
    }
  }
  return snapshot;
}

function applyStaticNavigation(
  processor: MessageProcessor<any>,
  container: HTMLElement,
  action: any,
  initialSnapshots: Map<string, Record<string, unknown>>,
): void {
  if (!action || typeof action.name !== "string") return;
  const surfaceId = action.surfaceId;
  const sourceComponentId = action.sourceComponentId;
  const ctx = action.context || {};
  if (!surfaceId || !sourceComponentId) return;

  if (action.name === "navigate_section" && typeof ctx.sectionId === "string") {
    // SectionNavigator treats a card as "active" if EITHER activeSectionId
    // matches OR the card's own status is "current" (source content usually
    // hardcodes one section as "current"). Updating activeSectionId alone
    // left the original card permanently highlighted too, so it looked like
    // clicks did nothing. Also flip each section's own status field.
    const current = (processor.model as any)?.getComponent?.(surfaceId, sourceComponentId);
    const currentProps: any = current?.props ?? initialSnapshots.get(sourceComponentId) ?? {};
    const sections: any[] = Array.isArray(currentProps.sections) ? currentProps.sections : [];
    const updatedSections = sections.map((sec) => {
      if (!sec || typeof sec !== "object") return sec;
      if (sec.id === ctx.sectionId) {
        return sec.status === "locked" ? sec : { ...sec, status: "current" };
      }
      return sec.status === "current" ? { ...sec, status: "available" } : sec;
    });

    processor.processMessages([
      {
        version: "v0.9",
        updateComponents: {
          surfaceId,
          components: [
            {
              id: sourceComponentId,
              component: "SectionNavigator",
              activeSectionId: ctx.sectionId,
              sections: updatedSections,
            },
          ],
        },
      },
    ]);
    renderSurfaces(container, processor);
    return;
  }

  if (action.name === "knowledge_tree_navigate" && typeof ctx.nodeId === "string") {
    const original = initialSnapshots.get(sourceComponentId);
    if (!original) return;

    const current = (processor.model as any)?.getComponent?.(surfaceId, sourceComponentId);
    const currentProps: any = current?.props ?? original;
    const children: any[] = Array.isArray(currentProps.childrenNodes) ? currentProps.childrenNodes : [];
    const target = children.find((c) => c && c.id === ctx.nodeId);

    if (ctx.nodeId === "root" || !target) {
      // Breadcrumb entries above the current level, or "root", aren't
      // reconstructible without the full tree — reset to the initial state.
      processor.processMessages([{ version: "v0.9", updateComponents: { surfaceId, components: [original] } }]);
      renderSurfaces(container, processor);
      return;
    }

    const prevCurrent: any = currentProps.currentNode;
    const prevPath: any[] = Array.isArray(currentProps.path) ? currentProps.path : [];
    processor.processMessages([
      {
        version: "v0.9",
        updateComponents: {
          surfaceId,
          components: [
            {
              id: sourceComponentId,
              component: "KnowledgeTree",
              path: prevCurrent ? [...prevPath, { id: prevCurrent.id, label: prevCurrent.label }] : prevPath,
              currentNode: {
                id: target.id,
                label: target.label,
                description: T[getLang()].staticTreeLeafNote,
              },
              childrenNodes: [],
            },
          ],
        },
      },
    ]);
    renderSurfaces(container, processor);
  }
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
  const initialSnapshots = extractInitialComponentSnapshots(messages);

  let processor: MessageProcessor<any>;
  processor = new MessageProcessor([a2learnCatalog], (action: any) =>
    applyStaticNavigation(processor, container, action, initialSnapshots),
  );
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

  const allSurfaceIds = extractAllSurfaceIds(messages);
  const currentHashId = readCurrentSurfaceHash();
  if (!currentHashId || !allSurfaceIds.has(currentHashId)) {
    // No hash yet (fresh load of "/") or an unrecognized hash: land on the
    // first surface in the file, not the last — the file is read top to
    // bottom as a lesson, so module 1 is the natural starting point.
    const firstCreatedId = extractFirstCreatedSurfaceId(messages);
    if (firstCreatedId) {
      window.location.hash = `#/${firstCreatedId}`;
    }
  }
  renderSurfaces(container, processor, "Offline mode: Previewing message file only, no interaction callbacks.");
}

// Static reference examples bundled at apps/viewer/public/examples/ — viewable
// offline with no API key, so they render even when no backend is deployed.
const EXAMPLE_META: Array<{ id: string; zh: { title: string; description: string }; en: { title: string; description: string } }> = [
  {
    id: "hash-table",
    zh: { title: "Hash Table 哈希表", description: "哈希冲突与开放寻址法" },
    en: { title: "Hash Table", description: "Hash collisions and open addressing" },
  },
  {
    id: "agent-react",
    zh: { title: "ReAct Agent 架构", description: "手写 ReAct 循环引擎" },
    en: { title: "ReAct Agent Architecture", description: "Hand-building a ReAct loop engine" },
  },
  {
    id: "js-async",
    zh: { title: "JS 异步与事件循环", description: "手写 Promise.all 实现" },
    en: { title: "JS Async & the Event Loop", description: "Implementing Promise.all from scratch" },
  },
  {
    id: "conversational",
    zh: { title: "JS 闭包与作用域", description: "闭包模块模式与私有变量" },
    en: { title: "JS Closures & Scope", description: "The module pattern and private variables via closures" },
  },
  {
    id: "non-linear",
    zh: { title: "CSS Grid 二维布局", description: "零媒体查询的响应式网格" },
    en: { title: "CSS Grid 2D Layout", description: "Responsive grids with zero media queries" },
  },
  {
    id: "paper-attention",
    zh: { title: "Transformer 注意力机制", description: "缩放点积注意力四步推导" },
    en: { title: "Transformer Attention", description: "Deriving scaled dot-product attention in four steps" },
  },
  {
    id: "biophysics-ai",
    zh: { title: "AI 驱动生物物理 (AlphaFold)", description: "AlphaFold3 扩散模块解析" },
    en: { title: "AI-Driven Biophysics (AlphaFold)", description: "Breaking down AlphaFold3's diffusion module" },
  },
];

function getExampleItems(lang: Lang): ExampleCardItem[] {
  return EXAMPLE_META.map((m) => ({
    id: m.id,
    title: m[lang].title,
    description: m[lang].description,
    messagesUrl: lang === "en" ? `/examples/en/${m.id}.json` : `/examples/${m.id}.json`,
  }));
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
  const lang = getLang();
  if (key) {
    pill.className = "app-key-pill active";
    pill.textContent = lang === "zh" ? "🔑 API Key 已配置" : "🔑 API Key configured";
  } else {
    pill.className = "app-key-pill missing";
    pill.textContent = CHROME_STRINGS[lang].keyPillMissingLabel;
  }
}

// The settings modal is torn down and rebuilt every time the shell re-renders
// (language switch), so these always re-query the live DOM rather than
// closing over elements that may already be detached.
function openSettingsModal(): void {
  const modal = document.getElementById("app-settings-modal");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  if (keyInput) keyInput.value = getStoredApiKey();
  modal?.classList.remove("hidden");
}

function closeSettingsModal(): void {
  document.getElementById("app-settings-modal")?.classList.add("hidden");
}

// Rebindable per-render controls: the settings modal, prompt form, preset
// chips, language buttons, and example gallery. All of these live inside the
// markup renderAppFrame() regenerates on every language switch, so this must
// be called again after every re-render (the previous DOM nodes — and their
// listeners — are discarded together, so this never double-binds).
function bindShellControls(
  onGenerate: (promptText: string) => void,
  onSwitchLang: (lang: Lang) => void,
  onSelectExample: (id: string) => void,
): void {
  updateKeyPillStatus();

  const settingsBtn = document.getElementById("app-settings-btn");
  const modal = document.getElementById("app-settings-modal");
  const closeBtn = document.getElementById("app-modal-close");
  const saveBtn = document.getElementById("app-modal-save");
  const clearBtn = document.getElementById("app-modal-clear");
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  const form = document.getElementById("app-prompt-form") as HTMLFormElement | null;
  const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;

  settingsBtn?.addEventListener("click", openSettingsModal);
  closeBtn?.addEventListener("click", closeSettingsModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeSettingsModal();
  });

  saveBtn?.addEventListener("click", () => {
    if (keyInput) {
      setStoredApiKey(keyInput.value);
      updateKeyPillStatus();
    }
    closeSettingsModal();
  });

  clearBtn?.addEventListener("click", () => {
    setStoredApiKey("");
    if (keyInput) keyInput.value = "";
    updateKeyPillStatus();
    closeSettingsModal();
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const promptText = (promptInput?.value || "").trim();
    if (!promptText) return;

    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[getLang()].needApiKeyExplore);
      return;
    }
    onGenerate(promptText);
  });

  document.querySelectorAll(".app-preset-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const preset = chip.getAttribute("data-preset");
      if (preset) {
        if (promptInput) promptInput.value = preset;
        if (!getStoredApiKey()) {
          openSettingsModal();
          alert(T[getLang()].needApiKeyPreset);
          return;
        }
        onGenerate(preset);
      }
    });
  });

  const zhBtn = document.getElementById("lang-zh-btn");
  const enBtn = document.getElementById("lang-en-btn");
  zhBtn?.addEventListener("click", () => onSwitchLang("zh"));
  enBtn?.addEventListener("click", () => onSwitchLang("en"));

  document.getElementById("examples-grid")?.addEventListener("click", (e: MouseEvent) => {
    const card = (e.target as HTMLElement)?.closest<HTMLElement>(".example-card");
    const id = card?.dataset.exampleId;
    if (!id) return;
    onSelectExample(id);
  });
}

// True global listeners: unlike bindShellControls(), these don't touch any
// DOM that gets torn down on a language switch (composedPath delegation, or
// re-querying #app-prompt-input fresh each time it fires) — so they're bound
// exactly once for the page's lifetime instead of once per render.
let globalListenersBound = false;
function bindGlobalListenersOnce(onGenerate: (promptText: string) => void): void {
  if (globalListenersBound) return;
  globalListenersBound = true;

  window.addEventListener("a2learn-explore-concept", (e: Event) => {
    const concept = (e as CustomEvent).detail?.concept;
    if (!concept) return;
    const lang = getLang();
    const promptText = lang === "zh" ? `详细解释 ${concept}` : `Explain ${concept} in detail`;
    const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;
    if (promptInput) promptInput.value = promptText;

    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[lang].needApiKeyExplore);
      return;
    }
    onGenerate(promptText);
  });

  document.addEventListener("click", (e: MouseEvent) => {
    const path = e.composedPath();
    const btn = path.find(
      (el) =>
        el instanceof HTMLElement &&
        el.classList.contains("tooltip-explore-btn")
    ) as HTMLElement | undefined;

    if (btn) {
      const term = btn.getAttribute("data-term");
      if (term) {
        window.dispatchEvent(
          new CustomEvent("a2learn-explore-concept", {
            detail: { concept: term },
          })
        );
      }
    }
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

  // Whether the caller explicitly asked for a particular source (query
  // params / env vars). If not, the "default" offline config is just a
  // placeholder that never resolves to a real file in a static deployment —
  // show a friendly localized picker prompt instead of a scary fetch error.
  const hasExplicitSource =
    initialConfig.source.mode === "online" ||
    (initialConfig.source.mode === "offline" && initialConfig.source.messagesUrl !== "/generated/site_messages.json");

  type ContentState = { kind: "example"; id: string } | { kind: "other" };
  let currentContent: ContentState = { kind: "other" };

  let container: HTMLElement | null = null;
  let parentOrigin = "*";
  let stopResize: () => void = () => {};

  const renderShell = (lang: Lang) => {
    const title = initialConfig.embed ? "" : "A2Learn Showcase Generator";
    const subtitle = initialConfig.embed ? "" : T[lang].subtitle;

    const examplesHtml = initialConfig.embed
      ? ""
      : renderExamplesStrip(T[lang].examplesStripTitle, getExampleItems(lang));

    renderAppFrame(
      root,
      title,
      subtitle,
      `${examplesHtml}<section id="surface-container" aria-live="polite">
        <p class="viewer-state loading">${T[lang].loadingShowcase}</p>
      </section>`,
      initialConfig.embed ? undefined : { lang, chrome: CHROME_STRINGS[lang] },
    );
    container = document.getElementById("surface-container");
  };

  renderShell(getLang());
  if (!container) {
    return;
  }

  stopResize = setupAutoResize(container, () => parentOrigin);
  if (initialConfig.embed) {
    postToParent({ type: "a2learn:ready" }, parentOrigin);
  }

  // `fallbackToOffline` controls what happens when an online request throws:
  // true silently swaps in the static demo (site_messages.json) after showing
  // the error for a frame — appropriate for a config-driven initial load,
  // where "something" beats a dead page. But reusing that same fallback for a
  // user-triggered onGenerate() call was actively misleading: the visitor's
  // real prompt failed (bad key, CORS, backend down/timed out), yet the error
  // was immediately overwritten by the offline demo's first surface
  // ("surface-module-1"), so failures looked like the app silently
  // redirecting to unrelated content instead of surfacing what went wrong.
  const startWithConfig = async (cfg: ViewerRuntimeConfig, fallbackToOffline: boolean = true) => {
    // Snapshot container for the duration of this call: it's a `let` that
    // renderShell() can reassign (on a language switch), and it shouldn't
    // move out from under an in-flight load.
    const target = container;
    if (!target) return;
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
        showState(target, T[getLang()].agentPlanning, "loading");
        await bootstrapOnline(target, cfg.source);
        stopResize();
        stopResize = setupAutoResize(target, () => parentOrigin);
        return;
      }
    } catch (err) {
      const tr = T[getLang()];
      const errorLine = getLang() === "zh" ? `错误信息: ${String(err)}` : `Error: ${String(err)}`;
      const fallbackNote = fallbackToOffline ? `\n${tr.onlineFailedFallback}` : "";
      showState(target, `${tr.onlineFailedPrefix}\n${errorLine}${fallbackNote}`, "error");
      if (!fallbackToOffline) {
        return;
      }
    }
    await bootstrapOffline(
      target,
      cfg.source.mode === "offline"
        ? cfg.source
        : { mode: "offline", messagesUrl: "/generated/site_messages.json" },
    );
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
  };

  const selectExample = async (id: string) => {
    const item = getExampleItems(getLang()).find((i) => i.id === id);
    if (!item) return;
    currentContent = { kind: "example", id };
    await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } });
  };

  const onGenerate = (promptText: string) => {
    const target = container;
    if (!target) return;
    currentContent = { kind: "other" };
    const currentApiUrl =
      initialConfig.source.mode === "online"
        ? initialConfig.source.apiBaseUrl
        : (import.meta.env.VITE_A2LEARN_API_URL || "").trim();

    if (!currentApiUrl) {
      showState(target, T[getLang()].noBackendConfigured, "error");
      return;
    }

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
    // User explicitly asked to generate from their own prompt — on failure,
    // leave the error on screen instead of silently swapping in the static
    // demo gallery content (see startWithConfig's fallbackToOffline comment).
    void startWithConfig(onlineConfig, false);
  };

  const switchLanguage = async (newLang: Lang) => {
    if (newLang === getLang()) return;
    setLang(newLang);
    renderShell(newLang);
    const target = container;
    if (!target) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
    bindShellControls(onGenerate, switchLanguage, selectExample);

    if (currentContent.kind === "example") {
      const item = getExampleItems(newLang).find((i) => i.id === currentContent.id);
      if (item) {
        await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } });
        return;
      }
    }
    showState(target, T[newLang].pickExamplePrompt, "empty");
  };

  if (!initialConfig.embed) {
    bindShellControls(onGenerate, switchLanguage, selectExample);
    bindGlobalListenersOnce(onGenerate);
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

  if (hasExplicitSource || initialConfig.embed) {
    await startWithConfig(initialConfig);
  } else if (container) {
    // Nothing explicit was requested (typical first visit to the static
    // deployment) — the placeholder "/generated/site_messages.json" would
    // just 404. Show a friendly, localized nudge toward the example gallery
    // instead of a fetch-failure error.
    showState(container, T[getLang()].pickExamplePrompt, "empty");
  }
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
