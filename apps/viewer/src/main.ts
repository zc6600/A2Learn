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
  type ExampleCardGroup,
} from "@a2learn/viewer-kit/page-shell";
import { bootstrapGallery } from "@a2learn/viewer-kit/gallery/gallery-ui";
import { pickRenderedComponent } from "./component-picker";
import { mountFloatingAgent } from "./floating-agent";
import { mountInlineComponentEditor } from "./inline-component-editor";
import { mountSourceLibrary } from "./source-library";
import { NarrationController } from "./narration-controller";
import { sendOnlineSessionAction, startOnlineSession } from "./online-session";
import {
  clearExamplesUsingComponent,
  generationSettingsHtml,
  getLocalExampleComponents,
  isAudioEnabled,
  markSettingsAsCustom,
  profileFromSettingsInputs,
  setAudioEnabled,
  setExampleComponentInputs,
  staticExampleAudioUrl,
  syncGenerationSettingsInputs,
} from "./generation-settings";
import {
  applyEmbedFlag,
  applyGenerationTheme,
  applySourceTheme,
  configFromLocation,
  getLang,
  isPlainObject,
  normalizeBaseUrl,
  normalizeThemeVars,
  setLang,
} from "./viewer-config";
import type {
  InitMessage,
  ReadyMessage,
  ResizeMessage,
  ViewerRuntimeConfig,
  ViewerSourceOffline,
  ViewerSourceOnline,
} from "./viewer-types";
import {
  createPresentationSurface,
  findPresentationPageIndex,
  paginateSurface,
  type PresentationPage,
  type PresentationSurface,
} from "./presentation-paginator";
import { recentProjects, rememberProject, type RecentProject } from "./recent-projects";
import {
  LOCAL_EXAMPLES,
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  getGenerationTemplate,
  getStoredGenerationProfile,
  profileForTemplate,
  setStoredGenerationProfile,
  type Lang,
} from "./generation-profile";

let activeRuntime: {
  container: HTMLElement;
  processor: MessageProcessor<any>;
  modeHint?: string;
} | null = null;

let presentationRenderVersion = 0;
let activePresentationPage: PresentationSurface | null = null;
const narrationController = new NarrationController(() => getLang() === "en");


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

function readGalleryCategory(): ExampleCardGroup["id"] | undefined {
  const category = new URLSearchParams(window.location.search).get("gallery");
  return category === "paper" || category === "computing" || category === "poetry"
    ? category
    : undefined;
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

async function bootstrapOnline(
  container: HTMLElement,
  source: ViewerSourceOnline,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const session = await startOnlineSession(source, getStoredGenerationProfile());
  const sessionId = session.sessionId;
  const initialMessages = session.messages;
  if (!isCurrent()) return false;

  let isSendingAction = false;

  const pendingActions: any[] = [];
  const MAX_PENDING_ACTIONS = 50;

  const processor = new MessageProcessor([a2learnCatalog], (action: any) => {
    if (!isCurrent() || !sessionId || !action) return;
    pendingActions.push(action);
    if (pendingActions.length > MAX_PENDING_ACTIONS) {
      pendingActions.shift();
    }
    modeHintForSending(container, true);
    void flushPendingActions();
  });

  const flushPendingActions = async () => {
    if (!isCurrent()) {
      pendingActions.length = 0;
      return;
    }
    if (isSendingAction) return;
    const next = pendingActions.shift();
    if (!next) {
      modeHintForSending(container, false);
      return;
    }
    isSendingAction = true;
    try {
      if (!isCurrent()) return;
      const messages = await sendOnlineSessionAction(source, sessionId, next);
      if (!isCurrent()) return;
      if (messages.length > 0) {
        processor.processMessages(messages);
        const lastCreatedId = extractLastCreatedSurfaceId(messages);
        if (lastCreatedId) {
          window.location.hash = `#/${lastCreatedId}`;
        }
        renderSurfaces(container, processor, "Online mode connected, supporting interaction callbacks and incremental updates.");
      }
    } catch (err) {
      if (!isCurrent()) return;
      showState(
        container,
        `Online interaction callback failed: ${String(err)}\nPlease check API service status and retry.`,
        "error",
      );
    } finally {
      isSendingAction = false;
      if (!isCurrent()) return;
      if (pendingActions.length === 0) {
        modeHintForSending(container, false);
        return;
      }
      void flushPendingActions();
    }
  };

  if (!isCurrent()) return false;
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

async function bootstrapOffline(
  container: HTMLElement,
  source: ViewerSourceOffline,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const configuredUrl = source.messagesUrl || "/generated/site_messages.json";
  const separator = configuredUrl.includes("?") ? "&" : "?";
  const res = await fetch(`${configuredUrl}${separator}ts=${Date.now()}`);
  if (!isCurrent()) return;
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

  if (!isCurrent()) return;

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

function getExampleGroups(lang: Lang): ExampleCardGroup[] {
  const labels = lang === "zh"
    ? {
        paper: { title: "论文详解", description: "从摘要、公式到研究脉络" },
        computing: { title: "计算机专区", description: "算法、前端与 Agent 实战" },
        poetry: { title: "诗词赏析", description: "从词注阅读到意象与情绪的行进" },
      }
    : {
        paper: { title: "Paper deep dives", description: "Abstracts, formulas, and research context" },
        computing: { title: "Computing", description: "Algorithms, frontend, and Agent practice" },
        poetry: { title: "Poetry reading", description: "Move from glossed reading into imagery and feeling" },
      };
  return (["paper", "computing", "poetry"] as const).map((category) => ({
    id: category,
    ...labels[category],
    items: getExampleItems(lang).filter((item) => LOCAL_EXAMPLES.find((example) => example.id === item.id)?.category === category),
  })).filter((group) => group.items.length > 0);
}

function renderCollapsibleExampleGallery(lang: Lang, expandedCategory?: ExampleCardGroup["id"]): string {
  const summary = lang === "zh" ? "浏览模板案例" : "Browse template examples";
  const detail = lang === "zh"
    ? "按内容方向查看可直接打开的示例"
    : "Open a ready-made example by content direction";

  if (expandedCategory) {
    const groups = getExampleGroups(lang);
    const featuredGroups = groups.filter((group) => group.id === expandedCategory);
    const otherGroups = groups.filter((group) => group.id !== expandedCategory);
    return `${renderExamplesStrip("", featuredGroups)}
      <details class="template-example-gallery">
        <summary><span>${summary}</span><small>${detail}</small></summary>
        ${renderExamplesStrip("", otherGroups, false)}
      </details>`;
  }

  return `<details class="template-example-gallery">
    <summary><span>${summary}</span><small>${detail}</small></summary>
    ${renderExamplesStrip(T[lang].examplesStripTitle, getExampleGroups(lang))}
  </details>`;
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
  const keyInput = document.getElementById("app-api-key-input") as HTMLInputElement | null;
  const form = document.getElementById("app-prompt-form") as HTMLFormElement | null;
  const promptInput = document.getElementById("app-prompt-input") as HTMLInputElement | null;
  const sourceLibraryButton = document.getElementById("app-source-library-btn");
  const templateInputs = document.querySelectorAll<HTMLInputElement>(".generation-template-input");
  const templatePreviewButtons = document.querySelectorAll<HTMLButtonElement>(".generation-template-preview");
  const componentInputs = document.querySelectorAll<HTMLInputElement>(".generation-component-input");
  const exampleInputs = document.querySelectorAll<HTMLInputElement>(".generation-example-input");

  const keyPill = document.getElementById("app-key-pill");

  settingsBtn?.addEventListener("click", openSettingsModal);
  keyPill?.addEventListener("click", openSettingsModal);
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
    const audioInput = document.getElementById("generation-audio-enabled") as HTMLInputElement | null;
    if (audioInput) setAudioEnabled(audioInput.checked);
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) narrationButton.hidden = !isAudioEnabled();
    applyGenerationTheme(profile.themeId, profile.displayMode);
    if (activeRuntime) {
      renderSurfaces(activeRuntime.container, activeRuntime.processor, activeRuntime.modeHint);
    }
    closeSettingsModal();
  });

  templateInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        syncGenerationSettingsInputs(profileForTemplate(input.value));
        document.querySelector<HTMLDetailsElement>(".generation-advanced-settings")?.removeAttribute("open");
      }
    });
  });

  templatePreviewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const template = getGenerationTemplate(button.dataset.templatePreview || "");
      closeSettingsModal();
      onSelectExample(template.previewExampleId);
    });
  });

  componentInputs.forEach((input) => {
    input.addEventListener("change", () => {
      markSettingsAsCustom();
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
      markSettingsAsCustom();
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

  document.querySelectorAll<HTMLInputElement>("input[name='generation-theme'], input[name='generation-display-mode'], #generation-image-limit")
    .forEach((input) => input.addEventListener("change", markSettingsAsCustom));
  document.getElementById("generation-visual-intent")?.addEventListener("input", markSettingsAsCustom);

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

  document.querySelectorAll<HTMLElement>("[data-example-gallery]").forEach((gallery) => {
    gallery.addEventListener("click", (e: MouseEvent) => {
      const card = (e.target as HTMLElement)?.closest<HTMLElement>(".example-card");
      const id = card?.dataset.exampleId;
      if (!id) return;
      onSelectExample(id);
    });
  });
}

// True global listeners: unlike bindShellControls(), these don't touch any
// DOM that gets torn down on a language switch (composedPath delegation, or
// re-querying #app-prompt-input fresh each time it fires) — so they're bound
// exactly once for the page's lifetime instead of once per render.
let globalListenersBound = false;
function bindGlobalListenersOnce(askAgent: (promptText: string) => void): void {
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
    askAgent(promptText);
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
  applySourceTheme(initialConfig.source);
  if (!initialConfig.embed && !initialConfig.source.themeVars && !initialConfig.source.themeId) {
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
  let loadVersion = 0;
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

    const deepLinkedExample = LOCAL_EXAMPLES.find((example) => example.id === readCurrentSurfaceHash());
    const galleryCategory = readGalleryCategory() || deepLinkedExample?.category;
    const examplesHtml = initialConfig.embed
      ? ""
      : renderCollapsibleExampleGallery(lang, galleryCategory);

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
      </section><button id="page-narration-button" type="button" hidden aria-label="播放讲稿">🔊</button>`,
      initialConfig.embed ? undefined : { lang, chrome },
    );
  container = document.getElementById("surface-container");
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      narrationButton.style.cssText = "position:fixed;right:22px;bottom:78px;z-index:999;border:0;border-radius:50%;width:34px;height:34px;cursor:pointer;background:#0d9488;color:white;box-shadow:0 3px 12px #0003";
      narrationButton.title = lang === "en" ? "Play narration" : "播放讲稿";
      narrationButton.addEventListener("click", () => {
        void narrationController.toggle(narrationButton);
      });
    }
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
    bindGlobalListenersOnce((promptText) => floatingAgent.ask(promptText));
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
  const startWithConfig = async (
    cfg: ViewerRuntimeConfig,
    fallbackToOffline: boolean = true,
    expectedVersion?: number,
  ) => {
    const requestVersion = expectedVersion ?? ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
    // Snapshot container for the duration of this call: it's a `let` that
    // renderShell() can reassign (on a language switch), and it shouldn't
    // move out from under an in-flight load.
    const target = container;
    if (!target) return;
    applyEmbedFlag(cfg.embed);
    applySourceTheme(cfg.source);

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
        await bootstrapOnline(target, cfg.source, isCurrent);
        if (!isCurrent()) return;
        stopResize();
        stopResize = setupAutoResize(target, () => parentOrigin);
        return;
      }
    } catch (err) {
      if (!isCurrent()) return;
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
      isCurrent,
    );
    if (!isCurrent()) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
  };

  const selectExample = async (id: string) => {
    const requestVersion = ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
    const item = getExampleItems(getLang()).find((i) => i.id === id);
    if (!item) return;
    narrationController.stop();
    currentContent = { kind: "example", id };
    updateProjectUrl(null);
    const staticAudioUrl = staticExampleAudioUrl(id, getLang());
    // Bundled examples with a pre-generated asset must stay fully offline:
    // selecting audio should bind the shipped MP3, never regenerate it.
    if (isAudioEnabled() && staticAudioUrl) {
      await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
      if (!isCurrent()) return;
      const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
      if (narrationButton) {
        narrationButton.dataset.audioUrl = staticAudioUrl;
        narrationButton.hidden = false;
        narrationButton.title = getLang() === "en" ? "Play narration" : "播放讲稿音频";
      }
      return;
    }
    const apiBaseUrl = editorApiBaseUrl().replace(/\/+$/, "");
    if (isAudioEnabled() && apiBaseUrl) {
      try {
        const projectId = `example-${getLang()}-${id}`;
        const ensure = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(projectId)}/ensure-example`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: getLang(), exampleId: id, actor: "human" }),
        });
        if (ensure.ok) {
          if (!isCurrent()) return;
          await openProject({ id: projectId, title: item.title, openedAt: new Date().toISOString() }, requestVersion);
          return;
        }
      } catch {
        // Audio is optional; a backend failure must not prevent the static
        // example from opening normally.
      }
    }
    if (!isCurrent()) return;
    await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
    if (!isCurrent()) return;
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      const audioUrl = staticAudioUrl;
      narrationButton.dataset.audioUrl = audioUrl || "";
      narrationButton.hidden = !isAudioEnabled() || !audioUrl;
      narrationButton.title = audioUrl
        ? (getLang() === "en" ? "Play narration" : "播放讲稿音频")
        : (getLang() === "en" ? "No narration available" : "暂无预生成音频");
    }
  };

  const openProject = async (project: RecentProject, expectedVersion?: number) => {
    const requestVersion = expectedVersion ?? ++loadVersion;
    const isCurrent = () => requestVersion === loadVersion;
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
    if (!isCurrent()) return;
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
    const narrationButton = document.getElementById("page-narration-button") as HTMLButtonElement | null;
    if (narrationButton) {
      narrationButton.hidden = !isAudioEnabled();
      narrationButton.onclick = () => {
        const language = getLang() === "en" ? "en" : "zh";
        void narrationController.toggle(narrationButton, async () => {
          const response = await fetch(`${apiBaseUrl}/api/projects/${encodeURIComponent(project.id)}/narration?language=${language}`, {
            method: "POST",
            headers: { ...(getStoredApiKey() ? { "X-OpenRouter-API-Key": getStoredApiKey() } : {}) },
          });
          if (!response.ok) {
            const detail = await response.text();
            throw new Error(`${response.status}: ${detail || response.statusText}`);
          }
          return (await response.json()) as { script?: string; audioUrl: string };
        }, apiBaseUrl);
      };
    }
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

  const switchLanguage = async (newLang: Lang) => {
    if (newLang === getLang()) return;
    const requestVersion = ++loadVersion;
    setLang(newLang);
    narrationController.stop();
    languageChangeControllers.forEach((controller) => controller.onLanguageChanged());
    renderShell(newLang);
    const target = container;
    if (!target) return;
    stopResize();
    stopResize = setupAutoResize(target, () => parentOrigin);
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);

    const content = currentContent;
    if (content.kind === "example") {
      const item = getExampleItems(newLang).find((i) => i.id === content.id);
      if (item) {
        await startWithConfig({ embed: false, source: { mode: "offline", messagesUrl: item.messagesUrl } }, true, requestVersion);
        return;
      }
    }
    if (requestVersion !== loadVersion) return;
    if (content.kind === "project" && activeRuntime) {
      activeRuntime = { ...activeRuntime, container: target };
      renderSurfaces(target, activeRuntime.processor, activeRuntime.modeHint);
      return;
    }
    showState(target, T[newLang].pickExamplePrompt, "empty");
  };

  if (!initialConfig.embed) {
    bindShellControls(onGenerate, switchLanguage, selectExample, sourceLibrary?.open);
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
    // instead of a fetch-failure error. A known example hash or gallery query
    // only controls which gallery category is expanded; the visitor still
    // chooses the case.
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
