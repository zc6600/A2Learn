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
      color-scheme: light;
      --app-bg: linear-gradient(180deg, #f5f8ff 0%, #eef3ff 100%);
      --app-text: #101828;
      --app-muted: #475467;
      --app-outline: rgba(99, 102, 241, 0.2);
      --a2ui-font-family-title: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
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
      --a2ui-spacing-m: 14px;
      --a2ui-spacing-l: 20px;
      --a2ui-spacing-xl: 28px;
      --a2ui-border-radius: 14px;
      --a2ui-border-width: 1px;
      --a2ui-color-primary: #4f46e5;
      --a2ui-color-secondary: #e4e7ff;
      --a2ui-color-surface: #ffffff;
      --a2ui-color-on-surface: #0f172a;
      --a2ui-color-on-background: #1f2937;
      --a2ui-color-border: #d7defa;
      --a2ui-card-border: 1px solid var(--a2ui-color-border);
      --a2ui-card-border-radius: 16px;
      --a2ui-card-padding: 16px 18px;
      --a2ui-card-box-shadow: 0 10px 30px rgba(79, 70, 229, 0.08);
      --a2ui-card-margin: 0;
      --a2ui-column-gap: 14px;
      --a2ui-text-a-color: #4338ca;
      --a2ui-text-a-font-weight: 600;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --app-bg: linear-gradient(180deg, #0b1220 0%, #121a2b 100%);
        --app-text: #e2e8f0;
        --app-muted: #94a3b8;
        --app-outline: rgba(129, 140, 248, 0.32);
        --a2ui-color-primary: #818cf8;
        --a2ui-color-secondary: #232b43;
        --a2ui-color-surface: #111827;
        --a2ui-color-on-surface: #e5e7eb;
        --a2ui-color-on-background: #cbd5e1;
        --a2ui-color-border: #2b354f;
        --a2ui-card-box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      }
    }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--app-bg);
      color: var(--app-text);
      font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 12% 10%, rgba(99, 102, 241, 0.2), transparent 38%),
        radial-gradient(circle at 86% 6%, rgba(14, 165, 233, 0.16), transparent 34%);
      pointer-events: none;
      z-index: -1;
    }
    #app {
      box-sizing: border-box;
      max-width: 1200px;
      min-height: 100vh;
      margin: 0 auto;
      padding: 20px;
    }
    .app-header {
      margin-bottom: 20px;
      padding: 20px 24px;
      border: 1px solid var(--app-outline);
      border-radius: 20px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 92%, transparent);
      backdrop-filter: blur(12px);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 16px;
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
      letter-spacing: -0.3px;
      background: linear-gradient(135deg, var(--a2ui-color-primary) 0%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .app-subtitle {
      margin: 0;
      color: var(--app-muted);
      font-size: 13.5px;
      line-height: 1.4;
    }
    .app-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .app-key-pill {
      font-size: 12px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .app-key-pill.active {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .app-key-pill.missing {
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }
    .app-btn-icon {
      background: color-mix(in oklab, var(--a2ui-color-surface) 90%, var(--a2ui-color-secondary));
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .app-btn-icon:hover {
      border-color: var(--a2ui-color-primary);
      color: var(--a2ui-color-primary);
      transform: translateY(-1px);
    }

    /* Prompt Input Bar & Hero Controls */
    .app-prompt-bar {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 96%, var(--a2ui-color-secondary));
      padding: 14px 16px;
      border-radius: 14px;
      border: 1px solid var(--a2ui-color-border);
    }
    .app-prompt-form {
      display: flex;
      gap: 10px;
      width: 100%;
    }
    .app-prompt-input {
      flex: 1;
      background: var(--a2ui-color-surface);
      color: var(--app-text);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }
    .app-prompt-input:focus {
      border-color: var(--a2ui-color-primary);
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--a2ui-color-primary) 15%, transparent);
    }
    .app-submit-btn {
      background: var(--a2ui-color-primary);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px color-mix(in oklab, var(--a2ui-color-primary) 30%, transparent);
    }
    .app-submit-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-1px);
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
      border-radius: 16px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .app-preset-chip:hover {
      border-color: var(--a2ui-color-primary);
      color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 8%, var(--a2ui-color-surface));
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

export function renderAppFrame(
  root: HTMLElement,
  title: string,
  subtitle: string,
  contentHtml: string,
): void {
  root.innerHTML = `
    <header class="app-header">
      <div class="app-header-top">
        <div class="app-brand">
          <h1 class="app-title">${title}</h1>
          <p class="app-subtitle">${subtitle}</p>
        </div>
        <div class="app-actions">
          <span id="app-key-pill" class="app-key-pill missing">
            🔑 API Key 待配置
          </span>
          <button id="app-settings-btn" class="app-btn-icon" title="设置 OpenRouter API Key">
            ⚙️ 设置 API Key
          </button>
        </div>
      </div>

      <div class="app-prompt-bar">
        <form id="app-prompt-form" class="app-prompt-form">
          <input
            id="app-prompt-input"
            type="text"
            class="app-prompt-input"
            placeholder="输入你想学习的知识主题（例如：解释 Hash Map 机制...）"
            autocomplete="off"
          />
          <button id="app-prompt-submit" type="submit" class="app-submit-btn">
            ⚡ 实时生成 Showcase
          </button>
        </form>
        <div class="app-presets">
          <span>热门推荐：</span>
          <button class="app-preset-chip" data-preset="Explain how a Hash Map works step by step in detail with visual mental model and code example">Hash Map 原理</button>
          <button class="app-preset-chip" data-preset="Explain the Transformer architecture and attention mechanism in deep learning">Transformer 架构</button>
          <button class="app-preset-chip" data-preset="Explain HTTP/3 protocol QUIC features and advantages over HTTP/2">HTTP/3 协议</button>
          <button class="app-preset-chip" data-preset="Explain the Three Body Problem orbital dynamics in astrophysics">三体星系天体物理</button>
        </div>
      </div>
    </header>

    <!-- Modal for Settings -->
    <div id="app-settings-modal" class="app-modal-backdrop hidden">
      <div class="app-modal">
        <div class="app-modal-header">
          <h3 class="app-modal-title">⚙️ 配置 API Key (BYOK 模式)</h3>
          <button id="app-modal-close" class="app-modal-close">✕</button>
        </div>
        <div class="app-modal-body">
          <p>
            输入你的 <strong>OpenRouter API Key</strong>。你的 Key 将仅保存在浏览器本地（<code>localStorage</code>），每次交互时透传给后端，绝不上交服务器保存。
          </p>
          <input
            id="app-api-key-input"
            type="password"
            class="app-modal-input"
            placeholder="sk-or-v1-xxxxxxxxxxxxxxxx"
            autocomplete="off"
          />
          <p style="font-size: 12px; color: var(--app-muted);">
            无 API Key？你也可以直接点击主页顶部的热门推荐，预览预置的精美 Showcase。
          </p>
        </div>
        <div class="app-modal-footer">
          <button id="app-modal-clear" class="app-btn-secondary">清空 Key</button>
          <button id="app-modal-save" class="app-btn-primary">保存配置</button>
        </div>
      </div>
    </div>

    <main class="viewer-main">${contentHtml}</main>
  `;
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
