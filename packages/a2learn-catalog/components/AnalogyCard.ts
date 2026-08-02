import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { AnalogyCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnAnalogyCardElement extends A2uiLitElement<typeof AnalogyCardApi> {
  static styles = [
    tooltipStyles,
    css`
      :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .analogy-container {
      position: relative;
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, var(--a2ui-color-surface));
      border: 1px dashed color-mix(in oklab, var(--a2ui-color-primary) 40%, transparent);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
      overflow: visible;
    }
    /* Playful decorative quote mark */
    .analogy-container::before {
      content: "”";
      position: absolute;
      top: -20px;
      right: 20px;
      font-size: 120px;
      font-family: serif;
      color: color-mix(in oklab, var(--a2ui-color-primary) 10%, transparent);
      line-height: 1;
      pointer-events: none;
      z-index: 0;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .icon {
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .title {
      font-size: 16px;
      font-weight: 800;
      color: var(--a2ui-color-primary, #0d9488);
      letter-spacing: 0.5px;
      margin: 0;
    }
    .content {
      position: relative;
      z-index: 1;
      font-size: 16px;
      line-height: 1.7;
      color: var(--a2ui-color-on-surface, #111827);
      background: var(--a2ui-color-surface-subtle, #f9fafb);
      border: 1px solid var(--a2ui-color-border, #e5e7eb);
      padding: 16px;
      border-radius: 12px;
    }
    /* Style markdown elements inside analogy */
    .content p {
      margin-top: 0;
      color: var(--a2ui-color-on-surface, #111827);
    }
    .content p:last-child {
      margin-bottom: 0;
    }
    .content strong, .content b {
      color: var(--a2ui-color-primary, #0d9488);
      font-weight: 700;
    }
    .content hr {
      border: none;
      border-top: 1px dashed var(--a2ui-color-border, #cbd5e1);
      margin: 16px 0;
    }
    .terms-section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed var(--a2ui-color-border, #cbd5e1);
    }
    .terms-section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--a2ui-color-primary, #0d9488);
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `
];

  protected createController() {
    return new A2uiController(this, AnalogyCardApi);
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

  // Lightweight markdown rendering for gallery/static mode.
  private renderInlineMarkdown(markdown: string): string {
    if (!markdown) return "";

    // Some generated analogies contain source code but omit Markdown fences.
    // Normalize the common JavaScript/CSS shapes before paragraph rendering so
    // the code remains a multiline code block instead of becoming one sentence.
    markdown = markdown
      .replace(
        /(\nfor \(var i = 0;[\s\S]*?\n\})(\n?)(?=(?:实际输出|Actual output))/m,
        "\n```javascript$1\n```\n"
      )
      .replace(
        /(\n\/\*[\s\S]*?\*\/)(\n?)(?=(?:CSS Grid|CSS Grid is))/m,
        "\n```css$1\n```\n"
      );

    const codeBlocks: string[] = [];

    // 1) Extract fenced code blocks into placeholders first, so \\n\\n inside them
    // doesn't cause paragraph splitting to leave orphaned tags.
    let htmlStr = markdown.replace(
      /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n?([\s\S]*?)\r?\n?```/g,
      (_match, lang: string, code: string) => {
        const langLabel = (lang || "text").trim().toLowerCase();
        const escapedCode = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const placeholder = `\x1aCODE_${codeBlocks.length}\x1a`;
        codeBlocks.push(
          `<pre style="background:#0f172a;color:#e2e8f0;padding:12px 16px;border-radius:8px;overflow-x:auto;margin:10px 0;font-family:ui-monospace,monospace;font-size:0.88em;line-height:1.6"><code>${escapedCode}</code></pre>`
        );
        return placeholder;
      }
    );

    // 2) Handle raw <pre>...</pre> tags in input
    htmlStr = htmlStr.replace(
      /<pre(?:\s+[^>]*)?>([\s\S]*?)<\/pre>/gi,
      (match) => {
        const placeholder = `\x1aCODE_${codeBlocks.length}\x1a`;
        codeBlocks.push(match);
        return placeholder;
      }
    );

    // 3) Bold / <b> conversion
    htmlStr = htmlStr
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/<b>/gi, "<strong>")
      .replace(/<\/b>/gi, "</strong>");

    // 4) Paragraph splitting — placeholders are never wrapped in <p>
    const paragraphs = htmlStr
      .split(/\n{2,}/)
      .map((p) => {
        const trimmed = p.trim();
        if (trimmed.startsWith("\x1aCODE_")) return trimmed;
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    // 5) Restore code blocks
    let result = paragraphs;
    codeBlocks.forEach((block, idx) => {
      result = result.replace(`\x1aCODE_${idx}\x1a`, block);
    });

    return result || "<p></p>";
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title) || uiText("打个比方", "An Analogy");
    const icon = this.resolveString(props.icon) || "💡";
    const analogy = this.resolveString(props.analogy);
    const renderedAnalogy = this.renderInlineMarkdown(analogy);

    return html`
      <div class="analogy-container">
        <div class="header">
          <div class="icon">${icon}</div>
          <h4 class="title">${title}</h4>
        </div>
        <div class="content">
          ${unsafeHTML(sanitizeHtml(renderedAnalogy))}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-analogy-card")) {
  customElements.define("a2learn-analogy-card", A2learnAnalogyCardElement as any);
}

export const A2learnAnalogyCard = {
  ...AnalogyCardApi,
  tagName: "a2learn-analogy-card",
};
