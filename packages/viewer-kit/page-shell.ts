import "./styles/index.css";

/**
 * Styles are bundled from ./styles. This remains an idempotent compatibility
 * hook for existing viewer entry points.
 */
export function injectBaseTheme(): void {
  document.documentElement.dataset.a2learnTheme ||= "learning-default";
}

export type AppLang = "zh" | "en";

export interface AppPreset {
  label: string;
  prompt: string;
}

export interface AppChromeStrings {
  promptPlaceholder: string;
  sourceLibraryLabel: string;
  sourceLibraryTitle: string;
  submitLabel: string;
  presetsLabel: string;
  presets: AppPreset[];
  settingsBtnLabel: string;
  settingsBtnTitle: string;
  keyPillMissingLabel: string;
  modalTitle: string;
  modalBodyIntroHtml: string;
  modalBodyFooter: string;
  modalSaveLabel: string;
  settingsContentHtml?: string;
}

const DEFAULT_CHROME_ZH: AppChromeStrings = {
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
  settingsBtnLabel: "⚙️ API Key",
  settingsBtnTitle: "设置 OpenRouter API Key",
  keyPillMissingLabel: "🔑 API Key 待配置",
  modalTitle: "⚙️ 配置 API Key (BYOK 模式)",
  modalBodyIntroHtml:
    "输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将仅保存在浏览器本地（<code>localStorage</code>），每次交互时透传给后端，绝不上交服务器保存。",
  modalBodyFooter: "无 API Key？你也可以直接点击主页顶部的热门推荐，预览预置的精美 Showcase。",
  modalSaveLabel: "保存配置",
};

export function renderAppFrame(
  root: HTMLElement,
  title: string,
  subtitle: string,
  contentHtml: string,
  options?: { lang?: AppLang; chrome?: AppChromeStrings },
): void {
  const lang = options?.lang ?? "zh";
  const chrome = options?.chrome ?? DEFAULT_CHROME_ZH;

  const presetChips = chrome.presets
    .map((p) => `<button class="app-preset-chip" data-preset="${p.prompt.replace(/"/g, "&quot;")}">${p.label}</button>`)
    .join("");

  root.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <div class="app-brand">
          <h1 class="app-title">${title.replace(/A2Learn/g, '<span class="brand-teal">A2</span>Learn')}</h1>
          <p class="app-subtitle">${subtitle}</p>
        </div>
        <div class="app-actions">
          <div id="app-lang-switcher" class="lang-switch-group">
            <button id="lang-zh-btn" class="lang-btn${lang === "zh" ? " active" : ""}">中文</button>
            <button id="lang-en-btn" class="lang-btn${lang === "en" ? " active" : ""}">English</button>
          </div>
          <span id="app-key-pill" class="app-key-pill missing">
            ${chrome.keyPillMissingLabel}
          </span>
          <button id="app-settings-btn" class="app-btn-icon" title="${chrome.settingsBtnTitle}">
            ${chrome.settingsBtnLabel}
          </button>
        </div>
      </div>

      <div class="app-prompt-bar">
        <form id="app-prompt-form" class="app-prompt-form">
          <input
            id="app-prompt-input"
            type="text"
            class="app-prompt-input"
            placeholder="${chrome.promptPlaceholder}"
            autocomplete="off"
          />
          <button id="app-source-library-btn" type="button" class="app-btn-icon app-source-library-btn" title="${chrome.sourceLibraryTitle}">
            ${chrome.sourceLibraryLabel}
          </button>
          <button id="app-prompt-submit" type="submit" class="app-submit-btn">
            ${chrome.submitLabel}
          </button>
        </form>
        <div class="app-presets">
          <span>${chrome.presetsLabel}</span>
          ${presetChips}
        </div>
      </div>
    </header>

    <!-- Modal for Settings -->
    <div id="app-settings-modal" class="app-modal-backdrop hidden">
      <div class="app-modal">
        <div class="app-modal-header">
          <h3 class="app-modal-title">${chrome.modalTitle}</h3>
          <button id="app-modal-close" class="app-modal-close">✕</button>
        </div>
        <div class="app-modal-body">
          <p>${chrome.modalBodyIntroHtml}</p>
          <input
            id="app-api-key-input"
            type="password"
            class="app-modal-input"
            placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
            autocomplete="off"
          />
          <p style="font-size: 12px; color: var(--app-muted);">
            ${chrome.modalBodyFooter}
          </p>
          ${chrome.settingsContentHtml || ""}
        </div>
        <div class="app-modal-footer">
          <button id="app-modal-save" class="app-btn-primary">${chrome.modalSaveLabel}</button>
        </div>
      </div>
    </div>

    <main class="viewer-main">${contentHtml}</main>
  `;
}

export interface ExampleCardItem {
  id: string;
  title: string;
  description: string;
  messagesUrl: string;
}

export interface ExampleCardGroup {
  id: string;
  title: string;
  description: string;
  items: ExampleCardItem[];
}

export function renderExamplesStrip(title: string, groups: ExampleCardGroup[], showGroupHeadings = true): string {
  const sections = groups.map((group) => {
    const cards = group.items.map((item) => `
      <button class="example-card" type="button" data-example-id="${item.id}" data-messages-url="${item.messagesUrl}">
        <span class="example-card-title">${item.title}</span>
        <span class="example-card-desc">${item.description}</span>
      </button>`).join("");
    return `<section class="examples-category" aria-label="${group.title}">
      ${showGroupHeadings ? `<div class="examples-category-heading">
        <span class="examples-category-title">${group.title}</span>
        <span class="examples-category-description">${group.description}</span>
      </div>` : ""}
      <div class="examples-grid">${cards}</div>
    </section>`;
  }).join("");
  return `
    <section class="examples-strip" data-example-gallery aria-label="${title}">
      ${title ? `<p class="examples-strip-title">${title}</p>` : ""}
      <div class="examples-groups">${sections}</div>
    </section>`;
}

export function showState(
  container: HTMLElement,
  message: string,
  type: "loading" | "error" | "empty" = "empty",
): void {
  const cls =
    type === "loading"
      ? "viewer-state loading"
      : type === "error"
        ? "viewer-state error"
        : "viewer-state";
  container.innerHTML = `<p class="${cls}"></p>`;
  const paragraph = container.querySelector("p");
  if (paragraph) {
    paragraph.textContent = message;
  }
}
