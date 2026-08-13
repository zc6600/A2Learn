export type Lang = "zh" | "en";

export const MAX_ENABLED_COMPONENTS = 20;
export const MAX_EXAMPLE_CASES = 10;
// This is a safety guard, not a preset list: Settings accepts any whole
// number from 0 to 20. The user chooses the actual per-generation budget.
export const MAX_AUTO_GENERATED_IMAGES = 20;

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
};

export type LocalExample = {
  id: string;
  category: "paper" | "computing" | "poetry";
  label: Record<Lang, string>;
  description: Record<Lang, string>;
  componentIds: string[];
};

export type ReferencePack = {
  id: string;
  label: Record<Lang, string>;
  description: Record<Lang, string>;
  exampleIds: string[];
};

export type TemplateDifficulty = "beginner" | "intermediate" | "advanced";
export type TemplatePedagogy = "problem-driven" | "theory-lab" | "project-based" | "research" | "poetry-reading";

// Templates describe the learning experience. The concrete component list is
// resolved from the strategy below so adding a component does not require
// editing every template by hand.
export type GenerationTemplate = {
  id: "beginner" | "theory-lab" | "project" | "research" | "poetry";
  scope: "computing" | "poetry";
  label: Record<Lang, string>;
  description: Record<Lang, string>;
  difficulty: TemplateDifficulty;
  pedagogy: TemplatePedagogy;
  depth: "standard" | "deep";
  componentStrategy: "guided" | "experimental" | "build-first" | "paper-first";
  promptGuidance: string;
  referencePackIds: string[];
  referenceExampleIds: string[];
  themeId: string;
  displayMode: "standard" | "presentation";
  imageGenerationLimit: number;
};

export type GenerationProfile = {
  version: 1;
  // "custom" is used after an advanced setting has been changed manually.
  templateId: GenerationTemplate["id"] | "custom";
  enabledComponents: string[];
  exampleIds: string[];
  referencePackIds: string[];
  themeId: string;
  displayMode: "standard" | "presentation";
  imageGenerationLimit: number;
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
  { id: "ScenarioDialogue", group: "explain", label: { zh: "情境对话 / 微信群", en: "Dialogue / WeChat Group" }, description: { zh: "用多人对话或微信群拆解原文的潜台词", en: "Use dialogue or a group chat to unpack subtext" } },
  { id: "SocialMoments", group: "explain", label: { zh: "朋友圈", en: "Social Moments" }, description: { zh: "用动态、评论和配图重现场景与情绪", en: "Recreate scenes and emotion through posts, comments, and images" } },
  { id: "SmartAnnotationBoard", group: "explore", label: { zh: "智能批注板", en: "Annotation Board" }, description: { zh: "对片段进行批注与反馈", en: "Annotate passages and receive feedback" } },
  { id: "DocumentFigure", group: "explore", label: { zh: "图文解读", en: "Document Figure" }, description: { zh: "图片、图表与局部说明", en: "Images, figures, and focused explanation" } },
  { id: "QuizCard", group: "practice", label: { zh: "测验卡", en: "Quiz Card" }, description: { zh: "单选、多选与答案解析", en: "Single/multiple choice with explanations" } },
  { id: "ClozeTest", group: "practice", label: { zh: "填空练习", en: "Cloze Test" }, description: { zh: "记忆、语句和关键词练习", en: "Practice recall, phrasing, and keywords" } },
  { id: "DragAndDropMatch", group: "practice", label: { zh: "连线匹配", en: "Drag & Drop Match" }, description: { zh: "双栏项目与选项连线配对", en: "Connect left items with right options" } },
  { id: "RelationshipMatch", group: "practice", label: { zh: "关系匹配", en: "Relationship Match" }, description: { zh: "概念、意象或文本关系解读", en: "Match concepts, imagery, or relationships" } },
  { id: "Flashcard", group: "practice", label: { zh: "闪卡", en: "Flashcard" }, description: { zh: "正反面记忆与复习", en: "Front/back recall and revision" } },
  { id: "InteractiveSandbox", group: "practice", label: { zh: "交互沙盒", en: "Interactive Sandbox" }, description: { zh: "可操作的实验或演示", en: "Hands-on experiment or demo" } },
  { id: "DataTable", group: "explain", label: { zh: "数据表格", en: "Data Table" }, description: { zh: "结构化数据与记录对比", en: "Structured data and record comparison" } },
  { id: "InteractiveFormula", group: "practice", label: { zh: "交互公式", en: "Interactive Formula" }, description: { zh: "参数可调的公式与推演", en: "Adjustable formulas and derivations" } },
  { id: "DeepDivePrompt", group: "explore", label: { zh: "延伸探索", en: "Deep Dive" }, description: { zh: "引导下一步追问与探索", en: "Guide follow-up questions and exploration" } },
  { id: "CodeSnippet", group: "practice", label: { zh: "代码片段", en: "Code Snippet" }, description: { zh: "带注释的代码或格式化文本", en: "Annotated code or formatted text" } },
];

// These are bundled A2UI websites under apps/viewer/public/examples/. Their
// IDs, rather than a browser-only URL, are persisted so the API can later
// resolve the same curated source files when constructing a few-shot prompt.
export const LOCAL_EXAMPLES: LocalExample[] = [
  { id: "hash-table", category: "computing", label: { zh: "Hash Table 哈希表", en: "Hash Table" }, description: { zh: "哈希冲突与开放寻址法", en: "Hash collisions and open addressing" }, componentIds: ["AnalogyCard", "ClozeTest", "ConceptCard", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"] },
  { id: "database-basics", category: "computing", label: { zh: "数据库入门", en: "Database Basics" }, description: { zh: "从表、行、列到基础 SQL", en: "Tables, rows, columns, and beginner SQL" }, componentIds: ["AnalogyCard", "ConceptCard", "DataTable", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"] },
  { id: "agent-react", category: "computing", label: { zh: "ReAct Agent 架构", en: "ReAct Agent Architecture" }, description: { zh: "手写 ReAct 循环引擎", en: "Hand-building a ReAct loop engine" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ScenarioDialogue"] },
  { id: "js-async", category: "computing", label: { zh: "JS 异步与事件循环", en: "JS Async & the Event Loop" }, description: { zh: "手写 Promise.all 实现", en: "Implementing Promise.all from scratch" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "conversational", category: "computing", label: { zh: "JS 闭包与作用域", en: "JS Closures & Scope" }, description: { zh: "闭包模块模式与私有变量", en: "The module pattern and private variables via closures" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "non-linear", category: "computing", label: { zh: "CSS Grid 二维布局", en: "CSS Grid 2D Layout" }, description: { zh: "零媒体查询的响应式网格", en: "Responsive grids with zero media queries" }, componentIds: ["AnalogyCard", "ConceptCard", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"] },
  { id: "paper-attention", category: "paper", label: { zh: "Transformer 注意力机制", en: "Transformer Attention" }, description: { zh: "缩放点积注意力四步推导", en: "Deriving scaled dot-product attention in four steps" }, componentIds: ["AnalogyCard", "InteractiveFormula", "MentalModel", "PaperAbstract", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"] },
  { id: "biophysics-ai", category: "paper", label: { zh: "AI 驱动生物物理 (AlphaFold)", en: "AI-Driven Biophysics (AlphaFold)" }, description: { zh: "AlphaFold3 扩散模块解析", en: "Breaking down AlphaFold3's diffusion module" }, componentIds: ["AnalogyCard", "ClozeTest", "ConceptCard", "DeepDivePrompt", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "RelationshipMatch", "ResourceList", "ScenarioDialogue", "Timeline"] },
  { id: "poetry-social", category: "poetry", label: { zh: "《春江花月夜》· 词注、月行与两地相望", en: "Spring River, Flower, Moon, Night · Glosses, Moon Path, Two Shores" }, description: { zh: "从原文词注、月光路径到人物之间的相望与判断", en: "From source glosses and moon path to distance, perspective, and a short judgement" }, componentIds: ["DetailedExplanation", "RelationshipMatch", "ScenarioDialogue", "Timeline"] },
  { id: "deng-gao", category: "poetry", label: { zh: "《登高》· 七律之冠与四联镜头解码", en: "Climbing the Height · Peak Seven-Char Octave & Four Couplets Lens" }, description: { zh: "杜甫夔州高台独白、从宇宙宏大到一人白发与十四字愁苦解码", en: "Du Fu's monologue at Kuizhou, from cosmic grandness to white hair and fourteen-character sorrow" }, componentIds: ["DeepDivePrompt", "DetailedExplanation", "DragAndDropMatch", "ScenarioDialogue", "Timeline"] },
];

export const REFERENCE_PACKS: ReferencePack[] = [
  {
    id: "database-basics-series",
    label: { zh: "数据库入门六讲", en: "Database Basics: Six Lessons" },
    description: { zh: "用一个完整的初学者系列学习问题驱动、表格和代码实验。", en: "A beginner series built around problem-driven explanation, tables, and code labs." },
    // This pack is loaded from the six long-form course files, not from the
    // shorter gallery preview named database-basics.
    exampleIds: [],
  },
  {
    id: "hash-table-lab",
    label: { zh: "Hash Table 原理实验", en: "Hash Table Theory Lab" },
    description: { zh: "从性能痛点、心智模型到带注释的实现实验。", en: "From a performance problem to a mental model and annotated implementation lab." },
    exampleIds: ["hash-table"],
  },
  {
    id: "computer-paper-deep-dive",
    label: { zh: "计算机论文深度解析", en: "Computer Paper Deep Dive" },
    description: { zh: "使用摘要、公式、脉络和批判性问题理解计算机论文。", en: "Use abstracts, formulas, context, and critical questions to read computer papers." },
    exampleIds: ["paper-attention", "biophysics-ai"],
  },
  {
    id: "poetry-reading",
    label: { zh: "诗词赏析案例", en: "Poetry reading examples" },
    description: { zh: "保留原文、意象、关系和情绪推进的诗词课程结构。", en: "Preserve source text, imagery, relationships, and emotional progression." },
    exampleIds: ["poetry-social", "deng-gao"],
  },
];

export const RENDER_THEMES: RenderTheme[] = [
  {
    id: "learning-default",
    label: { zh: "默认（黑白简洁）", en: "Default (Clean Mono)" },
    description: { zh: "高对比度黑白配色，类 ChatGPT 的克制风格", en: "High-contrast black & white, restrained ChatGPT-style" },
  },
  {
    id: "teal-accent",
    label: { zh: "翠绿教学", en: "Teal Learning" },
    description: { zh: "清爽青绿强调色的通用课程界面", en: "Clean teal-accented general-purpose course UI" },
  },
  {
    id: "poetry-ink",
    label: { zh: "诗意墨韵", en: "Poetry Ink" },
    description: { zh: "宣纸暖色、宋体与更强留白", en: "Warm paper, serif type, and generous whitespace" },
  },
  {
    id: "poetry-night",
    label: { zh: "夜读朗诵", en: "Poetry Night" },
    description: { zh: "深色沉浸式阅读与朗诵氛围", en: "Dark, immersive reading and recital atmosphere" },
  },
  {
    id: "editorial",
    label: { zh: "黑白学术", en: "Editorial" },
    description: { zh: "克制的黑白配色，适合论文与长篇赏析", en: "Restrained monochrome style for papers and long-form analysis" },
  },
  {
    id: "minimal",
    label: { zh: "极简阅读", en: "Minimal" },
    description: { zh: "黑白、低干扰的专注阅读", en: "Black-and-white, low-distraction reading" },
  },
  {
    id: "ppt-stage",
    label: { zh: "深蓝舞台", en: "Deep Blue Stage" },
    description: { zh: "高对比度的深蓝配色与方正排版", en: "High-contrast deep blue colors and square geometry" },
  },
];

export const GENERATION_TEMPLATES: GenerationTemplate[] = [
  {
    id: "beginner",
    scope: "computing",
    label: { zh: "入门循序渐进", en: "Guided beginner" },
    description: { zh: "从生活场景和问题出发，逐步建立概念，再用练习确认理解。", en: "Start from a practical problem, build concepts gradually, and confirm understanding with practice." },
    difficulty: "beginner",
    pedagogy: "problem-driven",
    depth: "deep",
    componentStrategy: "guided",
    promptGuidance: "面向完全初学者。先提出一个生活化或实际工作中的问题，再用简单语言建立模型；每个新术语第一次出现时立即解释。保留丰富行间注释、具体数据、小练习和本讲总结。",
    referencePackIds: ["database-basics-series"],
    referenceExampleIds: ["database-basics", "conversational"],
    themeId: "learning-default",
    displayMode: "standard",
    imageGenerationLimit: 2,
  },
  {
    id: "theory-lab",
    scope: "computing",
    label: { zh: "技术原理实验", en: "Technical theory lab" },
    description: { zh: "先解释原理为什么存在，再用具体数据和可运行代码验证它。", en: "Explain why the mechanism exists, then verify it with concrete data and runnable code." },
    difficulty: "intermediate",
    pedagogy: "theory-lab",
    depth: "deep",
    componentStrategy: "experimental",
    promptGuidance: "先说明性能或工程痛点，再从第一性原理解释机制；用具体数据逐步演算，并提供可以运行的代码实验。不要只给抽象定义。",
    referencePackIds: ["hash-table-lab"],
    referenceExampleIds: ["hash-table", "js-async", "agent-react"],
    themeId: "learning-default",
    displayMode: "standard",
    imageGenerationLimit: 0,
  },
  {
    id: "project",
    scope: "computing",
    label: { zh: "项目实战", en: "Project-based" },
    description: { zh: "从需求拆解开始，边设计边实现，最后完成一个可检查的小项目。", en: "Start from requirements, design while building, and finish with a checkable small project." },
    difficulty: "beginner",
    pedagogy: "project-based",
    depth: "deep",
    componentStrategy: "build-first",
    promptGuidance: "围绕一个小而完整的计算机项目组织课程。先拆需求和数据，再边实现边解释；每段代码都保留详细行间注释，最后用验收清单检查项目。",
    referencePackIds: ["database-basics-series"],
    referenceExampleIds: ["database-basics", "agent-react", "js-async", "non-linear"],
    themeId: "learning-default",
    displayMode: "standard",
    imageGenerationLimit: 0,
  },
  {
    id: "research",
    scope: "computing",
    label: { zh: "论文深度解析", en: "Research deep dive" },
    description: { zh: "面向计算机论文：先读问题和摘要，再拆解方法、公式、证据与局限。", en: "For computer science papers: move from the problem and abstract to methods, formulas, evidence, and limits." },
    difficulty: "advanced",
    pedagogy: "research",
    depth: "deep",
    componentStrategy: "paper-first",
    promptGuidance: "面向有基础的计算机学习者。先交代论文要解决的问题和贡献，再解释方法、公式、实验依据与局限；区分论文事实、直觉解释和批判性问题。",
    referencePackIds: ["computer-paper-deep-dive"],
    referenceExampleIds: ["paper-attention", "biophysics-ai"],
    themeId: "learning-default",
    displayMode: "standard",
    imageGenerationLimit: 0,
  },
  {
    id: "poetry",
    scope: "poetry",
    label: { zh: "诗词赏析", en: "Poetry reading" },
    description: { zh: "保留原文与逐层赏析，用意象、关系和情绪理解诗词。", en: "Read the source first, then use imagery, relationships, and emotion to understand the poem." },
    difficulty: "beginner",
    pedagogy: "poetry-reading",
    depth: "deep",
    componentStrategy: "poetry-reading",
    promptGuidance: "面向诗词学习：先保留完整原文，再用逐句解释、意象关系、情绪推进和适量练习帮助理解。不要把诗词改写成技术课程。",
    referencePackIds: ["poetry-reading"],
    referenceExampleIds: ["poetry-social", "deng-gao"],
    themeId: "learning-default",
    displayMode: "standard",
    imageGenerationLimit: 0,
  },
];

export const DEFAULT_GENERATION_PROFILE: GenerationProfile = {
  version: 1,
  templateId: "beginner",
  enabledComponents: [],
  exampleIds: [],
  referencePackIds: ["database-basics-series"],
  themeId: "learning-default",
  displayMode: "standard",
  imageGenerationLimit: 2,
  visualIntent: "",
};

const PROFILE_STORAGE_KEY = "a2learn_generation_profile_v1";
const KNOWN_COMPONENT_IDS = new Set(GENERATION_COMPONENTS.map((component) => component.id));
const KNOWN_EXAMPLE_IDS = new Set(LOCAL_EXAMPLES.map((example) => example.id));
const KNOWN_REFERENCE_PACK_IDS = new Set(REFERENCE_PACKS.map((pack) => pack.id));
const KNOWN_THEME_IDS = new Set(RENDER_THEMES.map((theme) => theme.id));
const KNOWN_TEMPLATE_IDS = new Set(GENERATION_TEMPLATES.map((template) => template.id));
const LEGACY_TEMPLATE_IDS: Record<string, GenerationTemplate["id"]> = {
  general: "beginner",
  computing: "theory-lab",
  paper: "research",
  poetry: "poetry",
};

const COMPONENT_STRATEGIES: Record<GenerationTemplate["componentStrategy"], string[]> = {
  guided: ["LearningPath", "AnalogyCard", "ConceptCard", "MentalModel", "DetailedExplanation", "DataTable", "ScenarioDialogue", "InteractiveSandbox", "QuizCard"],
  experimental: ["LearningPath", "AnalogyCard", "ConceptCard", "MentalModel", "DetailedExplanation", "InteractiveSandbox", "CodeSnippet", "DataTable", "QuizCard", "ClozeTest", "ScenarioDialogue"],
  "build-first": ["LearningPath", "AnalogyCard", "ConceptCard", "DetailedExplanation", "DataTable", "InteractiveSandbox", "CodeSnippet", "QuizCard", "ScenarioDialogue", "MentalModel"],
  "paper-first": ["LearningPath", "PaperAbstract", "ConceptCard", "MentalModel", "DetailedExplanation", "InteractiveFormula", "DataTable", "RelationshipMatch", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline", "DeepDivePrompt"],
  "poetry-reading": ["LearningPath", "DetailedExplanation", "RelationshipMatch", "ScenarioDialogue", "Timeline", "QuizCard", "DeepDivePrompt"],
};
// Themes that were formerly auto-linked to specific templates. Now that templates
// no longer drive theme switching, a stored profile with one of these IDs should
// be silently migrated to the neutral default so old localStorage values do not
// keep forcing an unexpected colour scheme on the user.
const LEGACY_TEMPLATE_LINKED_THEMES = new Set(["poetry-ink", "editorial"]);

function uniqueKnownComponentIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_COMPONENT_IDS.has(id)))).slice(0, limit);
}

function uniqueKnownExampleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_EXAMPLE_IDS.has(id)))).slice(0, MAX_EXAMPLE_CASES);
}

function uniqueKnownReferencePackIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && KNOWN_REFERENCE_PACK_IDS.has(id))));
}

function resolveTemplate(template: GenerationTemplate): { enabledComponents: string[]; exampleIds: string[] } {
  const packExampleIds = template.referencePackIds.flatMap((packId) =>
    REFERENCE_PACKS.find((pack) => pack.id === packId)?.exampleIds || [],
  );
  const exampleIds = Array.from(new Set([...template.referenceExampleIds, ...packExampleIds]));
  const exampleComponents = exampleIds.flatMap((exampleId) =>
    LOCAL_EXAMPLES.find((example) => example.id === exampleId)?.componentIds || [],
  );
  const strategyComponents = COMPONENT_STRATEGIES[template.componentStrategy] || [];
  return {
    enabledComponents: Array.from(new Set([...strategyComponents, ...exampleComponents])).filter((id) => KNOWN_COMPONENT_IDS.has(id)).slice(0, MAX_ENABLED_COMPONENTS),
    exampleIds: exampleIds.slice(0, MAX_EXAMPLE_CASES),
  };
}

function imageGenerationLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) return DEFAULT_GENERATION_PROFILE.imageGenerationLimit;
  return Math.max(0, Math.min(MAX_AUTO_GENERATED_IMAGES, value));
}

export function normalizeGenerationProfile(value: unknown): GenerationProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const resolved = resolveTemplate(GENERATION_TEMPLATES[0]);
    return { ...DEFAULT_GENERATION_PROFILE, ...resolved, referencePackIds: [...GENERATION_TEMPLATES[0].referencePackIds] };
  }
  const raw = value as Partial<GenerationProfile>;
  const rawTemplateId = typeof raw.templateId === "string" ? raw.templateId : "";
  const migratedTemplateId = LEGACY_TEMPLATE_IDS[rawTemplateId] || rawTemplateId;
  const templateId = KNOWN_TEMPLATE_IDS.has(migratedTemplateId as GenerationTemplate["id"])
    ? migratedTemplateId as GenerationTemplate["id"]
    : "custom";
  const template = templateId === "custom" ? null : getGenerationTemplate(templateId);
  const resolved = template ? resolveTemplate(template) : { enabledComponents: [], exampleIds: [] };
  // A selected template owns its automatic defaults. Old saved profiles may
  // still contain the previous template's hand-maintained arrays; discard
  // those stale values. Manual overrides set templateId to custom first.
  const allowedComponents = template
    ? resolved.enabledComponents
    : Array.isArray(raw.enabledComponents)
    ? uniqueKnownComponentIds(raw.enabledComponents, MAX_ENABLED_COMPONENTS)
    : resolved.enabledComponents;
  const exampleIds = (template ? resolved.exampleIds : (Array.isArray(raw.exampleIds) ? uniqueKnownExampleIds(raw.exampleIds) : resolved.exampleIds)).filter((exampleId) =>
    (LOCAL_EXAMPLES.find((example) => example.id === exampleId)?.componentIds || [])
      .every((componentId) => allowedComponents.includes(componentId)),
  );
  const referencePackIds = template
    ? [...template.referencePackIds]
    : Array.isArray(raw.referencePackIds)
    ? uniqueKnownReferencePackIds(raw.referencePackIds)
    : (template?.referencePackIds || []);
  return {
    version: 1,
    // Old saved profiles predate templates. Preserve their actual selections
    // and show them as a custom profile instead of silently replacing them.
    templateId,
    enabledComponents: allowedComponents,
    exampleIds,
    referencePackIds,
    themeId: typeof raw.themeId === "string" && KNOWN_THEME_IDS.has(raw.themeId) && !LEGACY_TEMPLATE_LINKED_THEMES.has(raw.themeId)
      ? raw.themeId
      : DEFAULT_GENERATION_PROFILE.themeId,
    // Before display modes were separate, selecting the old presentation theme
    // also enabled pagination. Preserve that saved preference during migration.
    displayMode: raw.displayMode === "presentation" ||
      (raw.displayMode === undefined && raw.themeId === "ppt-stage")
      ? "presentation"
      : "standard",
    imageGenerationLimit: imageGenerationLimit(raw.imageGenerationLimit),
    visualIntent: typeof raw.visualIntent === "string" && raw.visualIntent.trim()
      ? raw.visualIntent.slice(0, 500)
      : (template?.promptGuidance || ""),
  };
}

export function getGenerationTemplate(templateId: string): GenerationTemplate {
  return GENERATION_TEMPLATES.find((template) => template.id === templateId) || GENERATION_TEMPLATES[0];
}

export function profileForTemplate(templateId: string): GenerationProfile {
  const template = getGenerationTemplate(templateId);
  const resolved = resolveTemplate(template);
  return {
    version: 1,
    templateId: template.id,
    enabledComponents: [...resolved.enabledComponents],
    exampleIds: [...resolved.exampleIds],
    referencePackIds: [...template.referencePackIds],
    themeId: template.themeId,
    displayMode: template.displayMode,
    imageGenerationLimit: template.imageGenerationLimit,
    visualIntent: template.promptGuidance,
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
