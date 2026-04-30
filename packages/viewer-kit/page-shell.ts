export function injectBaseTheme(): void {
  if (document.getElementById("a2learn-base-theme")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "a2learn-base-theme";
  style.textContent = `
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
      margin-bottom: 14px;
      padding: 14px 16px;
      border: 1px solid var(--app-outline);
      border-radius: 16px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 90%, transparent);
      backdrop-filter: blur(4px);
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
    }
    .app-title {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .app-subtitle {
      margin: 6px 0 0;
      color: var(--app-muted);
      font-size: 14px;
      line-height: 1.5;
    }
    .viewer-main {
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--app-outline);
      background: color-mix(in oklab, var(--a2ui-color-surface) 92%, transparent);
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
      content: "正在加载";
      margin-right: 8px;
      font-weight: 600;
      color: var(--a2ui-color-primary);
    }
    .viewer-state.error {
      border-color: color-mix(in oklab, #ef4444 44%, var(--a2ui-color-border));
      background: color-mix(in oklab, #ef4444 10%, var(--a2ui-color-surface));
    }
    @media (max-width: 768px) {
      #app {
        padding: 14px 12px 24px;
      }
      .app-header {
        border-radius: 14px;
      }
      .app-title {
        font-size: 20px;
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
      <h1 class="app-title">${title}</h1>
      <p class="app-subtitle">${subtitle}</p>
    </header>
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
