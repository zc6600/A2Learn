export function injectBaseTheme(): void {
  if (document.getElementById("a2learn-base-theme")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "a2learn-base-theme";
  style.textContent = `
    html[data-a2learn-embed="1"] #app {
      max-width: none;
      padding: 0;
    }
    html[data-a2learn-embed="1"] .app-header {
      display: none;
    }
    html[data-a2learn-embed="1"] .viewer-main {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
    }
    :root {
      color-scheme: light !important;
      --app-bg: #ffffff;
      --app-text: #111827;
      --app-muted: #6b7280;
      --app-outline: #e5e7eb;
      --a2ui-font-family-title: "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      --a2ui-font-size-xs: 12px;
      --a2ui-font-size-s: 14px;
      --a2ui-font-size-m: 16px;
      --a2ui-font-size-l: 20px;
      --a2ui-font-size-xl: 26px;
      --a2ui-font-size-2xl: 34px;
      --a2ui-line-height-headings: 1.25;
      --a2ui-line-height-body: 1.65;
      --a2ui-spacing-xs: 6px;
      --a2ui-spacing-s: 10px;
      --a2ui-spacing-m: 16px;
      --a2ui-spacing-l: 24px;
      --a2ui-spacing-xl: 32px;
      --a2ui-border-radius: 16px;
      --a2ui-border-width: 1px;

      /* Portfolio Design Tokens (Teal Accent Matrix - Light Mode Baseline) */
      --a2ui-color-primary: #0d9488; /* Teal-600 */
      --a2ui-color-secondary: #0f766e; /* Teal-700 High-Contrast Secondary */
      --a2ui-color-surface: #ffffff;
      --a2ui-color-surface-subtle: #f9fafb; /* Gray-50 Neutral Surface */
      --a2ui-color-on-surface: #111827;
      --a2ui-color-on-background: #374151;
      --a2ui-color-border: #e5e7eb; /* Gray-200 */
      --a2ui-card-border: 1px solid var(--a2ui-color-border);
      --a2ui-card-border-radius: 16px;
      --a2ui-card-padding: 20px 24px;
      --a2ui-card-box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      --a2ui-card-margin: 0;
      --a2ui-column-gap: 16px;
      --a2ui-text-a-color: #0d9488;
      --a2ui-text-a-font-weight: 600;
    }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--app-bg);
      color: var(--app-text);
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    #app {
      box-sizing: border-box;
      max-width: 1200px;
      min-height: 100vh;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* Glassmorphic Navigation Header */
    .app-header {
      margin-bottom: 24px;
      padding: 20px 24px;
      border: 1px solid var(--a2ui-color-border);
      border-radius: 20px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 80%, transparent);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .app-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .app-brand {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .app-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--app-text);
    }
    .app-title .brand-teal {
      color: var(--a2ui-color-primary);
    }
    .app-subtitle {
      margin: 0;
      color: var(--app-muted);
      font-size: 13.5px;
      line-height: 1.5;
    }
    .app-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .lang-switch-group {
      display: inline-flex;
      background: color-mix(in oklab, var(--a2ui-color-surface) 92%, black);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 9999px;
      padding: 3px;
      gap: 2px;
    }
    .lang-btn {
      border: none;
      background: transparent;
      color: var(--app-muted);
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .lang-btn.active {
      background: var(--a2ui-color-primary);
      color: white;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
    .app-key-pill {
      font-size: 12px;
      font-family: "JetBrains Mono", monospace;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .app-key-pill.active {
      background: #f9fafb;
      color: #0d9488;
      border: 1px solid #e5e7eb;
    }
    .app-key-pill.missing {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .app-btn-icon {
      background: var(--a2ui-color-surface);
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .app-btn-icon:hover {
      border-color: var(--a2ui-color-primary);
      color: var(--a2ui-color-primary);
      transform: scale(1.03);
    }

    /* Prompt Input Bar (Clean Neutral Surface #f9fafb) & Hero Controls */
    .app-prompt-bar {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #f9fafb;
      padding: 16px;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
    }
    .app-prompt-form {
      display: flex;
      gap: 12px;
      width: 100%;
    }
    .app-prompt-input {
      flex: 1;
      background: var(--a2ui-color-surface);
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }
    .app-prompt-input:focus {
      border-color: var(--a2ui-color-primary);
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--a2ui-color-primary) 18%, transparent);
    }
    .app-submit-btn {
      background: var(--a2ui-color-primary);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      padding: 12px 22px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px color-mix(in oklab, var(--a2ui-color-primary) 25%, transparent);
    }
    .app-submit-btn:hover {
      filter: brightness(1.08);
      transform: scale(1.02);
    }
    .app-submit-btn:active {
      transform: scale(0.98);
    }
    .app-submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .app-presets {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12.5px;
      color: var(--app-muted);
    }
    .app-preset-chip {
      background: var(--a2ui-color-surface);
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .app-preset-chip:hover {
      border-color: var(--a2ui-color-primary);
      color: var(--a2ui-color-primary);
      transform: scale(1.04);
    }

    /* Example Showcase Strip (static, no API key required) */
    .examples-strip {
      margin-bottom: 20px;
    }
    .examples-strip-title {
      margin: 0 0 10px;
      font-size: 13px;
      font-weight: 700;
      color: var(--app-muted);
    }
    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }
    .example-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 14px;
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .example-card:hover {
      border-color: var(--a2ui-color-primary);
      box-shadow: 0 6px 18px color-mix(in oklab, var(--a2ui-color-primary) 14%, transparent);
      transform: translateY(-1px);
    }
    .example-card-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--app-text);
    }
    .example-card-desc {
      font-size: 12px;
      color: var(--app-muted);
      line-height: 1.4;
    }

    /* Modal Overlay */
    .app-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 1;
      transition: opacity 0.2s ease;
    }
    .app-modal-backdrop.hidden {
      display: none;
      opacity: 0;
      pointer-events: none;
    }
    .app-modal {
      background: var(--a2ui-color-surface);
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 20px;
      padding: 24px;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.24);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .app-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .app-modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
    }
    .app-modal-close {
      background: none;
      border: none;
      color: var(--app-muted);
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .app-modal-close:hover {
      color: var(--app-text);
      background: rgba(125, 125, 125, 0.12);
    }
    .app-modal-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      font-size: 13.5px;
      color: var(--app-muted);
      line-height: 1.5;
    }
    .app-modal-input {
      width: 100%;
      box-sizing: border-box;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, var(--a2ui-color-secondary));
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13.5px;
      font-family: monospace;
      outline: none;
    }
    .app-modal-input:focus {
      border-color: var(--a2ui-color-primary);
    }
    .app-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .app-btn-secondary {
      background: transparent;
      color: var(--app-muted);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .app-btn-secondary:hover {
      color: var(--app-text);
      background: rgba(125, 125, 125, 0.1);
    }
    .app-btn-primary {
      background: var(--a2ui-color-primary);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .app-btn-primary:hover {
      filter: brightness(1.1);
    }

    .viewer-main {
      padding: 16px;
      border-radius: 20px;
      border: 1px solid var(--app-outline);
      background: color-mix(in oklab, var(--a2ui-color-surface) 94%, transparent);
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
    }
    .viewer-state {
      margin: 12px 0;
      padding: 14px 16px;
      border: 1px solid var(--a2ui-color-border);
      border-radius: 14px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 86%, var(--a2ui-color-secondary));
      color: var(--a2ui-color-on-background);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .viewer-state.loading::before {
      content: "⏳ ";
      margin-right: 8px;
      font-weight: 600;
    }
    .viewer-state.error {
      border-color: color-mix(in oklab, #ef4444 44%, var(--a2ui-color-border));
      background: color-mix(in oklab, #ef4444 10%, var(--a2ui-color-surface));
    }
    pre, code {
      font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }
    pre {
      margin: 14px 0;
      padding: 16px 18px;
      border-radius: 12px;
      background: #1e2433;
      border: 1px solid #2d3652;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.65;
      overflow-x: auto;
      white-space: pre;
      word-break: normal;
      word-wrap: normal;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    }
    pre code {
      background: none;
      border: none;
      padding: 0;
      border-radius: 0;
      color: inherit;
      font-size: inherit;
    }
    code {
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
      font-size: 0.875em;
      border: 1px solid rgba(99, 102, 241, 0.18);
    }

    /* Term Tooltip Styling (Just-In-Time Glossary) */
    .a2learn-term-tooltip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #0d9488;
      font-weight: 600;
      text-decoration: underline dotted #0d9488;
      text-underline-offset: 4px;
      cursor: help;
      padding: 0 4px;
      border-radius: 4px;
      background: rgba(13, 148, 136, 0.05);
      transition: all 0.2s ease;
    }
    .a2learn-term-tooltip:hover,
    .a2learn-term-tooltip:focus {
      background: rgba(13, 148, 136, 0.12);
    }
    .a2learn-term-tooltip .term-badge {
      font-size: 11px;
      opacity: 0.75;
    }
    .a2learn-term-tooltip .tooltip-popup {
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      position: absolute;
      bottom: 130%;
      left: 50%;
      transform: translateX(-50%) translateY(6px);
      width: 250px;
      padding: 12px 14px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14);
      z-index: 999;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
      white-space: normal;
      font-weight: normal;
      text-decoration: none;
      color: #111827;
      line-height: 1.5;
    }
    .a2learn-term-tooltip .tooltip-popup::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: #ffffff transparent transparent transparent;
    }
    .a2learn-term-tooltip:hover .tooltip-popup,
    .a2learn-term-tooltip:focus .tooltip-popup {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
      transform: translateX(-50%) translateY(0);
    }
    .a2learn-term-tooltip .tooltip-title {
      font-size: 14px;
      font-weight: 800;
      color: #0d9488;
    }
    .a2learn-term-tooltip .tooltip-desc {
      font-size: 12.5px;
      line-height: 1.5;
      color: #374151;
      margin: 0;
    }
    .a2learn-term-tooltip .tooltip-explore-btn {
      margin-top: 4px;
      background: #f9fafb;
      color: #0d9488;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.2s ease;
    }
    .a2learn-term-tooltip .tooltip-explore-btn:hover {
      background: #0d9488;
      color: #ffffff;
      border-color: #0d9488;
    }
    @media (prefers-color-scheme: dark) {
      pre {
        background: #0d1117;
        border-color: #30363d;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }
      code {
        background: rgba(129, 140, 248, 0.15);
        color: #a5b4fc;
        border-color: rgba(129, 140, 248, 0.22);
      }
    }
    @media (max-width: 768px) {
      #app {
        padding: 14px 12px 24px;
      }
      .app-header {
        border-radius: 14px;
        padding: 14px;
      }
      .app-title {
        font-size: 20px;
      }
      .app-prompt-form {
        flex-direction: column;
      }
      .viewer-main {
        padding: 10px;
        border-radius: 14px;
      }
      :root {
        --a2ui-font-size-xl: 24px;
        --a2ui-font-size-2xl: 30px;
      }
    }
  `;
  document.head.appendChild(style);
}

export type AppLang = "zh" | "en";

export interface AppPreset {
  label: string;
  prompt: string;
}

export interface AppChromeStrings {
  promptPlaceholder: string;
  submitLabel: string;
  presetsLabel: string;
  presets: AppPreset[];
  settingsBtnLabel: string;
  settingsBtnTitle: string;
  keyPillMissingLabel: string;
  modalTitle: string;
  modalBodyIntroHtml: string;
  modalBodyFooter: string;
  modalClearLabel: string;
  modalSaveLabel: string;
}

const DEFAULT_CHROME_ZH: AppChromeStrings = {
  promptPlaceholder: "输入你想学习的知识主题（例如：解释 Hash Map 机制...）",
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
  modalClearLabel: "清空 Key",
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
        </div>
        <div class="app-modal-footer">
          <button id="app-modal-clear" class="app-btn-secondary">${chrome.modalClearLabel}</button>
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

export function renderExamplesStrip(title: string, items: ExampleCardItem[]): string {
  const cards = items
    .map(
      (item) => `
      <button class="example-card" type="button" data-example-id="${item.id}" data-messages-url="${item.messagesUrl}">
        <span class="example-card-title">${item.title}</span>
        <span class="example-card-desc">${item.description}</span>
      </button>`,
    )
    .join("");
  return `
    <section class="examples-strip" aria-label="${title}">
      <p class="examples-strip-title">${title}</p>
      <div class="examples-grid" id="examples-grid">${cards}</div>
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
