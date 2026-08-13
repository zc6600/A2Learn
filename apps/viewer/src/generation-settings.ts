import {
  GENERATION_COMPONENTS,
  GENERATION_TEMPLATES,
  LOCAL_EXAMPLES,
  REFERENCE_PACKS,
  MAX_AUTO_GENERATED_IMAGES,
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  RENDER_THEMES,
  normalizeGenerationProfile,
  type GenerationProfile,
  type Lang,
} from "./generation-profile";

const AUDIO_ENABLED_STORAGE_KEY = "a2learn.audio.enabled";
const AUDIO_ASSET_BASE_URL = (import.meta.env.VITE_A2LEARN_AUDIO_BASE_URL || "").trim();
const API_AUDIO_ASSET_BASE_URL = (import.meta.env.VITE_A2LEARN_API_URL || "").trim()
  ? `${(import.meta.env.VITE_A2LEARN_API_URL as string).replace(/\/+$/, "")}/api/example-audio`
  : "";
const STATIC_EXAMPLE_AUDIO: Record<string, Partial<Record<Lang, string>>> = {
  "hash-table": {
    zh: "/examples/audio/hash-table.zh.mp3",
    en: "/examples/audio/hash-table.en.mp3",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isAudioEnabled(): boolean {
  return window.localStorage.getItem(AUDIO_ENABLED_STORAGE_KEY) === "true";
}

export function setAudioEnabled(enabled: boolean): void {
  window.localStorage.setItem(AUDIO_ENABLED_STORAGE_KEY, String(enabled));
}

export function staticExampleAudioUrl(exampleId: string, language: Lang): string | null {
  const path = STATIC_EXAMPLE_AUDIO[exampleId]?.[language];
  if (!path) return null;
  const remoteBaseUrl = AUDIO_ASSET_BASE_URL || API_AUDIO_ASSET_BASE_URL;
  if (remoteBaseUrl) {
    return new URL(path.replace(/^\/+/, ""), `${remoteBaseUrl.replace(/\/+$/, "")}/`).toString();
  }
  // Resolve against the current document so static examples also work when
  // the viewer is hosted below a project subpath during local development
  // (for example /A2Learn/). Production builds should use the external audio
  // asset base URL so the MP3 files do not need to live in Git.
  return new URL(path.replace(/^\/+/, ""), document.baseURI).toString();
}

function templateDifficultyLabel(
  template: (typeof GENERATION_TEMPLATES)[number],
  lang: Lang,
): string {
  const difficulty = lang === "zh"
    ? { beginner: "入门", intermediate: "中级", advanced: "高级" }[template.difficulty]
    : { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }[template.difficulty];
  const pedagogy = lang === "zh"
    ? { "problem-driven": "问题驱动", "theory-lab": "原理实验", "project-based": "项目实践", research: "研究解析", "poetry-reading": "诗词赏析" }[template.pedagogy]
    : { "problem-driven": "Problem-driven", "theory-lab": "Theory lab", "project-based": "Project-based", research: "Research", "poetry-reading": "Poetry reading" }[template.pedagogy];
  return `${difficulty} · ${pedagogy} · ${template.depth === "deep" ? (lang === "zh" ? "深度内容" : "Deep content") : (lang === "zh" ? "标准内容" : "Standard content")}`;
}

export function generationSettingsHtml(lang: Lang, profile: GenerationProfile): string {
  const copy = lang === "zh"
    ? {
        heading: "生成配置",
        note: "这些偏好会保存在当前浏览器，并用于定制下一次生成。",
        templates: "选择生成模板",
        templatesCopy: "模板只选择学习难度和教学方式；组件与参考课程会自动匹配。",
        advanced: "高级自定义",
        advancedCopy: "只有需要覆盖自动配置时才展开。手动修改组件或案例后，会变成自定义配置。",
        components: "本次可生成的组件",
        componentsCopy: "选择本次页面可使用的组件；全部关闭时只会保留基础文字与布局。",
        examples: "参考案例",
        examplesCopy: "模板会自动选择参考课程；这里仅用于高级覆盖。",
        exampleUses: "使用组件：",
        theme: "页面风格",
        themeCopy: "影响页面的颜色、字体、留白和卡片质感。",
        displayMode: "展示模式",
        displayModeCopy: "标准模式保留完整页面；演示模式会按内容自动分页，并支持全屏与右键翻页。",
        standardMode: "标准页面",
        standardModeCopy: "页面连续阅读，使用原有页签切换。",
        presentationMode: "自动分页演示",
        presentationModeCopy: "将当前内容排入 16:9 页面，可全屏展示。",
        imageLimit: "自动配图上限",
        imageLimitCopy: "一次生成最多自动创建多少张意境配图。超出上限的图片请求会被跳过，页面不会保留空白图片框。",
        paperExamples: "论文详解",
        computingExamples: "计算机专区",
        poetryExamples: "诗词赏析",
        intent: "视觉与内容意图（可选）",
        intentPlaceholder: "例如：古典诗词赏析，突出原文、逐句注释与留白，避免科技感卡片堆叠。",
        explain: "讲解",
        practice: "练习",
        explore: "探索",
        audio: "生成并播放讲稿音频",
        audioCopy: "内置案例直接提供音频；开启后，生成新内容时也会生成讲稿和 MP3。",
      }
    : {
        heading: "Generation settings",
        note: "These preferences are saved in this browser and customize your next generation.",
        templates: "Choose a generation template",
        templatesCopy: "Choose a difficulty and teaching style; components and reference lessons are matched automatically.",
        advanced: "Advanced customization",
        advancedCopy: "Expand only when you need to override the automatic choices. Manual changes become a custom configuration.",
        components: "Components available for this run",
        componentsCopy: "Choose the components available for this page. With none selected, only basic text and layout remain.",
        examples: "Reference examples",
        examplesCopy: "Templates select reference lessons automatically; use this only for an advanced override.",
        exampleUses: "Uses: ",
        theme: "Page style",
        themeCopy: "Changes the page color, typography, spacing, and card feel.",
        displayMode: "Display mode",
        displayModeCopy: "Standard keeps the full page; presentation paginates content and supports fullscreen and right-click navigation.",
        standardMode: "Standard page",
        standardModeCopy: "Continuous reading with the existing page tabs.",
        presentationMode: "Auto-paginated presentation",
        presentationModeCopy: "Fits the current content into 16:9 pages for presenting.",
        imageLimit: "Automatic image limit",
        imageLimitCopy: "Maximum atmospheric images created per generation. Requests over the limit are skipped without leaving empty image frames.",
        paperExamples: "Paper deep dives",
        computingExamples: "Computing",
        poetryExamples: "Poetry reading",
        intent: "Visual and content intent (optional)",
        intentPlaceholder: "For example: classical poetry analysis with prominent verses, line-by-line annotations, and generous whitespace.",
        explain: "Explain",
        practice: "Practice",
        explore: "Explore",
        audio: "Generate and play narration audio",
        audioCopy: "Bundled examples include audio; when enabled, new content also gets a script and MP3.",
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

  const templateOption = (template: (typeof GENERATION_TEMPLATES)[number]) => `
    <div class="generation-template-option">
      <label class="generation-template-copy">
        <input class="generation-template-input" type="radio" name="generation-template" value="${template.id}" ${profile.templateId === template.id ? "checked" : ""} />
        <span class="generation-template-details">
          <span class="generation-theme-label">${escapeHtml(template.label[lang])}</span>
          <span class="generation-theme-description">${escapeHtml(template.description[lang])}</span>
          <span class="generation-template-meta">${escapeHtml(templateDifficultyLabel(template, lang))}</span>
          <span class="generation-template-meta">${escapeHtml(`${lang === "zh" ? "课程系列：" : "Course series: "}${template.referencePackIds.map((id) => REFERENCE_PACKS.find((pack) => pack.id === id)?.label[lang] || id).join(lang === "zh" ? "、" : ", ") || (lang === "zh" ? "无" : "None")}`)}</span>
          <span class="generation-template-meta">${escapeHtml(`${lang === "zh" ? "参考案例：" : "Reference examples: "}${template.referenceExampleIds.map((id) => LOCAL_EXAMPLES.find((example) => example.id === id)?.label[lang] || id).join(lang === "zh" ? "、" : ", ")}`)}</span>
        </span>
      </label>
    </div>`;
  const templateOptions = (["computing", "poetry"] as const).map((scope) => {
    const label = scope === "computing"
      ? (lang === "zh" ? "计算机课程模板" : "Computer learning templates")
      : (lang === "zh" ? "诗词课程模板" : "Poetry learning templates");
    return `<section class="generation-template-scope"><p class="generation-template-scope-title">${label}</p><div class="generation-template-grid">${GENERATION_TEMPLATES.filter((template) => template.scope === scope).map(templateOption).join("")}</div></section>`;
  }).join("");

  const exampleCategoryLabels = {
    paper: copy.paperExamples,
    computing: copy.computingExamples,
    poetry: copy.poetryExamples,
  };
  const exampleOptions = (["paper", "computing", "poetry"] as const).map((category) => {
    const options = LOCAL_EXAMPLES.filter((example) => example.category === category).map((example) => {
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
    return options ? `<section class="generation-example-category"><p class="generation-component-group-title">${exampleCategoryLabels[category]}</p><div class="generation-example-grid">${options}</div></section>` : "";
  }).join("");

  return `
    <section class="generation-settings" aria-label="${copy.heading}">
      <div>
        <p class="generation-settings-heading">${copy.heading}</p>
        <p class="generation-settings-note">${copy.note}</p>
      </div>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.templates}</p>
        <p class="generation-settings-section-copy">${copy.templatesCopy}</p>
        <div class="generation-template-groups">${templateOptions}</div>
      </section>
      <details class="generation-advanced-settings">
        <summary>${copy.advanced}</summary>
        <p class="generation-advanced-copy">${copy.advancedCopy}</p>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.components} <span id="generation-enabled-count" class="generation-counter">${profile.enabledComponents.length}/${MAX_ENABLED_COMPONENTS}</span></p>
        <p class="generation-settings-section-copy">${copy.componentsCopy}</p>
        <div class="generation-component-groups">${componentGroups}</div>
      </section>
      <section class="generation-settings-section">
        <p class="generation-settings-section-title">${copy.examples} <span id="generation-example-count" class="generation-counter">${profile.exampleIds.length}/${MAX_EXAMPLE_CASES}</span></p>
        <p class="generation-settings-section-copy">${copy.examplesCopy}</p>
        <div class="generation-example-categories">${exampleOptions}</div>
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
        <label class="generation-theme-option">
          <input id="generation-audio-enabled" type="checkbox" ${isAudioEnabled() ? "checked" : ""} />
          <span class="generation-theme-copy">
            <span class="generation-theme-label">${copy.audio}</span>
            <span class="generation-theme-description">${copy.audioCopy}</span>
          </span>
        </label>
      </section>
      <section class="generation-settings-section">
        <label class="generation-settings-section-title" for="generation-image-limit">${copy.imageLimit}</label>
        <p class="generation-settings-section-copy">${copy.imageLimitCopy}</p>
        <input id="generation-image-limit" class="app-modal-input" type="number" min="0" max="${MAX_AUTO_GENERATED_IMAGES}" step="1" value="${profile.imageGenerationLimit}" inputmode="numeric" />
      </section>
      <section class="generation-settings-section">
        <label class="generation-settings-section-title" for="generation-visual-intent">${copy.intent}</label>
        <textarea id="generation-visual-intent" class="app-modal-input generation-intent-input" maxlength="500" placeholder="${escapeHtml(copy.intentPlaceholder)}">${escapeHtml(profile.visualIntent)}</textarea>
      </section>
      </details>
    </section>`;
}

export function profileFromSettingsInputs(): GenerationProfile {
  const enabledComponents = Array.from(document.querySelectorAll<HTMLInputElement>(".generation-component-input:checked"))
    .map((input) => input.dataset.componentId || "");
  const exampleIds = Array.from(document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked"))
    .map((input) => input.dataset.exampleId || "");
  const themeId = document.querySelector<HTMLInputElement>("input[name='generation-theme']:checked")?.value;
  const displayMode = document.querySelector<HTMLInputElement>("input[name='generation-display-mode']:checked")?.value;
  const templateId = document.querySelector<HTMLInputElement>("input[name='generation-template']:checked")?.value || "custom";
  const imageGenerationLimit = (document.getElementById("generation-image-limit") as HTMLInputElement | null)?.valueAsNumber;
  const visualIntent = (document.getElementById("generation-visual-intent") as HTMLTextAreaElement | null)?.value || "";
  const template = GENERATION_TEMPLATES.find((item) => item.id === templateId);
  return normalizeGenerationProfile({ version: 1, templateId, enabledComponents, exampleIds, referencePackIds: template?.referencePackIds || [], themeId, displayMode, imageGenerationLimit, visualIntent });
}

export function syncGenerationSettingsInputs(profile: GenerationProfile): void {
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
  document.querySelectorAll<HTMLInputElement>(".generation-template-input").forEach((input) => {
    input.checked = input.value === profile.templateId;
  });
  const imageLimit = document.getElementById("generation-image-limit") as HTMLInputElement | null;
  if (imageLimit) imageLimit.value = String(profile.imageGenerationLimit);
}

export function markSettingsAsCustom(): void {
  document.querySelectorAll<HTMLInputElement>(".generation-template-input").forEach((input) => {
    input.checked = false;
  });
}

export function getLocalExampleComponents(exampleId: string): string[] {
  return LOCAL_EXAMPLES.find((example) => example.id === exampleId)?.componentIds || [];
}

export function setExampleComponentInputs(componentIds: string[], checked: boolean): void {
  const ids = new Set(componentIds);
  document.querySelectorAll<HTMLInputElement>(".generation-component-input").forEach((input) => {
    if (ids.has(input.dataset.componentId || "")) {
      input.checked = checked;
    }
  });
}

export function clearExamplesUsingComponent(componentId: string): void {
  document.querySelectorAll<HTMLInputElement>(".generation-example-input:checked").forEach((input) => {
    if (getLocalExampleComponents(input.dataset.exampleId || "").includes(componentId)) {
      input.checked = false;
    }
  });
}
