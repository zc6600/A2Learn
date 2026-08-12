import "./styles/index.css";

/**
 * Styles are bundled from ./styles. This remains an idempotent compatibility
 * hook for existing viewer entry points.
 */
export function injectBaseTheme(): void {
  document.documentElement.dataset.a2learnTheme ||= "learning-default";
}

export type AppLang = "zh" | "en";

export interface AppChromeStrings {
  promptPlaceholder: string;
  sourceLibraryLabel: string;
  sourceLibraryTitle: string;
  submitLabel: string;
  settingsBtnLabel: string;
  settingsBtnTitle: string;
  keyPillMissingLabel: string;
  modalTitle: string;
  modalBodyIntroHtml: string;
  modalBodyFooter: string;
  modalSaveLabel: string;
  settingsContentHtml?: string;
}

export function renderAppFrame(
  root: HTMLElement,
  title: string,
  subtitle: string,
  contentHtml: string,
  options?: { lang?: AppLang; chrome?: AppChromeStrings },
): void {
  const lang = options?.lang ?? "zh";
  const chrome = options?.chrome;

  const headerActionsHtml = chrome
    ? `
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
      `
    : "";

  const promptBarHtml = chrome
    ? `
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
      </div>
    `
    : "";

  const modalHtml = chrome
    ? `
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
    `
    : "";

  root.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <div class="app-brand">
          <h1 class="app-title">${title.replace(/A2Learn/g, '<span class="brand-teal">A2</span>Learn')}</h1>
          <p class="app-subtitle">${subtitle}</p>
        </div>
        ${headerActionsHtml}
      </div>

      ${promptBarHtml}
    </header>

    ${modalHtml}

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
