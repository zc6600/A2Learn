import componentStyles from "../styles/components/AnalogyCard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { AnalogyCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnAnalogyCardElement extends A2uiLitElement<typeof AnalogyCardApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
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
          `<pre class="a2learn-analogy-code"><code>${escapedCode}</code></pre>`
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
