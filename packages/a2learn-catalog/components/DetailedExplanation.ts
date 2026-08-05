import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DetailedExplanationApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnDetailedExplanationElement extends A2uiLitElement<typeof DetailedExplanationApi> {
  static styles = [
    tooltipStyles,
    css`
      :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family-title, var(--a2ui-font-family, sans-serif));
    }
    .explanation-card {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: var(--a2ui-border-radius, 16px);
      background: var(--a2ui-color-surface, #ffffff);
      padding: var(--a2ui-spacing-xl, 32px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      position: relative;
      transition: all 0.3s ease;
    }
    .explanation-card:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    }
    .meta-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, var(--a2ui-color-surface, #ffffff));
      color: var(--a2ui-color-primary, #3b82f6);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .icon {
      font-size: 24px;
    }
    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--a2ui-color-on-surface, #1e293b);
      letter-spacing: -0.5px;
      font-family: var(--a2ui-font-family-title, var(--a2ui-font-family, sans-serif));
    }
    .content-body {
      font-size: 16px;
      line-height: 1.8;
      color: var(--a2ui-color-on-surface, #334155);
      font-family: var(--a2ui-font-family-title, var(--a2ui-font-family, sans-serif));
      text-align: var(--a2learn-detailed-content-align, start);
    }
    .content-body.centered {
      text-align: center;
    }
    .content-body.centered blockquote {
      text-align: left;
    }
    .content-body p {
      margin: 0 0 6px 0;
      line-height: 1.6;
    }
    .content-body p:last-child {
      margin-bottom: 0;
    }
    .content-body strong {
      color: inherit;
      font-weight: 700;
    }
    .content-body ul, .content-body ol {
      margin: 4px 0 8px 0;
      padding-left: 20px;
    }
    .content-body p + ul,
    .content-body p + ol {
      margin-top: 2px;
    }
    .content-body ul + p,
    .content-body ol + p {
      margin-top: 6px;
    }
    .content-body li {
      margin-bottom: 3px;
      line-height: 1.55;
    }
    .content-body li:last-child {
      margin-bottom: 0;
    }
    .content-body code {
      font-family: ui-monospace, "JetBrains Mono", "Fira Code", "Cascadia Code",
        Menlo, Consolas, "Courier New", monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: #f3f4f6;
      color: var(--a2ui-color-primary, #0d9488);
      font-size: 0.9em;
      border: 1px solid #e5e7eb;
    }
    .content-body pre {
      background: #0f172a;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .content-body pre code {
      background: transparent;
      border: none;
      color: inherit;
      padding: 0;
      font-size: 0.92em;
    }
    .code-block {
      margin: 18px 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #1e293b;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
    }
    .code-block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 6px 14px;
      background: #1e293b;
      border-bottom: 1px solid #2d3b52;
    }
    .code-block-lang {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #7dd3fc;
    }
    .code-copy-btn {
      background: none;
      border: 1px solid #3c4a63;
      color: #94a3b8;
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 5px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    .code-copy-btn:hover {
      color: #e2e8f0;
      border-color: #60a5fa;
    }
    .code-copy-btn.copied {
      color: #34d399;
      border-color: #34d399;
    }
    .code-block pre {
      margin: 0;
      border-radius: 0;
      font-family: ui-monospace, "JetBrains Mono", "Fira Code", "Cascadia Code",
        Menlo, Consolas, "Courier New", monospace;
      line-height: 1.6;
    }
    .content-body blockquote {
      margin: 12px 0;
      padding: 8px 16px;
      border-left: 4px solid var(--a2ui-color-primary, #0d9488);
      background: #f9fafb;
      color: var(--a2ui-color-on-surface, #111827);
      border-radius: 0 8px 8px 0;
    }
  `
];

  protected createController() {
    return new A2uiController(this, DetailedExplanationApi);
  }

  // Code-block copy buttons live inside unsafeHTML-rendered markdown, so they
  // aren't Lit templates and can't take a @click binding directly. Delegate
  // from the wrapping .content-body div instead, which Lit does control.
  private async handleContentClick(e: Event) {
    const target = e.target as HTMLElement;
    const btn = target.closest(".code-copy-btn") as HTMLButtonElement | null;
    if (!btn) return;

    const codeEl = btn.closest(".code-block")?.querySelector("code");
    if (!codeEl) return;

    try {
      await navigator.clipboard.writeText(codeEl.textContent || "");
      const original = btn.textContent;
      btn.textContent = uiText("已复制", "Copied");
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original || uiText("复制", "Copy");
        btn.classList.remove("copied");
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently.
    }
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (
      value &&
      typeof value === "object" &&
      "literalString" in (value as Record<string, unknown>)
    ) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private renderMarkdown(markdown: string): string {
    if (!markdown) return "";

    const codeBlocks: string[] = [];

    // 1) Extract code blocks (both ```lang ... ``` and raw <pre><code>...</code></pre>)
    // into placeholders FIRST, so that double newlines (\n\n) inside code blocks
    // do not break paragraph splitting into orphaned tags like </code></pre>.
    let htmlContent = markdown.replace(
      /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n?([\s\S]*?)\r?\n?```/g,
      (_match, lang: string, code: string) => {
        const langLabel = (lang || "text").trim().toLowerCase();
        const escapedCode = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const placeholder = `\x1aCODEBLOCK_${codeBlocks.length}\x1a`;
        codeBlocks.push(
          `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${langLabel}</span><button type="button" class="code-copy-btn">${uiText("复制", "Copy")}</button></div><pre><code class="language-${langLabel}">${escapedCode}</code></pre></div>`
        );
        return placeholder;
      }
    );

    // Handle any raw <pre><code>...</code></pre> or <pre>...</pre> tags in input
    htmlContent = htmlContent.replace(
      /<pre(?:\s+[^>]*)?>[\s\S]*?<\/pre>/gi,
      (match) => {
        const placeholder = `\x1aCODEBLOCK_${codeBlocks.length}\x1a`;
        codeBlocks.push(match);
        return placeholder;
      }
    );

    // 2) Replace bold tags
    htmlContent = htmlContent
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/<b>/gi, "<strong>")
      .replace(/<\/b>/gi, "</strong>");

    // 3) Replace inline code `code`
    htmlContent = htmlContent.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 4) Parse blockquotes
    htmlContent = htmlContent
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("&gt;")) {
          return `<blockquote>${line.trim().substring(4).trim()}</blockquote>`;
        }
        return line;
      })
      .join("\n");

    // 5) Parse bullet points
    let inList = false;
    const lines = htmlContent.split("\n");
    const outputLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ") ||
        trimmed.startsWith("• ")
      ) {
        if (!inList) {
          outputLines.push("<ul>");
          inList = true;
        }
        const text = trimmed.replace(/^[-*•]\s*/, "");
        outputLines.push(`<li>${text}</li>`);
      } else if (trimmed === "" && inList) {
        const nextLine = lines.slice(i + 1).find((l) => l.trim().length > 0);
        if (
          nextLine &&
          (nextLine.trim().startsWith("- ") ||
            nextLine.trim().startsWith("* ") ||
            nextLine.trim().startsWith("• "))
        ) {
          continue;
        } else {
          outputLines.push("</ul>");
          inList = false;
        }
      } else {
        if (inList) {
          outputLines.push("</ul>");
          inList = false;
        }
        outputLines.push(line);
      }
    }
    if (inList) outputLines.push("</ul>");
    htmlContent = outputLines.join("\n");

    // 6) Split paragraphs
    htmlContent = htmlContent
      .split(/\n{2,}/)
      .map((p) => {
        const trimmed = p.trim();
        if (
          trimmed.startsWith("<ul>") ||
          trimmed.startsWith("<pre>") ||
          trimmed.startsWith("<blockquote>") ||
          trimmed.startsWith('<div class="code-block"') ||
          trimmed.startsWith("\x1aCODEBLOCK_")
        ) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    // 7) Restore code block placeholders
    codeBlocks.forEach((block, idx) => {
      const placeholder = `\x1aCODEBLOCK_${idx}\x1a`;
      htmlContent = htmlContent.replace(placeholder, block);
    });

    return htmlContent;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "";
    const content = this.resolveString(props.content);
    const icon = props.icon ? this.resolveString(props.icon) : "";

    const parsedContent = this.renderMarkdown(content);
    const centered = props.contentAlign === "center";

    return html`
      <div class="explanation-card">
        ${title || icon
          ? html`
              <div class="header">
                ${icon ? html`<span class="icon">${icon}</span>` : nothing}
                ${title ? html`<h2 class="title">${title}</h2>` : nothing}
              </div>
            `
          : nothing}

            <div class="content-body ${centered ? "centered" : ""}" @click=${this.handleContentClick}>
          ${unsafeHTML(sanitizeHtml(parsedContent))}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-detailed-explanation")) {
  customElements.define("a2learn-detailed-explanation", A2learnDetailedExplanationElement as any);
}

export const A2learnDetailedExplanation = {
  ...DetailedExplanationApi,
  tagName: "a2learn-detailed-explanation",
};
