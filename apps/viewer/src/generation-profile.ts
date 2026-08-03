export type Lang = "zh" | "en";

export const MAX_ENABLED_COMPONENTS = 20;
export const MAX_EXAMPLE_CASES = 10;

export type GenerationComponent = {
  id: string;
  group: "explain" | "practice" | "explore";
  label: Record<Lang, string>;
  description: Record<Lang, string>;
};

export type RenderTheme = {
  id: string;
  label: Record<Lang, string>;
  description: Record<Lang, string>;
  vars: Record<string, string>;
};

export type LocalExample = {
  id: string;
  label: Record<Lang, string>;
  description: Record<Lang, string>;
  componentIds: string[];
};

export type GenerationProfile = {
  version: 1;
  enabledComponents: string[];
  exampleIds: string[];
  themeId: string;
  displayMode: "standard" | "presentation";
  visualIntent: string;
};

export const GENERATION_COMPONENTS: GenerationComponent[] = [
  { id: "LearningPath", group: "explain", label: { zh: "学习路径", en: "Learning Path" }, description: { zh: "课程模块与学习进度", en: "Course structure and progress" } },
  { id: "ConceptCard", group: "explain", label: { zh: "概念卡", en: "Concept Card" }, description: { zh: "核心概念、定义与例子", en: "Core concept, definition, and example" } },
  { id: "MentalModel", group: "explain", label: { zh: "心智模型", en: "Mental Model" }, description: { zh: "用比喻建立直觉", en: "Build intuition with analogy" } },
  { id: "DetailedExplanation", group: "explain", label: { zh: "深度讲解", en: "Detailed Explanation" }, description: { zh: "连续、系统的正文讲解", en: "Connected, structured explanation" } },
  { id: "AnalogyCard", group: "explain", label: { zh: "类比卡", en: "Analogy Card" }, description: { zh: "用熟悉场景解释抽象内容", en: "Explain abstractions through familiar scenes" } },
  { id: "Timeline", group: "explain", label: { zh: "时间线", en: "Timeline" }, description: { zh: "事件、创作背景或演变脉络", en: "Events, context, or development" } },
  { id: "PaperAbstract", group: "explain", label: { zh: "摘要卡", en: "Abstract Card" }, description: { zh: "文本、文章或论文的总览", en: "Overview of a text, article, or paper" } },
  { id: "LiteratureReference", group: "explore", label: { zh: "文献引用", en: "Literature Reference" }, description: { zh: "出处、延伸资料与注释", en: "Sources, further reading, and notes" } },
  { id: "ResourceList", group: "explore", label: { zh: "资源列表", en: "Resource List" }, description: { zh: "相关阅读、视频或资料", en: "Related reading, video, or materials" } },
  { id: "ScenarioDialogue", group: "explain", label: { zh: "情境对话", en: "Scenario Dialogue" }, description: { zh: "以人物对话推进理解", en: "Advance understanding through dialogue" } },
  { id: "SmartAnnotationBoard", group: "explore", label: { zh: "智能批注板", en: "Annotation Board" }, description: { zh: "对片段进行批注与反馈", en: "Annotate passages and receive feedback" } },
  { id: "DocumentFigure", group: "explore", label: { zh: "图文解读", en: "Document Figure" }, description: { zh: "图片、图表与局部说明", en: "Images, figures, and focused explanation" } },
  { id: "QuizCard", group: "practice", label: { zh: "测验卡", en: "Quiz Card" }, description: { zh: "单选、多选与答案解析", en: "Single/multiple choice with explanations" } },
  { id: "ClozeTest", group: "practice", label: { zh: "填空练习", en: "Cloze Test" }, description: { zh: "记忆、语句和关键词练习", en: "Practice recall, phrasing, and keywords" } },
  { id: "DragAndDropMatch", group: "practice", label: { zh: "匹配练习", en: "Matching Exercise" }, description: { zh: "概念、意象或文本对应", en: "Match concepts, imagery, or passages" } },
  { id: "Flashcard", group: "practice", label: { zh: "闪卡", en: "Flashcard" }, description: { zh: "正反面记忆与复习", en: "Front/back recall and revision" } },
  { id: "InteractiveSandbox", group: "practice", label: { zh: "交互沙盒", en: "Interactive Sandbox" }, description: { zh: "可操作的实验或演示", en: "Hands-on experiment or demo" } },
  { id: "InteractiveFormula", group: "practice", label: { zh: "交互公式", en: "Interactive Formula" }, description: { zh: "参数可调的公式与推演", en: "Adjustable formulas and derivations" } },
  { id: "DeepDivePrompt", group: "explore", label: { zh: "延伸探索", en: "Deep Dive" }, description: { zh: "引导下一步追问与探索", en: "Guide follow-up questions and exploration" } },
  { id: "CodeSnippet", group: "practice", label: { zh: "代码片段", en: "Code Snippet" }, description: { zh: "带注释的代码或格式化文本", en: "Annotated code or formatted text" } },
];

// These are bundled A2UI websites under apps/viewer/public/examples/. Their
// IDs, rather than a browser-only URL, are persisted so the API can later
// resolve the same curated source files when constructing a few-shot prompt.
export const LOCAL_EXAMPLES: LocalExample[] = [
  { id: "hash-table", label: { zh: "Hash Table 哈希表", en: "Hash Table" }, description: { zh: "哈希冲突与开放寻址法", en: "Hash collisions and open addressing" }, componentIds: ["AnalogyCard", "ClozeTest", "ConceptCard", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"] },
  { id: "agent-react", label: { zh: "ReAct Agent 架构", en: "ReAct Agent Architecture" }, description: { zh: "手写 ReAct 循环引擎", en: "Hand-building a ReAct loop engine" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ScenarioDialogue"] },
  { id: "js-async", label: { zh: "JS 异步与事件循环", en: "JS Async & the Event Loop" }, description: { zh: "手写 Promise.all 实现", en: "Implementing Promise.all from scratch" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "conversational", label: { zh: "JS 闭包与作用域", en: "JS Closures & Scope" }, description: { zh: "闭包模块模式与私有变量", en: "The module pattern and private variables via closures" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "non-linear", label: { zh: "CSS Grid 二维布局", en: "CSS Grid 2D Layout" }, description: { zh: "零媒体查询的响应式网格", en: "Responsive grids with zero media queries" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "paper-attention", label: { zh: "Transformer 注意力机制", en: "Transformer Attention" }, description: { zh: "缩放点积注意力四步推导", en: "Deriving scaled dot-product attention in four steps" }, componentIds: ["AnalogyCard", "InteractiveFormula", "MentalModel", "PaperAbstract", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"] },
  { id: "biophysics-ai", label: { zh: "AI 驱动生物物理 (AlphaFold)", en: "AI-Driven Biophysics (AlphaFold)" }, description: { zh: "AlphaFold3 扩散模块解析", en: "Breaking down AlphaFold3's diffusion module" }, componentIds: ["AnalogyCard", "ClozeTest", "ConceptCard", "DeepDivePrompt", "DetailedExplanation", "DragAndDropMatch", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"] },
];

export const RENDER_THEMES: RenderTheme[] = [
  {
    id: "learning-default",
    label: { zh: "通用教学", en: "Learning Default" },
    description: { zh: "清爽、通用的课程界面", en: "Clean, general-purpose course UI" },
    vars: {},
  },
  {
    id: "poetry-ink",
    label: { zh: "诗意墨韵", en: "Poetry Ink" },
    description: { zh: "宣纸暖色、宋体与更强留白", en: "Warm paper, serif type, and generous whitespace" },
    vars: {
      "--a2ui-color-primary": "#7a3e1d",
      "--a2ui-color-secondary": "#536b4e",
      "--a2ui-color-surface": "#fbf5e8",
      "--a2ui-color-surface-subtle": "#f3ead8",
      "--a2ui-color-on-surface": "#2f2923",
      "--a2ui-color-on-background": "#554a40",
      "--a2ui-color-border": "#d9c9ae",
      "--a2ui-font-family-title": "Songti SC, STSong, SimSun, serif",
      "--a2ui-card-border-radius": "6px",
      "--a2ui-card-padding": "24px 28px",
      "--a2ui-spacing-xl": "40px",
      "--a2learn-page-background": "radial-gradient(circle at 12% 8%, rgba(160, 107, 55, .13), transparent 28%), repeating-linear-gradient(0deg, rgba(122, 62, 29, .025) 0 1px, transparent 1px 5px), #f6eedc",
      "--a2learn-shell-radius": "4px",
      "--a2learn-control-radius": "2px",
      "--a2learn-pill-radius": "2px",
      "--a2learn-panel-shadow": "0 10px 28px rgba(84, 51, 28, .12)",
    },
  },
  {
    id: "poetry-night",
    label: { zh: "夜读朗诵", en: "Poetry Night" },
    description: { zh: "深色沉浸式阅读与朗诵氛围", en: "Dark, immersive reading and recital atmosphere" },
    vars: {
      "--app-bg": "#17191d",
      "--app-text": "#eee7d9",
      "--app-muted": "#b7ad9f",
      "--app-outline": "#38342f",
      "--a2ui-color-primary": "#d4a85b",
      "--a2ui-color-secondary": "#829a76",
      "--a2ui-color-surface": "#22252a",
      "--a2ui-color-surface-subtle": "#2b2e33",
      "--a2ui-color-on-surface": "#f4eddf",
      "--a2ui-color-on-background": "#d3cabc",
      "--a2ui-color-border": "#45413b",
      "--a2ui-font-family-title": "Songti SC, STSong, SimSun, serif",
      "--a2learn-page-background": "radial-gradient(circle at 80% 0%, rgba(212, 168, 91, .16), transparent 30%), linear-gradient(145deg, #16191d, #202633 65%, #16191d)",
      "--a2learn-shell-radius": "8px",
      "--a2learn-control-radius": "4px",
      "--a2learn-pill-radius": "4px",
      "--a2learn-panel-shadow": "0 18px 48px rgba(0, 0, 0, .42)",
    },
  },
  {
    id: "editorial",
    label: { zh: "文学杂志", en: "Editorial" },
    description: { zh: "克制的杂志排版，适合长篇赏析", en: "Restrained editorial style for long-form analysis" },
    vars: {
      "--a2ui-color-primary": "#263f66",
      "--a2ui-color-secondary": "#8a5a44",
      "--a2ui-color-surface": "#fffdf8",
      "--a2ui-color-surface-subtle": "#f7f3eb",
      "--a2ui-color-on-surface": "#1d2430",
      "--a2ui-color-border": "#d6d1c7",
      "--a2ui-font-family-title": "Iowan Old Style, Songti SC, serif",
      "--a2ui-card-border-radius": "2px",
      "--a2learn-page-background": "repeating-linear-gradient(90deg, rgba(38, 63, 102, .035) 0 1px, transparent 1px 14px), #f5f1e9",
      "--a2learn-shell-radius": "0px",
      "--a2learn-control-radius": "0px",
      "--a2learn-pill-radius": "0px",
      "--a2learn-panel-shadow": "none",
    },
  },
  {
    id: "minimal",
    label: { zh: "极简阅读", en: "Minimal" },
    description: { zh: "黑白、低干扰的专注阅读", en: "Black-and-white, low-distraction reading" },
    vars: {
      "--a2ui-color-primary": "#1f2937",
      "--a2ui-color-secondary": "#4b5563",
      "--a2ui-color-surface": "#ffffff",
      "--a2ui-color-surface-subtle": "#f9fafb",
      "--a2ui-color-on-surface": "#111827",
      "--a2ui-color-border": "#d1d5db",
      "--a2ui-card-border-radius": "0px",
      "--a2ui-card-box-shadow": "none",
      "--a2learn-page-background": "#ffffff",
      "--a2learn-shell-radius": "0px",
      "--a2learn-control-radius": "0px",
      "--a2learn-pill-radius": "0px",
      "--a2learn-panel-shadow": "none",
    },
  },
  {
    id: "ppt-stage",
    label: { zh: "深蓝舞台", en: "Deep Blue Stage" },
    description: { zh: "高对比度的深蓝配色与方正排版", en: "High-contrast deep blue colors and square geometry" },
    vars: {
      "--app-bg": "#101827",
      "--app-text": "#f8fafc",
      "--app-muted": "#bac5d7",
      "--app-outline": "rgba(255, 255, 255, .18)",
      "--a2ui-color-primary": "#f3b15a",
      "--a2ui-color-secondary": "#89a9dc",
      "--a2ui-color-surface": "#17243a",
      "--a2ui-color-surface-subtle": "#223553",
      "--a2ui-color-on-surface": "#f8fafc",
      "--a2ui-color-on-background": "#dce6f5",
      "--a2ui-color-border": "rgba(211, 226, 248, .26)",
      "--a2ui-font-family-title": "Aptos Display, Inter, PingFang SC, Microsoft YaHei, sans-serif",
      "--a2ui-font-size-2xl": "46px",
      "--a2ui-card-border-radius": "0px",
      "--a2ui-card-box-shadow": "none",
      "--a2learn-page-background": "radial-gradient(circle at 8% 8%, rgba(71, 124, 201, .45), transparent 34%), linear-gradient(135deg, #0d1422, #172b4b 55%, #101827)",
      "--a2learn-shell-radius": "0px",
      "--a2learn-control-radius": "2px",
      "--a2learn-pill-radius": "2px",
      "--a2learn-panel-shadow": "0 24px 60px rgba(0, 0, 0, .34)",
    },
  },
];

const DEFAULT_COMPONENTS = [
  "AnalogyCard",
  "ClozeTest",
  "LearningPath",
  "ConceptCard",
  "MentalModel",
  "DetailedExplanation",
  "InteractiveFormula",
  "InteractiveSandbox",
  "PaperAbstract",
  "QuizCard",
  "ResourceList",
  "ScenarioDialogue",
  "Timeline",
];

export const DEFAULT_GENERATION_PROFILE: GenerationProfile = {
  version: 1,
  enabledComponents: DEFAULT_COMPONENTS,
  exampleIds: ["hash-table", "paper-attention"],
  themeId: "learning-default",
  displayMode: "standard",
  visualIntent: "",
};

const PROFILE_STORAGE_KEY = "a2learn_generation_profile_v1";
const KNOWN_COMPONENT_IDS = new Set(GENERATION_COMPONENTS.map((component) => component.id));
const KNOWN_EXAMPLE_IDS = new Set(LOCAL_EXAMPLES.map((example) => example.id));
const KNOWN_THEME_IDS = new Set(RENDER_THEMES.map((theme) => theme.id));

function uniqueKnownComponentIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_COMPONENT_IDS.has(id)))).slice(0, limit);
}

function uniqueKnownExampleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_EXAMPLE_IDS.has(id)))).slice(0, MAX_EXAMPLE_CASES);
}

export function normalizeGenerationProfile(value: unknown): GenerationProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_GENERATION_PROFILE, enabledComponents: [...DEFAULT_COMPONENTS], exampleIds: [...DEFAULT_GENERATION_PROFILE.exampleIds] };
  }
  const raw = value as Partial<GenerationProfile>;
  const allowedComponents = Array.isArray(raw.enabledComponents)
    ? uniqueKnownComponentIds(raw.enabledComponents, MAX_ENABLED_COMPONENTS)
    : [...DEFAULT_COMPONENTS];
  const exampleIds = uniqueKnownExampleIds(raw.exampleIds).filter((exampleId) =>
    (LOCAL_EXAMPLES.find((example) => example.id === exampleId)?.componentIds || [])
      .every((componentId) => allowedComponents.includes(componentId)),
  );
  return {
    version: 1,
    enabledComponents: allowedComponents,
    exampleIds,
    themeId: typeof raw.themeId === "string" && KNOWN_THEME_IDS.has(raw.themeId)
      ? raw.themeId
      : DEFAULT_GENERATION_PROFILE.themeId,
    // Before display modes were separate, selecting the old presentation theme
    // also enabled pagination. Preserve that saved preference during migration.
    displayMode: raw.displayMode === "presentation" ||
      (raw.displayMode === undefined && raw.themeId === "ppt-stage")
      ? "presentation"
      : "standard",
    visualIntent: typeof raw.visualIntent === "string" ? raw.visualIntent.slice(0, 500) : "",
  };
}

export function getStoredGenerationProfile(): GenerationProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    return normalizeGenerationProfile(stored ? JSON.parse(stored) : undefined);
  } catch {
    return normalizeGenerationProfile(undefined);
  }
}

export function setStoredGenerationProfile(profile: GenerationProfile): GenerationProfile {
  const normalized = normalizeGenerationProfile(profile);
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // A full or unavailable localStorage should not prevent generation.
  }
  return normalized;
}

export function getRenderTheme(themeId: string): RenderTheme {
  return RENDER_THEMES.find((theme) => theme.id === themeId) || RENDER_THEMES[0];
}
