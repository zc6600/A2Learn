import {
  GENERATION_COMPONENTS,
  GENERATION_TEMPLATES,
  LOCAL_EXAMPLES,
  MAX_AUTO_GENERATED_IMAGES,
  MAX_ENABLED_COMPONENTS,
  MAX_EXAMPLE_CASES,
  RENDER_THEMES,
  normalizeGenerationProfile,
  type GenerationProfile,
  type Lang,
} from "./generation-profile";

const AUDIO_ENABLED_STORAGE_KEY = "a2learn.audio.enabled";
const STATIC_EXAMPLE_AUDIO: Record<string, Partial<Record<Lang, string>>> = {
  "hash-table": { zh: "/examples/audio/hash-table.zh.mp3" },
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
  return STATIC_EXAMPLE_AUDIO[exampleId]?.[language] || null;
}

export function generationSettingsHtml(lang: Lang, profile: GenerationProfile): string {
  const copy = lang === "zh"
    ? {
        heading: "生成配置",
        note: "这些偏好会保存在当前浏览器，并用于定制下一次生成。",
        templates: "选择生成模板",
        templatesCopy: "先选一个与你的内容最接近的模板；它会自动配置组件、案例和页面风格。",
        preview: "预览",
        advanced: "高级自定义",
        advancedCopy: "需要精细控制时，再展开修改组件、案例、风格和配图预算。修改后会成为自定义配置。",
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
        audioCopy: "开启后，选择案例时会额外生成一份完整讲稿和 MP3。",
      }
    : {
        heading: "Generation settings",
        note: "These preferences are saved in this browser and customize your next generation.",
        templates: "Choose a generation template",
        templatesCopy: "Start with the template closest to your content. It configures components, references, and page style together.",
        preview: "Preview",
        advanced: "Advanced customization",
        advancedCopy: "Expand only when you need to tune components, references, style, or the image budget. Changes become a custom configuration.",
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
        audioCopy: "When enabled, selecting a case also generates a complete script and MP3.",
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

  const templateOptions = GENERATION_TEMPLATES.map((template) => `
    <div class="generation-template-option">
      <label class="generation-template-copy">
        <input class="generation-template-input" type="radio" name="generation-template" value="${template.id}" ${profile.templateId === template.id ? "checked" : ""} />
        <span>
          <span class="generation-theme-label">${escapeHtml(template.label[lang])}</span>
          <span class="generation-theme-description">${escapeHtml(template.description[lang])}</span>
        </span>
      </label>
      <button class="generation-template-preview" type="button" data-template-preview="${template.id}">${copy.preview}</button>
    </div>`).join("");

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
        <div class="generation-template-grid">${templateOptions}</div>
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
  return normalizeGenerationProfile({ version: 1, templateId, enabledComponents, exampleIds, themeId, displayMode, imageGenerationLimit, visualIntent });
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
