import type { AppChromeStrings } from "@a2learn/viewer-kit/page-shell";
import type { Lang } from "./generation-profile";

export type ViewerCopy = {
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
};

export const T: Record<Lang, ViewerCopy> = {
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

export const CHROME_STRINGS: Record<Lang, AppChromeStrings> = {
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
