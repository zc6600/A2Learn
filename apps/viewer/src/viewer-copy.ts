import type { AppChromeStrings } from "@a2learn/viewer-kit/page-shell";
import type { Lang } from "./generation-profile";

export type ViewerCopy = {
  subtitle: string;
  examplesStripTitle: string;
  welcomeEyebrow: string;
  welcomeTitle: string;
  welcomeDescription: string;
  loadingShowcase: string;
  generationProgressEyebrow: string;
  generationProgressTitle: string;
  generationProgressDescription: string;
  generationProgressStatus: string;
  generationProgressMode: string;
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
  workspaceTitle: string;
  myWorkspace: string;
  curatedCourses: string;
  newFolder: string;
  newFolderPrompt: string;
  newSubfolder: string;
  newSubfolderPrompt: string;
  rename: string;
  renamePrompt: string;
  moveTo: string;
  moveToRoot: string;
  selectTargetFolder: string;
  deleteItem: string;
  deleteConfirm: string;
  collapseSidebar: string;
  expandSidebar: string;
  emptyFolder: string;
  noWorkspaceItems: string;
  untitledFolder: string;
  dropToFolder: string;
  dropToRoot: string;
};

export const T: Record<Lang, ViewerCopy> = {
  zh: {
    subtitle: "输入你想学习的知识主题，AI 为你实时生成生动易懂的互动课件",
    examplesStripTitle: "精选案例",
    welcomeEyebrow: "开始学习",
    welcomeTitle: "你想学什么？",
    welcomeDescription: "输入一个主题，生成互动课件；或浏览精选案例。",
    loadingShowcase: "正在加载课程内容，请稍候...",
    generationProgressEyebrow: "正在生成",
    generationProgressTitle: "正在生成课程",
    generationProgressDescription: "正在整理知识结构，并准备互动内容。",
    generationProgressStatus: "处理中",
    generationProgressMode: "在线生成",
    onlineFailedPrefix: "生成失败（请检查 API Key 配置或网络连接）。",
    onlineFailedFallback: "已自动切换为预设示例展示。",
    noBackendConfigured:
      "当前服务未连接在线后端，仅支持浏览静态示例课程。如需实时生成新课程，请配置后端服务。",
    needApiKeyExplore: "请点击右上角配置你的 API Key 以生成内容。",
    staticTreeLeafNote: "示例课程仅展示到这一层；配置 API Key 后可继续深入生成更多内容。",
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
    presenterScriptTitle: "🎙 AI 讲解文稿",
    closeScript: "关闭讲稿",
    workspaceTitle: "目录导航",
    myWorkspace: "我的学习工作区",
    curatedCourses: "官方精选课程",
    newFolder: "新建文件夹",
    newFolderPrompt: "请输入文件夹名称：",
    newSubfolder: "新建子文件夹",
    newSubfolderPrompt: "请输入子文件夹名称：",
    rename: "重命名",
    renamePrompt: "请输入新的名称：",
    moveTo: "移动到...",
    moveToRoot: "工作区根目录",
    selectTargetFolder: "选择目标文件夹",
    deleteItem: "删除",
    deleteConfirm: "确定要删除此项吗？",
    collapseSidebar: "收起侧边栏",
    expandSidebar: "展开侧边栏",
    emptyFolder: "暂无内容（可拖入课件）",
    noWorkspaceItems: "还没有生成课程。在上方输入主题开始学习吧！",
    untitledFolder: "新建文件夹",
    dropToFolder: "释放以移入此文件夹",
    dropToRoot: "释放以移至根目录",
  },
  en: {
    subtitle: "Interactive learning powered by AI · Enter any topic to generate a visual, hands-on lesson",
    examplesStripTitle: "Featured cases",
    welcomeEyebrow: "Start learning",
    welcomeTitle: "What would you like to learn?",
    welcomeDescription: "Enter a topic to create an interactive lesson, or browse a featured case.",
    loadingShowcase: "Loading course content, please wait...",
    generationProgressEyebrow: "Generating",
    generationProgressTitle: "Building your lesson",
    generationProgressDescription: "Organizing the topic and preparing the interactive content.",
    generationProgressStatus: "In progress",
    generationProgressMode: "Online generation",
    onlineFailedPrefix: "Generation failed (please check your API key or network connection).",
    onlineFailedFallback: "Switched to the preset example view.",
    noBackendConfigured:
      "No backend server is connected; currently only browsing preset examples is supported.",
    needApiKeyExplore: "Please configure your OpenRouter API Key in the top right before using the AI engine.",
    staticTreeLeafNote: "This demo preview ends here; configure an API key to generate further topics.",
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
    workspaceTitle: "Workspace Navigation",
    myWorkspace: "My Workspace",
    curatedCourses: "Curated Lessons",
    newFolder: "New Folder",
    newFolderPrompt: "Enter folder name:",
    newSubfolder: "New Subfolder",
    newSubfolderPrompt: "Enter subfolder name:",
    rename: "Rename",
    renamePrompt: "Enter new name:",
    moveTo: "Move to...",
    moveToRoot: "Workspace Root",
    selectTargetFolder: "Select target folder",
    deleteItem: "Delete",
    deleteConfirm: "Are you sure you want to delete this item?",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    emptyFolder: "Empty folder (drag files here)",
    noWorkspaceItems: "No generated courses yet. Enter a topic above to begin!",
    untitledFolder: "New Folder",
    dropToFolder: "Release to move into this folder",
    dropToRoot: "Release to move to workspace root",
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
      "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将本地保存。",
    modalBodyFooter: "没有 API Key？你也可以直接点击下方的精选示例课程开始学习。",
    modalSaveLabel: "保存配置",
  },
  en: {
    promptPlaceholder: "Enter a topic you want to learn (e.g., Explain how Hash Maps work...)",
    sourceLibraryLabel: "📚 Upload sources",
    sourceLibraryTitle: "Upload and select sources",
    submitLabel: "⚡ Generate",
    settingsBtnLabel: "⚙️ Settings",
    settingsBtnTitle: "Configure API key, generation components, and page theme",
    keyPillMissingLabel: "🔑 API Key not set",
    modalTitle: "⚙️ Generation Settings",
    modalBodyIntroHtml:
      "Enter your <strong>OpenRouter API Key</strong>. It's stored only in your browser.",
    modalBodyFooter: "No API key? You can still click any of the featured lessons below to learn instantly.",
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
