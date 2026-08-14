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
  onlineModeSyncing: string;
  onlineModeReady: string;
  onlineInteractionFailed: string;
  offlineBundledCourse: string;
  offlineMessageFile: string;
  a2uiProcessingFailedPrefix: string;
  unableToLoadMessages: string;
  noRenderableSurfaces: string;
  paginatePresentationFailedPrefix: string;
  onlineSessionInitializationFailed: string;
  onlineSessionResponseFormatError: string;
  generationFailedOnServer: string;
  interactionCallbackFailed: string;
  sessionStatusCheckFailed: string;
  generationTimedOut: string;
  missingCoursePlanningJobId: string;
  coursePlanningFailed: string;
  coursePlanningTimedOut: string;
  missingLessonSessionId: string;
  lessonGenerationFailed: string;
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
    presenterScriptTitle: "讲解文稿",
    closeScript: "关闭讲稿",
    onlineModeSyncing: "在线模式已连接，正在同步最新交互…",
    onlineModeReady: "在线模式已连接，支持交互回调和增量更新。",
    onlineInteractionFailed: "在线交互回调失败，请检查 API 服务状态后重试。",
    offlineBundledCourse: "离线模式：正在预览内置课程课时。",
    offlineMessageFile: "离线模式：仅预览消息文件，不支持交互回调。",
    a2uiProcessingFailedPrefix: "A2UI 消息处理失败",
    unableToLoadMessages: "无法加载 A2UI 消息，请先运行 Agent 生成消息。",
    noRenderableSurfaces: "没有生成可渲染的页面。",
    paginatePresentationFailedPrefix: "演示内容分页失败",
    onlineSessionInitializationFailed: "在线会话初始化失败",
    onlineSessionResponseFormatError: "在线会话响应格式错误。",
    generationFailedOnServer: "服务器生成失败。",
    interactionCallbackFailed: "交互回调失败",
    sessionStatusCheckFailed: "会话状态检查失败",
    generationTimedOut: "生成超时，请稍后重试。",
    missingCoursePlanningJobId: "缺少课程规划任务 ID。",
    coursePlanningFailed: "课程规划失败",
    coursePlanningTimedOut: "课程规划超时。",
    missingLessonSessionId: "缺少课时会话 ID。",
    lessonGenerationFailed: "本节生成失败",
    workspaceTitle: "课程目录",
    myWorkspace: "我的工作区",
    curatedCourses: "精选课程",
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
    presenterScriptTitle: "Presenter Script",
    closeScript: "Close script",
    onlineModeSyncing: "Online mode connected, syncing the latest interaction…",
    onlineModeReady: "Online mode connected, supporting interaction callbacks and incremental updates.",
    onlineInteractionFailed: "Online interaction callback failed. Check the API service and try again.",
    offlineBundledCourse: "Offline mode: Previewing the bundled course lesson.",
    offlineMessageFile: "Offline mode: Previewing the message file only; interaction callbacks are unavailable.",
    a2uiProcessingFailedPrefix: "A2UI message processing failed",
    unableToLoadMessages: "Unable to load A2UI messages. Run Agent to generate messages first.",
    noRenderableSurfaces: "No renderable surfaces were generated.",
    paginatePresentationFailedPrefix: "Unable to paginate presentation content",
    onlineSessionInitializationFailed: "Online session initialization failed",
    onlineSessionResponseFormatError: "Online session response format error.",
    generationFailedOnServer: "Generation failed on the server.",
    interactionCallbackFailed: "Interaction callback failed",
    sessionStatusCheckFailed: "Session status check failed",
    generationTimedOut: "Generation timed out; please retry later.",
    missingCoursePlanningJobId: "Missing course planning job ID.",
    coursePlanningFailed: "Course planning failed",
    coursePlanningTimedOut: "Course planning timed out.",
    missingLessonSessionId: "Missing lesson session ID.",
    lessonGenerationFailed: "Lesson generation failed",
    workspaceTitle: "Course Index",
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
    promptPlaceholder: "输入学习主题（例如：Hash Map 机制...）",
    sourceLibraryLabel: "上传资料",
    sourceLibraryTitle: "上传并选择资料",
    submitLabel: "生成",
    settingsBtnLabel: "设置",
    settingsBtnTitle: "配置 API Key、生成组件与页面主题",
    keyPillMissingLabel: "API Key 待配置",
    modalTitle: "生成设置",
    modalBodyIntroHtml:
      "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将本地保存。",
    modalBodyFooter: "没有 API Key？你也可以直接点击下方的精选示例课程开始学习。",
    modalSaveLabel: "保存配置",
  },
  en: {
    promptPlaceholder: "Enter a topic to learn (e.g., Hash Maps...)",
    sourceLibraryLabel: "Upload sources",
    sourceLibraryTitle: "Upload and select sources",
    submitLabel: "Generate",
    settingsBtnLabel: "Settings",
    settingsBtnTitle: "Configure API key, generation components, and page theme",
    keyPillMissingLabel: "API Key not set",
    modalTitle: "Generation Settings",
    modalBodyIntroHtml:
      "Enter your <strong>OpenRouter API Key</strong>. It's stored only in your browser.",
    modalBodyFooter: "No API key? You can still click any of the featured lessons below to learn instantly.",
    modalSaveLabel: "Save",
  },
};

export type SourceLibraryCopy = {
  title: string;
  sources: string;
  pdfPreview: string;
  pdfReaderTitle: string;
  chunksUnit: string;
  close: string;
  upload: string;
  refresh: string;
  empty: string;
  goal: string;
  goalLabel: string;
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
  splitPdf: string;
  backToLibrary: string;
  pdfSplitTitle: string;
  courseTitle: string;
  courseTitlePlaceholder: string;
  addLesson: string;
  lessonTitle: string;
  lessonTitlePlaceholder: string;
  pageRange: string;
  pageFrom: string;
  pageTo: string;
  pageUnit: string;
  addToList: string;
  lessonQueue: string;
  noLessons: string;
  batchGenerate: string;
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  selectPdfFirst: string;
  enterValidLesson: string;
};

export const SOURCE_LIBRARY_COPY: Record<Lang, SourceLibraryCopy> = {
  zh: {
    title: "资料库",
    sources: "资料列表",
    pdfPreview: "PDF 原文预览",
    pdfReaderTitle: "PDF 阅读器",
    chunksUnit: "分块",
    close: "关闭",
    upload: "上传资料",
    refresh: "刷新",
    empty: "暂无资料，点击或拖拽上传书籍、论文、讲义或笔记开始学习。",
    goal: "例如：面向初学者通俗易懂地讲解，多用生活中的比喻...",
    goalLabel: "课程生成偏好与学习目标（可选）",
    generate: "一键生成课程",
    selectReady: "请勾选至少一份已就绪的资料。",
    uploading: "正在上传并解析…",
    loading: "正在同步资料库…",
    ready: "可用于生成",
    needsOcr: "等待 OCR",
    needsParser: "等待解析器",
    failed: "解析失败",
    selected: "已选 {count} 份资料",
    noBackend: "未配置资料库 API 服务。",
    noApiKey: "请先在 API Key 设置中配置密钥，再生成课程。",
    uploadFailed: "上传失败",
    loadFailed: "无法加载资料库",
    unsupportedHint: "支持 PDF, EPUB, DOCX, Markdown, 文本, 图片等格式；扫描件会自动入队 OCR。",
    splitPdf: "按 PDF 拆分课时",
    backToLibrary: "返回资料库",
    pdfSplitTitle: "按 PDF 拆分课时",
    courseTitle: "课程系列总标题",
    courseTitlePlaceholder: "例如：深入理解计算机系统 · 专题课",
    addLesson: "添加课时",
    lessonTitle: "课时名称",
    lessonTitlePlaceholder: "例如：第 1 讲：内存层次与缓存机制",
    pageRange: "PDF 页码范围",
    pageFrom: "从第",
    pageTo: "至第",
    pageUnit: "页",
    addToList: "＋ 添加到课时清单",
    lessonQueue: "已规划课时清单",
    noLessons: "暂未添加课时，请在上方输入标题与页码范围后点击添加。",
    batchGenerate: "批量生成课程 ({count} 节课)",
    dropzoneTitle: "点击或拖拽文件上传",
    dropzoneSubtitle: "支持 PDF, EPUB, DOCX, Markdown, TXT, 图片等格式",
    selectPdfFirst: "请先在资料列表中勾选一份 PDF 文件。",
    enterValidLesson: "请填写课时名称以及有效的 PDF 起止页码范围。",
  },
  en: {
    title: "Source Library",
    sources: "Sources",
    pdfPreview: "PDF Preview",
    pdfReaderTitle: "PDF reader",
    chunksUnit: "chunks",
    close: "Close",
    upload: "Upload Source",
    refresh: "Refresh",
    empty: "No sources yet. Upload a book, paper, or notes to begin.",
    goal: "e.g. explain intuitively for beginners with analogies and visual diagrams...",
    goalLabel: "Custom Learning Goal (Optional)",
    generate: "Generate Course",
    selectReady: "Select at least one parsed source.",
    uploading: "Uploading and extracting…",
    loading: "Loading sources…",
    ready: "Ready",
    needsOcr: "Waiting for OCR",
    needsParser: "Waiting for parser",
    failed: "Failed",
    selected: "{count} source(s) selected",
    noBackend: "The source-library API is not configured.",
    noApiKey: "Configure an API key in Settings before generating a course.",
    uploadFailed: "Upload failed",
    loadFailed: "Could not load the source library",
    unsupportedHint: "Supports PDF, EPUB, DOCX, Markdown, text, and images; scans enter the OCR queue.",
    splitPdf: "Split PDF into Lessons",
    backToLibrary: "Back to Library",
    pdfSplitTitle: "PDF Lesson Splitter",
    courseTitle: "Course Title",
    courseTitlePlaceholder: "e.g. Computer Systems: A Programmer's Perspective",
    addLesson: "Add Lesson",
    lessonTitle: "Lesson Title",
    lessonTitlePlaceholder: "e.g. Lesson 1: Memory Hierarchy & Caching",
    pageRange: "PDF Page Range",
    pageFrom: "From p.",
    pageTo: "to p.",
    pageUnit: "",
    addToList: "+ Add to Lesson Queue",
    lessonQueue: "Planned Lessons",
    noLessons: "No lessons added yet. Set title and page range above.",
    batchGenerate: "Generate {count} Lesson(s)",
    dropzoneTitle: "Click or drag & drop files to upload",
    dropzoneSubtitle: "Supports PDF, EPUB, DOCX, Markdown, TXT, Images, etc.",
    selectPdfFirst: "Select exactly one PDF source first.",
    enterValidLesson: "Please enter a lesson title and a valid PDF page range.",
  },
};
