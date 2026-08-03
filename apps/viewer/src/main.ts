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
import { pickRenderedComponent } from "./component-picker";
import { mountFloatingAgent } from "./floating-agent";
import { mountInlineComponentEditor } from "./inline-component-editor";
import { mountSourceLibrary } from "./source-library";
import {
  createPresentationSurface,
  findPresentationPageIndex,
  paginateSurface,
  type PresentationPage,
  type PresentationSurface,
} from "./presentation-paginator";
import { recentProjects, rememberProject, type RecentProject } from "./recent-projects";
import {
  GENERATION_COMPONENTS,
  LOCAL_EXAMPLES,
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  RENDER_THEMES,
  getRenderTheme,
  getStoredGenerationProfile,
  normalizeGenerationProfile,
  setStoredGenerationProfile,
  type GenerationProfile,
  type Lang,
} from "./generation-profile";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;

let presentationRenderVersion = 0;
let activePresentationPage: PresentationSurface | null = null;

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
  sourceIds?: string[];
  resourceQuery?: string;
  language?: Lang;
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
        language?: Lang;
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

// Themes are deliberately a controlled set of CSS variables, rather than a
// free-form CSS editor. This keeps a saved profile portable and avoids making
// an untrusted configuration capable of changing the host page's layout.
const GENERATION_THEME_VAR_NAMES = Array.from(
  new Set(RENDER_THEMES.flatMap((theme) => Object.keys(theme.vars))),
);

function applyGenerationTheme(themeId: string, displayMode: GenerationProfile["displayMode"] = "standard"): void {
  for (const variable of GENERATION_THEME_VAR_NAMES) {
    document.documentElement.style.removeProperty(variable);
  }
  const theme = getRenderTheme(themeId);
  document.documentElement.dataset.a2learnTheme = theme.id;
  document.documentElement.dataset.a2learnDisplayMode = displayMode;
  applyThemeVars(theme.vars);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generationSettingsHtml(lang: Lang, profile: GenerationProfile): string {
  const copy = lang === "zh"
    ? {
        heading: "生成配置",
        note: "这些偏好会保存在当前浏览器，并用于定制下一次生成。",
        components: "本次可生成的组件",
        componentsCopy: "选择本次页面可使用的组件；全部关闭时只会保留基础文字与布局。",
        examples: "参考案例",
        examplesCopy: "选择可供生成时参考的本地案例（如 Hash Table）；选中案例会同时启用它使用的组件。",
        exampleUses: "使用组件：",
        theme: "页面风格",
        themeCopy: "影响页面的颜色、字体、留白和卡片质感。",
        displayMode: "展示模式",
        displayModeCopy: "标准模式保留完整页面；演示模式会按内容自动分页，并支持全屏与右键翻页。",
        standardMode: "标准页面",
        standardModeCopy: "页面连续阅读，使用原有页签切换。",
        presentationMode: "自动分页演示",
        presentationModeCopy: "将当前内容排入 16:9 页面，可全屏展示。",
        intent: "视觉与内容意图（可选）",
        intentPlaceholder: "例如：古典诗词赏析，突出原文、逐句注释与留白，避免科技感卡片堆叠。",
        explain: "讲解",
        practice: "练习",
        explore: "探索",
      }
    : {
        heading: "Generation settings",
        note: "These preferences are saved in this browser and customize your next generation.",
        components: "Components available for this run",
        componentsCopy: "Choose the components available for this page. With none selected, only basic text and layout remain.",
        examples: "Reference examples",
        examplesCopy: "Choose local examples (such as Hash Table). Selecting one also enables the components it uses.",
        exampleUses: "Uses: ",
        theme: "Page style",
        themeCopy: "Changes the page color, typography, spacing, and card feel.",
        displayMode: "Display mode",
        displayModeCopy: "Standard keeps the full page; presentation paginates content and supports fullscreen and right-click navigation.",
        standardMode: "Standard page",
        standardModeCopy: "Continuous reading with the existing page tabs.",
        presentationMode: "Auto-paginated presentation",
        presentationModeCopy: "Fits the current content into 16:9 pages for presenting.",
        intent: "Visual and content intent (optional)",
        intentPlaceholder: "For example: classical poetry analysis with prominent verses, line-by-line annotations, and generous whitespace.",
        explain: "Explain",
        practice: "Practice",
        explore: "Explore",
      };

  const groupLabels: Record<string, string> = {
    explain: copy.explain,
    practice: copy.practice,
    explore: copy.explore,
  };
  const groups = ["explain", "practice", "explore"] as const;
  const componentGroups = groups.map((group) => {
    const options = GENERATION_COMPONENTS.filter((component) => component.group === group)
      .map((component) => {
        const enabled = profile.enabledComponents.includes(component.id);
        return `
          <div class="generation-component-option">
            <label class="generation-component-copy">
              <input class="generation-component-input" type="checkbox" data-component-id="${component.id}" ${enabled ? "checked" : ""} />
              <span class="generation-component-label">${escapeHtml(component.label[lang])}</span>
              <span class="generation-component-description">${escapeHtml(component.description[lang])}</span>
            </label>
          </div>`;
      })
      .join("");
    return `<section class="generation-component-group"><p class="generation-component-group-title">${groupLabels[group]}</p>${options}</section>`;
  }).join("");

  const themeOptions = RENDER_THEMES.map((theme) => `
    <label class="generation-theme-option">
      <input type="radio" name="generation-theme" value="${theme.id}" ${profile.themeId === theme.id ? "checked" : ""} />
      <span class="generation-theme-copy">
        <span class="generation-theme-label">${escapeHtml(theme.label[lang])}</span>
        <span class="generation-theme-description">${escapeHtml(theme.description[lang])}</span>
      </span>
    </label>`).join("");

  const displayModeOptions = `
    <label class="generation-theme-option">
      <input type="radio" name="generation-display-mode" value="standard" ${profile.displayMode === "standard" ? "checked" : ""} />
      <span class="generation-theme-copy">
        <span class="generation-theme-label">${copy.standardMode}</span>
        <span class="generation-theme-description">${copy.standardModeCopy}</span>
      </span>
    </label>
    <label class="generation-theme-option">
      <input type="radio" name="generation-display-mode" value="presentation" ${profile.displayMode === "presentation" ? "checked" : ""} />
      <span class="generation-theme-copy">
        <span class="generation-theme-label">${copy.presentationMode}</span>
        <span class="generation-theme-description">${copy.presentationModeCopy}</span>
      </span>
    </label>`;

  const exampleOptions = LOCAL_EXAMPLES.map((example) => {
    const selected = profile.exampleIds.includes(example.id);
    const componentLabels = example.componentIds
      .map((id) => GENERATION_COMPONENTS.find((component) => component.id === id)?.label[lang] || id)
      .join(" · ");
    return `
      <label class="generation-example-option">
        <input class="generation-example-input" type="checkbox" data-example-id="${example.id}" ${selected ? "checked" : ""} />
        <span class="generation-component-copy">
          <span class="generation-component-label">${escapeHtml(example.label[lang])}</span>
          <span class="generation-component-description">${escapeHtml(example.description[lang])}</span>
          <span class="generation-example-components">${copy.exampleUses}${escapeHtml(componentLabels)}</span>
        </span>
      </label>`;
  }).join("");

  return `
    <section class="generation-settings" aria-label="${copy.heading}">
      <div>
        <p class="generation-settings-heading">${copy.heading}</p>
        <p class="generation-settings-note">${copy.note}</p>
      </div>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.components} <span id="generation-enabled-count" class="generation-counter">${profile.enabledComponents.length}/${MAX_ENABLED_COMPONENTS}</span></p>
        <p class="generation-settings-section-copy">${copy.componentsCopy}</p>
        <div class="generation-component-groups">${componentGroups}</div>
      </section>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.examples} <span id="generation-example-count" class="generation-counter">${profile.exampleIds.length}/${MAX_EXAMPLE_CASES}</span></p>
        <p class="generation-settings-section-copy">${copy.examplesCopy}</p>
        <div class="generation-example-grid">${exampleOptions}</div>
      </section>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.theme}</p>
        <p class="generation-settings-section-copy">${copy.themeCopy}</p>
        <div class="generation-theme-grid">${themeOptions}</div>
      </section>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.displayMode}</p>
        <p class="generation-settings-section-copy">${copy.displayModeCopy}</p>
        <div class="generation-theme-grid">${displayModeOptions}</div>
      </section>
      <section class="generation-settings-section">
        <label class="generation-settings-section-title" for="generation-visual-intent">${copy.intent}</label>
        <textarea id="generation-visual-intent" class="app-modal-input generation-intent-input" maxlength="500" placeholder="${escapeHtml(copy.intentPlaceholder)}">${escapeHtml(profile.visualIntent)}</textarea>
      </section>
    </section>`;
}

function profileFromSettingsInputs(): GenerationProfile {
  const enabledComponents = Array.from(document.querySelectorAll<HTMLInputElement>(".generation-component-input:checked"))
    .map((input) => input.dataset.componentId || "");
  const exampleIds = Array.from(document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked"))
    .map((input) => input.dataset.exampleId || "");
  const themeId = document.querySelector<HTMLInputElement>("input[name='generation-theme']:checked")?.value;
  const displayMode = document.querySelector<HTMLInputElement>("input[name='generation-display-mode']:checked")?.value;
  const visualIntent = (document.getElementById("generation-visual-intent") as HTMLTextAreaElement | null)?.value || "";
  return normalizeGenerationProfile({ version: 1, enabledComponents, exampleIds, themeId, displayMode, visualIntent });
}

function syncGenerationSettingsInputs(profile: GenerationProfile): void {
  document.querySelectorAll<HTMLInputElement>(".generation-component-input").forEach((input) => {
    input.checked = profile.enabledComponents.includes(input.dataset.componentId || "");
  });
  document.querySelectorAll<HTMLInputElement>(".generation-example-input").forEach((input) => {
    input.checked = profile.exampleIds.includes(input.dataset.exampleId || "");
  });
  const enabledCount = document.getElementById("generation-enabled-count");
  const exampleCount = document.getElementById("generation-example-count");
  if (enabledCount) enabledCount.textContent = `${profile.enabledComponents.length}/${MAX_ENABLED_COMPONENTS}`;
  if (exampleCount) exampleCount.textContent = `${profile.exampleIds.length}/${MAX_EXAMPLE_CASES}`;
  const intent = document.getElementById("generation-visual-intent") as HTMLTextAreaElement | null;
  if (intent) intent.value = profile.visualIntent;
  const selectedTheme = document.querySelector<HTMLInputElement>(`input[name='generation-theme'][value='${profile.themeId}']`);
  if (selectedTheme) selectedTheme.checked = true;
  const selectedDisplayMode = document.querySelector<HTMLInputElement>(`input[name='generation-display-mode'][value='${profile.displayMode}']`);
  if (selectedDisplayMode) selectedDisplayMode.checked = true;
}

function getLocalExampleComponents(exampleId: string): string[] {
  return LOCAL_EXAMPLES.find((example) => example.id === exampleId)?.componentIds || [];
}

function setExampleComponentInputs(componentIds: string[], checked: boolean): void {
  const ids = new Set(componentIds);
  document.querySelectorAll<HTMLInputElement>(".generation-component-input").forEach((input) => {
    if (ids.has(input.dataset.componentId || "")) {
      input.checked = checked;
    }
  });
}

function clearExamplesUsingComponent(componentId: string): void {
  document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked").forEach((input) => {
    if (getLocalExampleComponents(input.dataset.exampleId || "").includes(componentId)) {
      input.checked = false;
    }
  });
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
  const editorMode = modeRaw === "editor" || import.meta.env.MODE === "editor";
  const editorExample = params.get("example") || "hash-table";
  const editorMessagesUrl = editorMode
    ? (getLang() === "en" ? `/examples/en/${editorExample}.json` : `/examples/${editorExample}.json`)
    : "/generated/site_messages.json";
  const messagesUrl = (messagesUrlParam || envMessagesUrl || editorMessagesUrl).trim();
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
        language: getLang(),
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
    sourceLibraryLabel: "📚 上传资料",
    sourceLibraryTitle: "上传并选择资料",
    submitLabel: "⚡ 实时生成 Showcase",
    presetsLabel: "热门推荐：",
    presets: [
      { label: "Hash Map 原理", prompt: "Explain how a Hash Map works step by step in detail with visual mental model and code example" },
      { label: "Transformer 架构", prompt: "Explain the Transformer architecture and attention mechanism in deep learning" },
      { label: "HTTP/3 协议", prompt: "Explain HTTP/3 protocol QUIC features and advantages over HTTP/2" },
      { label: "三体星系天体物理", prompt: "Explain the Three Body Problem orbital dynamics in astrophysics" },
    ],
    settingsBtnLabel: "⚙️ 设置",
    settingsBtnTitle: "配置 API Key、生成组件与页面主题",
    keyPillMissingLabel: "🔑 API Key 待配置",
    modalTitle: "⚙️ 生成设置",
    modalBodyIntroHtml:
      "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将仅保存在浏览器本地（<code>localStorage</code>），每次交互时透传给后端，绝不上交服务器保存。",
    modalBodyFooter: "无 API Key？你也可以直接点击主页顶部的热门推荐，预览预置的精美 Showcase。",
    modalClearLabel: "清空 Key",
    modalSaveLabel: "保存配置",
  },
  en: {
    promptPlaceholder: "Enter a topic you want to learn (e.g., Explain how Hash Maps work...)",
    sourceLibraryLabel: "📚 Upload sources",
    sourceLibraryTitle: "Upload and select sources",
    submitLabel: "⚡ Generate Showcase Live",
    presetsLabel: "Popular picks:",
    presets: [
      { label: "Hash Map Internals", prompt: "Explain how a Hash Map works step by step in detail with visual mental model and code example" },
      { label: "Transformer Architecture", prompt: "Explain the Transformer architecture and attention mechanism in deep learning" },
      { label: "HTTP/3 Protocol", prompt: "Explain HTTP/3 protocol QUIC features and advantages over HTTP/2" },
      { label: "Three-Body Problem Physics", prompt: "Explain the Three Body Problem orbital dynamics in astrophysics" },
    ],
    settingsBtnLabel: "⚙️ Settings",
    settingsBtnTitle: "Configure API key, generation components, and page theme",
    keyPillMissingLabel: "🔑 API Key not set",
    modalTitle: "⚙️ Generation Settings",
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

function injectPresentationContentTheme(): void {
  if (document.getElementById("a2learn-presentation-content-theme")) return;
  const style = document.createElement("style");
  style.id = "a2learn-presentation-content-theme";
  style.textContent = `
    html[data-a2learn-display-mode="presentation"] #surface-container {
      width: min(100%, 1280px);
      margin-inline: auto;
    }
    html[data-a2learn-display-mode="presentation"] .surface-tabs-container {
      padding: 0 0 18px;
    }
    html[data-a2learn-display-mode="presentation"] .surface-tabs {
      justify-content: center;
    }
    html[data-a2learn-display-mode="presentation"] .surface-tab {
      min-height: 38px;
      border-radius: 2px;
      font-family: var(--a2ui-font-family-title);
      letter-spacing: .02em;
    }
    .presentation-measure-stage {
      position: fixed;
      top: 0;
      left: -10000px;
      width: 1280px;
      visibility: hidden;
      pointer-events: none;
      contain: layout style;
    }
    .presentation-measure-canvas,
    .presentation-page-canvas {
      --presentation-canvas-padding: 68px;
      box-sizing: border-box;
      width: 100%;
      padding: var(--presentation-canvas-padding);
      border: 1px solid var(--a2ui-color-border);
      background: color-mix(in oklab, var(--a2ui-color-surface) 92%, transparent);
      box-shadow: var(--a2learn-panel-shadow);
    }
    .presentation-measure-canvas {
      width: 1280px;
      height: 720px;
      overflow: hidden;
    }
    .presentation-measure-canvas > a2learn-markdown-surface {
      display: block;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-deck {
      display: grid;
      gap: 14px;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-deck-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 2px 0;
      color: var(--app-muted);
      font: 600 14px/1.25 var(--a2ui-font-family-title);
      letter-spacing: .03em;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-deck-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-deck-controls {
      display: flex;
      flex: none;
      align-items: center;
      gap: 8px;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-count {
      min-width: 48px;
      text-align: center;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-button {
      min-height: 34px;
      padding: 6px 10px;
      border: 1px solid var(--a2ui-color-border);
      border-radius: 2px;
      color: var(--a2ui-color-on-surface);
      background: var(--a2ui-color-surface-subtle);
      cursor: pointer;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-button:disabled {
      cursor: not-allowed;
      opacity: .42;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-canvas {
      position: relative;
      aspect-ratio: 16 / 9;
      min-height: 0;
      overflow: auto;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-content {
      width: calc(100% / var(--presentation-page-scale, 1));
      transform: scale(var(--presentation-page-scale, 1));
      transform-origin: top left;
    }
    html[data-a2learn-display-mode="presentation"] .presentation-page-content > a2learn-markdown-surface {
      display: block;
    }
    html[data-a2learn-display-mode="presentation"] #surface-container:fullscreen {
      box-sizing: border-box;
      width: 100vw;
      height: 100vh;
      padding: 24px;
      overflow: auto;
      background: var(--a2learn-page-background);
    }
    html[data-a2learn-display-mode="presentation"] #surface-container:fullscreen .presentation-deck {
      display: grid;
      min-height: calc(100vh - 96px);
      grid-template-rows: auto minmax(0, 1fr);
    }
    html[data-a2learn-display-mode="presentation"] #surface-container:fullscreen .presentation-page-canvas {
      width: min(100%, calc((100vh - 100px) * 16 / 9));
      max-height: calc(100vh - 100px);
      margin: auto;
    }
    @media (max-width: 768px) {
      html[data-a2learn-display-mode="presentation"] .presentation-measure-canvas,
      html[data-a2learn-display-mode="presentation"] .presentation-page-canvas {
        --presentation-canvas-padding: 22px;
      }
      .presentation-measure-canvas { --presentation-canvas-padding: 68px; }
      html[data-a2learn-display-mode="presentation"] .presentation-page-canvas {
        min-height: auto;
        aspect-ratio: auto;
        overflow: visible;
      }
      html[data-a2learn-display-mode="presentation"] .presentation-page-content {
        width: 100%;
        transform: none;
      }
      html[data-a2learn-display-mode="presentation"] .presentation-deck-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }
      html[data-a2learn-display-mode="presentation"] .presentation-deck-controls {
        align-self: flex-end;
      }
    }
  `;
  document.head.appendChild(style);
}

function disposePresentationPage(): void {
  activePresentationPage?.dispose();
  activePresentationPage = null;
}

function renderPresentationDeck(
  container: HTMLElement,
  source: any,
  title: string,
  modeHint?: string,
): void {
  const renderVersion = presentationRenderVersion;
  const deck = document.createElement("section");
  deck.className = "presentation-deck";
  deck.setAttribute("aria-label", modeHint || "Presentation content");

  const toolbar = document.createElement("div");
  toolbar.className = "presentation-deck-toolbar";
  const deckTitle = document.createElement("span");
  deckTitle.className = "presentation-deck-title";
  deckTitle.textContent = title;
  const controls = document.createElement("div");
  controls.className = "presentation-deck-controls";
  const previous = document.createElement("button");
  previous.className = "presentation-page-button";
  previous.type = "button";
  previous.textContent = getLang() === "zh" ? "上一页" : "Previous";
  const pageCount = document.createElement("span");
  pageCount.className = "presentation-page-count";
  const next = document.createElement("button");
  next.className = "presentation-page-button";
  next.type = "button";
  next.textContent = getLang() === "zh" ? "下一页" : "Next";
  const fullscreen = document.createElement("button");
  fullscreen.className = "presentation-page-button";
  fullscreen.type = "button";
  fullscreen.textContent = getLang() === "zh" ? "全屏" : "Full screen";
  fullscreen.addEventListener("click", () => {
    if (document.fullscreenElement === container) {
      void document.exitFullscreen();
      return;
    }
    void container.requestFullscreen().catch(() => {
      // Fullscreen can be disallowed by an embedding host; normal viewing remains available.
    });
  });
  controls.append(previous, pageCount, next, fullscreen);
  toolbar.append(deckTitle, controls);

  const canvas = document.createElement("div");
  canvas.className = "presentation-page-canvas";
  deck.append(toolbar, canvas);
  container.appendChild(deck);

  const loading = document.createElement("span");
  loading.className = "presentation-page-count";
  loading.textContent = getLang() === "zh" ? "正在分页…" : "Paginating…";
  pageCount.replaceWith(loading);
  previous.disabled = true;
  next.disabled = true;

  void paginateSurface(source).then((pages) => {
    if (renderVersion !== presentationRenderVersion || !deck.isConnected) return;
    if (!pages?.length) {
      deck.remove();
      const fallback = document.createElement("a2learn-markdown-surface") as any;
      fallback.surface = source;
      fallback.setAttribute("data-surface-id", source.id ?? "");
      container.appendChild(fallback);
      setTimeout(() => stampComponentIds(container), 0);
      return;
    }

    let activeIndex = 0;
    const renderedCount = document.createElement("span");
    renderedCount.className = "presentation-page-count";
    loading.replaceWith(renderedCount);

    const renderPage = (index: number) => {
      if (renderVersion !== presentationRenderVersion) return;
      activeIndex = index;
      disposePresentationPage();
      canvas.innerHTML = "";
      const page: PresentationPage = pages[activeIndex];
      canvas.style.setProperty("--presentation-page-scale", String(page.scale));
      const content = document.createElement("div");
      content.className = "presentation-page-content";
      const rendered = document.createElement("a2learn-markdown-surface") as any;
      activePresentationPage = createPresentationSurface(source, page.items, activeIndex);
      rendered.surface = activePresentationPage.surface;
      rendered.setAttribute("data-surface-id", source.id ?? "");
      content.appendChild(rendered);
      canvas.appendChild(content);
      renderedCount.textContent = `${activeIndex + 1} / ${pages.length}`;
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === pages.length - 1;
      setTimeout(() => stampComponentIds(canvas), 0);
    };

    previous.addEventListener("click", () => renderPage(Math.max(0, activeIndex - 1)));
    next.addEventListener("click", () => renderPage(Math.min(pages.length - 1, activeIndex + 1)));
    // A right-click on the visible “Next” control is intentionally equivalent
    // to its normal click, so macOS secondary clicks do not merely focus it.
    next.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (!next.disabled) next.click();
    });
    next.addEventListener("mousedown", (event) => {
      // macOS can expose a secondary click as button 2 (mouse/two-finger) or
      // Control+primary click. Handle it at the control itself, before the
      // browser turns it into a focused context-menu target.
      if (event.button !== 2 && !(event.button === 0 && event.ctrlKey)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!next.disabled) next.click();
    });
    deck.addEventListener("a2learn:navigate-component", (event) => {
      const targetComponentId = (event as CustomEvent<{ targetComponentId?: unknown }>).detail?.targetComponentId;
      if (typeof targetComponentId !== "string") return;
      const targetPage = findPresentationPageIndex(source, pages, targetComponentId);
      if (targetPage >= 0 && targetPage !== activeIndex) renderPage(targetPage);
    });

    // LearningPath normally performs its own hash/DOM navigation. In a paged
    // presentation, its destination can be on a different generated page, so
    // resolve the clicked step at the viewer level as well.
    deck.addEventListener("click", (event) => {
      const path = event.composedPath();
      const stepElement = path.find((node) => node instanceof HTMLElement && node.classList.contains("step")) as HTMLElement | undefined;
      const learningPath = path.find((node) => node instanceof HTMLElement && node.localName === "a2learn-learning-path") as HTMLElement | undefined;
      if (!stepElement || !learningPath) return;
      const steps = (learningPath as any).controller?.props?.steps;
      const siblingSteps = Array.from(stepElement.parentElement?.children || []).filter((node) => node instanceof HTMLElement && node.classList.contains("step"));
      const stepIndex = siblingSteps.indexOf(stepElement);
      const step = Array.isArray(steps) && stepIndex >= 0 ? steps[stepIndex] : null;
      if (!step || typeof step !== "object") return;
      if (typeof step.targetSurfaceId === "string" && step.targetSurfaceId) {
        window.location.hash = `#/${step.targetSurfaceId}`;
      }
      const targetComponentId = typeof step.targetSectionId === "string"
        ? step.targetSectionId
        : typeof step.targetComponentId === "string"
          ? step.targetComponentId
          : "";
      if (targetComponentId) {
        const targetPage = findPresentationPageIndex(source, pages, targetComponentId);
        if (targetPage >= 0 && targetPage !== activeIndex) renderPage(targetPage);
      }
    }, true);

    const isInteractiveTarget = (event: MouseEvent | PointerEvent): boolean => {
      const selector = "a, button, input, select, textarea, summary, [contenteditable='true'], [data-presentation-preserve-contextmenu]";
      return event.composedPath().some((node) => node instanceof Element && !!node.closest(selector));
    };
    const advanceWithRightClick = (event: MouseEvent | PointerEvent): boolean => {
      if (isInteractiveTarget(event) || activeIndex >= pages.length - 1) return false;
      event.preventDefault();
      renderPage(activeIndex + 1);
      return true;
    };
    let latestRightPointerAt = 0;
    const handleRightPointer = (event: PointerEvent | MouseEvent) => {
      if (event.button !== 2) return;
      if (advanceWithRightClick(event)) latestRightPointerAt = Date.now();
    };
    canvas.addEventListener("pointerdown", handleRightPointer, true);
    canvas.addEventListener("mousedown", handleRightPointer, true);
    canvas.addEventListener("contextmenu", (event) => {
      if (Date.now() - latestRightPointerAt < 600) {
        event.preventDefault();
        return;
      }
      advanceWithRightClick(event);
    }, true);
    renderPage(0);
  }).catch((error: unknown) => {
    if (renderVersion !== presentationRenderVersion || !deck.isConnected) return;
    deck.remove();
    showState(container, `Unable to paginate presentation content: ${String(error)}`, "error");
  });
}

export function renderSurfaces(
  container: HTMLElement,
  processor: MessageProcessor<any>,
  modeHint?: string,
): void {
  injectRoutingTheme();
  injectPresentationContentTheme();
  const generationProfile = getStoredGenerationProfile();
  document.documentElement.dataset.a2learnDisplayMode = generationProfile.displayMode;
  presentationRenderVersion += 1;
  disposePresentationPage();

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
    if (generationProfile.displayMode === "presentation") {
      renderPresentationDeck(container, activeSurface, getSurfaceTitle(activeSurface), modeHint);
      return;
    }
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
    sourceIds: source.sourceIds || undefined,
    resourceQuery: source.resourceQuery || undefined,
    language: source.language || getLang(),
    generationProfile: getStoredGenerationProfile(),
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
  // Land on the first generated surface, not the last — matches
  // bootstrapOffline's landing behavior: the course reads top to bottom, so
  // module 1 is the natural starting point right after generation.
  const startCreatedId = extractFirstCreatedSurfaceId(initialMessages);
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
function getExampleItems(lang: Lang): ExampleCardItem[] {
  return LOCAL_EXAMPLES.map((example) => ({
    id: example.id,
    title: example.label[lang],
    description: example.description[lang],
    messagesUrl: lang === "en" ? `/examples/en/${example.id}.json` : `/examples/${example.id}.json`,
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
  syncGenerationSettingsInputs(getStoredGenerationProfile());
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
  onOpenSourceLibrary?: () => void,
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
  const sourceLibraryButton = document.getElementById("app-source-library-btn");
  const componentInputs = document.querySelectorAll<HTMLInputElement>(".generation-component-input");
  const exampleInputs = document.querySelectorAll<HTMLInputElement>(".generation-example-input");

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
    const profile = setStoredGenerationProfile(profileFromSettingsInputs());
    applyGenerationTheme(profile.themeId, profile.displayMode);
    if (activeRuntime) {
      renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
    }
    closeSettingsModal();
  });

  clearBtn?.addEventListener("click", () => {
    setStoredApiKey("");
    if (keyInput) keyInput.value = "";
    updateKeyPillStatus();
    closeSettingsModal();
  });

  componentInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) {
        // A reference case is only meaningful while all of the components it
        // demonstrates remain available. Turning one off therefore removes
        // only the dependent examples, never restores a hidden default.
        clearExamplesUsingComponent(input.dataset.componentId || "");
      }
      const current = profileFromSettingsInputs();
      if (input.checked && current.enabledComponents.length > MAX_ENABLED_COMPONENTS) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_ENABLED_COMPONENTS} 个组件。` : `Choose at most ${MAX_ENABLED_COMPONENTS} components for one run.`);
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
  });

  exampleInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const selectedProfile = profileFromSettingsInputs();
      const selectedExampleCount = document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked").length;
      if (input.checked && selectedExampleCount > MAX_EXAMPLE_CASES) {
        input.checked = false;
        alert(getLang() === "zh" ? `本次最多选择 ${MAX_EXAMPLE_CASES} 个本地案例。` : `Choose at most ${MAX_EXAMPLE_CASES} local examples for one run.`);
      } else if (input.checked) {
        const requiredComponents = getLocalExampleComponents(input.dataset.exampleId || "");
        const combined = new Set([...selectedProfile.enabledComponents, ...requiredComponents]);
        if (combined.size > MAX_ENABLED_COMPONENTS) {
          input.checked = false;
          alert(getLang() === "zh" ? `该案例需要的组件会超过 ${MAX_ENABLED_COMPONENTS} 个上限。` : `This example would require more than ${MAX_ENABLED_COMPONENTS} components.`);
        } else {
          setExampleComponentInputs(requiredComponents, true);
        }
      }
      syncGenerationSettingsInputs(profileFromSettingsInputs());
    });
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

  sourceLibraryButton?.addEventListener("click", () => onOpenSourceLibrary?.());

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
function bindGlobalListenersOnce(openExploreInNewTab: (promptText: string) => void): void {
  if (globalListenersBound) return;
  globalListenersBound = true;

  window.addEventListener("a2learn-explore-concept", (e: Event) => {
    const concept = (e as CustomEvent).detail?.concept;
    if (!concept) return;
    const lang = getLang();
    const promptText = lang === "zh" ? `详细解释 ${concept}` : `Explain ${concept} in detail`;

    if (!getStoredApiKey()) {
      openSettingsModal();
      alert(T[lang].needApiKeyExplore);
      return;
    }
    openExploreInNewTab(promptText);
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
  if (!initialConfig.embed && !initialConfig.source.themeVars) {
    const profile = getStoredGenerationProfile();
    applyGenerationTheme(profile.themeId, profile.displayMode);
  }

  // Whether the caller explicitly asked for a particular source (query
  // params / env vars). If not, the "default" offline config is just a
  // placeholder that never resolves to a real file in a static deployment —
  // show a friendly localized picker prompt instead of a scary fetch error.
  const hasExplicitSource =
    initialConfig.source.mode === "online" ||
    (initialConfig.source.mode === "offline" && initialConfig.source.messagesUrl !== "/generated/site_messages.json");

  type ContentState = { kind: "example" | "project"; id: string } | { kind: "other" };
  let currentContent: ContentState = { kind: "other" };
  const locationParams = new URLSearchParams(window.location.search);
  const initialProjectId = locationParams.get("project");
  const initialEditorExample = locationParams.get("example");
  if (initialProjectId) {
    currentContent = { kind: "project", id: initialProjectId };
  } else if (import.meta.env.MODE === "editor" || locationParams.get("mode") === "editor") {
    currentContent = { kind: "example", id: initialEditorExample || "hash-table" };
  }

  let container: HTMLElement | null = null;
  let parentOrigin = "*";
  let stopResize: () => void = () => {};
  const languageChangeControllers: Array<{ onLanguageChanged: () => void }> = [];

  const editorApiBaseUrl = () =>
    initialConfig.source.mode === "online"
      ? initialConfig.source.apiBaseUrl
      : (
          import.meta.env.VITE_A2LEARN_API_URL ||
          (import.meta.env.DEV ? "http://localhost:8008" : window.location.origin)
        ).trim();

  const updateProjectUrl = (projectId: string | null) => {
    const url = new URL(window.location.href);
    if (projectId) url.searchParams.set("project", projectId);
    else url.searchParams.delete("project");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const renderShell = (lang: Lang) => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    const title = initialConfig.embed ? "" : "A2Learn Showcase Generator";
    const subtitle = initialConfig.embed ? "" : T[lang].subtitle;

    const examplesHtml = initialConfig.embed
      ? ""
      : renderExamplesStrip(T[lang].examplesStripTitle, getExampleItems(lang));

    const chrome: AppChromeStrings = {
      ...CHROME_STRINGS[lang],
      settingsContentHtml: generationSettingsHtml(lang, getStoredGenerationProfile()),
    };
    renderAppFrame(
      root,
      title,
      subtitle,
      `${examplesHtml}<section id="surface-container" aria-live="polite">
        <p class="viewer-state loading">${T[lang].loadingShowcase}</p>
      </section>`,
      initialConfig.embed ? undefined : { lang, chrome },
    );
    container = document.getElementById("surface-container");
  };

  renderShell(getLang());
  if (!container) {
    return;
  }

  if (!initialConfig.embed) {
    const getCurrentProjectId = () => {
      if (currentContent.kind === "other") return null;
      return currentContent.kind === "example"
        ? `example-${getLang()}-${currentContent.id}`
        : currentContent.id;
    };
    const floatingAgent = mountFloatingAgent({
      getLanguage: () => (getLang() === "en" ? "en" : "zh"),
      getProjectId: getCurrentProjectId,
      getSurfaceId: readCurrentSurfaceHash,
      getApiBaseUrl: editorApiBaseUrl,
      getApiKey: getStoredApiKey,
      getProcessor: () => activeRuntime?.processor || null,
      render: () => {
        if (activeRuntime) renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
      },
      pickComponent: () => container ? pickRenderedComponent(container) : Promise.resolve(null),
      recentProjects,
      onProjectCreated: (projectId, title, messages) => {
        if (!container) return;
        const processor = new MessageProcessor([a2learnCatalog], () => undefined);
        processor.processMessages(messages);
        activeRuntime = { container, processor, modeHint: "Project editor mode." };
        currentContent = { kind: "project", id: projectId };
        rememberProject(projectId, title);
        updateProjectUrl(projectId);
        const firstSurface = extractFirstCreatedSurfaceId(messages);
        if (firstSurface) window.location.hash = `#/${firstSurface}`;
        renderSurfaces(container, processor, "Project editor mode.");
      },
      onOpenProject: async (project) => openProject(project),
    });
    const inlineEditor = mountInlineComponentEditor({
      getContainer: () => container,
      getLanguage: () => (getLang() === "en" ? "en" : "zh"),
      getProjectId: getCurrentProjectId,
      getSurfaceId: readCurrentSurfaceHash,
      getApiBaseUrl: editorApiBaseUrl,
      getApiKey: getStoredApiKey,
      getProcessor: () => activeRuntime?.processor || null,
      render: () => {
        if (activeRuntime) renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
      },
    });
    languageChangeControllers.push(floatingAgent, inlineEditor);
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
    updateProjectUrl(null);
    await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } });
  };

  const openProject = async (project: RecentProject) => {
    const target = container;
    if (!target) return;
    const apiBaseUrl = editorApiBaseUrl().replace(/\/+$/, "");
    if (!apiBaseUrl) {
      throw new Error(getLang() === "en" ? "The editing API is not configured." : "未配置编辑 API 服务。");
    }
    const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(project.id)}/a2ui`);
    if (!response.ok) {
      throw new Error(getLang() === "en" ? `Could not open the page (${response.status})` : `打开页面失败 (${response.status})`);
    }
    const payload = await response.json() as { messages?: A2uiMessage[] };
    if (!Array.isArray(payload.messages)) {
      throw new Error(getLang() === "en" ? "Invalid page data" : "页面数据无效");
    }
    const processor = new MessageProcessor([a2learnCatalog], () => undefined);
    processor.processMessages(payload.messages);
    activeRuntime = { container: target, processor, modeHint: "Project editor mode." };
    currentContent = { kind: "project", id: project.id };
    rememberProject(project.id, project.title);
    updateProjectUrl(project.id);
    const firstSurface = extractFirstCreatedSurfaceId(payload.messages);
    if (firstSurface) window.location.hash = `#/${firstSurface}`;
    renderSurfaces(target, processor, "Project editor mode.");
  };

  const onGenerate = (promptText: string) => {
    const target = container;
    if (!target) return;
    currentContent = { kind: "other" };
    updateProjectUrl(null);
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
        language: getLang(),
        headers: userKey ? { Authorization: `Bearer ${userKey}` } : undefined,
      },
    };
    // User explicitly asked to generate from their own prompt — on failure,
    // leave the error on screen instead of silently swapping in the static
    // demo gallery content (see startWithConfig's fallbackToOffline comment).
    void startWithConfig(onlineConfig, false);
  };

  const onGenerateFromSources = (sourceIds: string[], resourceQuery: string) => {
    const target = container;
    if (!target) return;
    currentContent = { kind: "other" };
    updateProjectUrl(null);
    const currentApiUrl =
      initialConfig.source.mode === "online"
        ? initialConfig.source.apiBaseUrl
        : (import.meta.env.VITE_A2LEARN_API_URL || "").trim();
    if (!currentApiUrl) {
      showState(target, T[getLang()].noBackendConfigured, "error");
      return;
    }
    const userKey = getStoredApiKey();
    void startWithConfig({
      embed: false,
      source: {
        mode: "online",
        apiBaseUrl: normalizeBaseUrl(currentApiUrl),
        sourceIds,
        resourceQuery: resourceQuery || undefined,
        language: getLang(),
        headers: userKey ? { Authorization: `Bearer ${userKey}` } : undefined,
      },
    }, false);
  };

  const sourceLibrary = initialConfig.embed
    ? null
    : mountSourceLibrary({
        getApiBaseUrl: editorApiBaseUrl,
        getApiKey: getStoredApiKey,
        getLanguage: () => (getLang() === "en" ? "en" : "zh"),
        onGenerate: onGenerateFromSources,
      });
  if (sourceLibrary) {
    languageChangeControllers.push(sourceLibrary);
  }

  // "Explore this concept" (tooltip button) opens the generated deep-dive in
  // a new tab instead of replacing the page the visitor is currently reading
  // — swapping it in place would discard their spot in the showcase they
  // came from. The new tab re-runs bootstrapViewer() via mode=online/
  // resourceText query params, which already picks up the stored API key
  // itself (see startWithConfig's storedKey merge above).
  const openExploreInNewTab = (promptText: string) => {
    const currentApiUrl =
      initialConfig.source.mode === "online"
        ? initialConfig.source.apiBaseUrl
        : (import.meta.env.VITE_A2LEARN_API_URL || "").trim();

    if (!currentApiUrl) {
      alert(T[getLang()].noBackendConfigured);
      return;
    }

    const url = new URL(window.location.pathname, window.location.origin);
    url.searchParams.set("mode", "online");
    url.searchParams.set("apiBaseUrl", normalizeBaseUrl(currentApiUrl));
    url.searchParams.set("resourceText", promptText);
    window.open(url.toString(), "_blank", "noopener");
  };

  const switchLanguage = async (newLang: Lang) => {
    if (newLang === getLang()) return;
    setLang(newLang);
    languageChangeControllers.forEach((controller) => controller.onLanguageChanged());
    renderShell(newLang);
    const target = container;
    if (!target) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);

    if (currentContent.kind === "example") {
      const item = getExampleItems(newLang).find((i) => i.id === currentContent.id);
      if (item) {
        await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } });
        return;
      }
    }
    if (currentContent.kind === "project" && activeRuntime) {
      activeRuntime = { ...activeRuntime, container: target };
      renderSurfaces(target, activeRuntime.processor, activeRuntime.modeHint);
      return;
    }
    showState(target, T[newLang].pickExamplePrompt, "empty");
  };

  if (!initialConfig.embed) {
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);
    bindGlobalListenersOnce(openExploreInNewTab);
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
            language: (source as any).language === "zh" || (source as any).language === "en" ? (source as any).language : getLang(),
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

  if (initialProjectId) {
    await openProject({ id: initialProjectId, title: initialProjectId, openedAt: new Date().toISOString() });
  } else if (hasExplicitSource || initialConfig.embed) {
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
