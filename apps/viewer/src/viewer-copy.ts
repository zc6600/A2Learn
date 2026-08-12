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
  staticTreeLeafNote: string;
  playNarration: string;
  noNarrationAvailable: string;
  defaultGeneratedTitle: string;
  editingApiNotConfigured: string;
  openPageFailedPrefix: string;
  invalidPageData: string;
  generatingNarration: string;
  pauseNarration: string;
  resumeNarration: string;
  narrationFailedPrefix: string;
  playbackFailedPrefix: string;
  presenterScriptTitle: string;
  closeScript: string;
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
    needApiKeyExplore: "请点击右上角配置你的API Key 以生成内容。",
    staticTreeLeafNote: "静态案例陈列仅展示到这一层；连接 BYOK 在线后端后可继续深入生成完整内容。",
    playNarration: "播放讲稿音频",
    noNarrationAvailable: "暂无预生成音频",
    defaultGeneratedTitle: "AI 生成课程",
    editingApiNotConfigured: "未配置编辑 API 服务。",
    openPageFailedPrefix: "打开页面失败",
    invalidPageData: "页面数据无效",
    generatingNarration: "正在生成讲稿和音频…",
    pauseNarration: "暂停讲稿音频",
    resumeNarration: "继续播放讲稿",
    narrationFailedPrefix: "讲稿生成失败：",
    playbackFailedPrefix: "音频播放失败：",
    presenterScriptTitle: "🎙 AI 讲稿文稿",
    closeScript: "关闭讲稿",
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
    staticTreeLeafNote: "This static example only goes this deep; connect a BYOK online backend to keep generating deeper content.",
    playNarration: "Play narration audio",
    noNarrationAvailable: "No narration available",
    defaultGeneratedTitle: "Generated Course",
    editingApiNotConfigured: "The editing API is not configured.",
    openPageFailedPrefix: "Could not open the page",
    invalidPageData: "Invalid page data",
    generatingNarration: "Generating narration…",
    pauseNarration: "Pause narration",
    resumeNarration: "Resume narration",
    narrationFailedPrefix: "Narration failed: ",
    playbackFailedPrefix: "Audio playback failed: ",
    presenterScriptTitle: "🎙 Presenter Script",
    closeScript: "Close script",
  },
};

export const CHROME_STRINGS: Record<Lang, AppChromeStrings> = {
  zh: {
    promptPlaceholder: "输入你想学习的知识主题（例如：解释 Hash Map 机制...）",
    sourceLibraryLabel: "📚 上传资料",
    sourceLibraryTitle: "上传并选择资料",
    submitLabel: "⚡ 生成",
    settingsBtnLabel: "⚙️ 设置",
    settingsBtnTitle: "配置 API Key、生成组件与页面主题",
    keyPillMissingLabel: "🔑 API Key 待配置",
    modalTitle: "⚙️ 生成设置",
    modalBodyIntroHtml:
      "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将仅保存在浏览器本地（<code>localStorage</code>），每次交互时透传给后端，绝不上交服务器保存。",
    modalBodyFooter: "无 API Key？你也可以直接选择下方的案例陈列，预览精美的 Showcase。",
    modalSaveLabel: "保存配置",
  },
  en: {
    promptPlaceholder: "Enter a topic you want to learn (e.g., Explain how Hash Maps work...)",
    sourceLibraryLabel: "📚 Upload sources",
    sourceLibraryTitle: "Upload and select sources",
    submitLabel: "⚡ Generate Showcase Live",
    settingsBtnLabel: "⚙️ Settings",
    settingsBtnTitle: "Configure API key, generation components, and page theme",
    keyPillMissingLabel: "🔑 API Key not set",
    modalTitle: "⚙️ Generation Settings",
    modalBodyIntroHtml:
      "Enter your <strong>OpenRouter API Key</strong>. It's stored only in your browser (<code>localStorage</code>) and passed through to the backend on each request — it is never saved on our servers.",
    modalBodyFooter: "No API key? You can still browse the pre-generated example gallery below.",
    modalSaveLabel: "Save",
  },
};

export type SourceLibraryCopy = {
  title: string;
  close: string;
  upload: string;
  refresh: string;
  empty: string;
  goal: string;
  generate: string;
  selectReady: string;
  uploading: string;
  loading: string;
  ready: string;
  needsOcr: string;
  needsParser: string;
  failed: string;
  selected: string;
  noBackend: string;
  noApiKey: string;
  uploadFailed: string;
  loadFailed: string;
  unsupportedHint: string;
};

export const SOURCE_LIBRARY_COPY: Record<Lang, SourceLibraryCopy> = {
  zh: {
    title: "资料库",
    close: "关闭",
    upload: "上传资料",
    refresh: "刷新",
    empty: "还没有资料。上传书籍、讲义或笔记开始学习。",
    goal: "学习目标（可选，例如：用初学者能理解的方式讲解第 3 章）",
    generate: "用所选资料生成课程",
    selectReady: "请选择至少一份已解析资料。",
    uploading: "正在上传并解析…",
    loading: "正在加载资料…",
    ready: "可用于生成",
    needsOcr: "等待 OCR",
    needsParser: "等待解析器",
    failed: "解析失败",
    selected: "已选 {count} 份资料",
    noBackend: "未配置资料库 API 服务。",
    noApiKey: "请先在 API Key 设置中配置密钥，再生成课程。",
    uploadFailed: "上传失败",
    loadFailed: "无法加载资料库",
    unsupportedHint: "支持 PDF、EPUB、DOCX、Markdown、文本、网页、表格和图片；扫描件会进入 OCR 队列。",
  },
  en: {
    title: "Source library",
    close: "Close",
    upload: "Upload source",
    refresh: "Refresh",
    empty: "No sources yet. Upload a book, handout, or notes to begin.",
    goal: "Learning goal (optional, e.g. explain chapter 3 for beginners)",
    generate: "Generate from selected sources",
    selectReady: "Select at least one parsed source.",
    uploading: "Uploading and extracting…",
    loading: "Loading sources…",
    ready: "Ready for generation",
    needsOcr: "Waiting for OCR",
    needsParser: "Waiting for parser",
    failed: "Extraction failed",
    selected: "{count} source(s) selected",
    noBackend: "The source-library API is not configured.",
    noApiKey: "Configure an API key in Settings before generating a course.",
    uploadFailed: "Upload failed",
    loadFailed: "Could not load the source library",
    unsupportedHint: "PDF, EPUB, DOCX, Markdown, text, web, tabular, and image files are supported; scans enter the OCR queue.",
  },
};

