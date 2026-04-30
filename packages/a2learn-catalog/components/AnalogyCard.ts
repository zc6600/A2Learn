import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { AnalogyCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnAnalogyCardElement extends A2uiLitElement<typeof AnalogyCardApi> {
  static styles = css`
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
      overflow: hidden;
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
      font-weight: 700;
      color: var(--a2ui-color-primary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0;
    }
    .content {
      position: relative;
      z-index: 1;
      font-size: 16px;
      line-height: 1.7;
      color: var(--a2ui-color-on-surface);
      background: rgba(255, 255, 255, 0.6);
      padding: 16px;
      border-radius: 12px;
      backdrop-filter: blur(4px);
    }
    /* Style markdown elements inside analogy */
    .content p {
      margin-top: 0;
    }
    .content p:last-child {
      margin-bottom: 0;
    }
    .content strong {
      color: var(--a2ui-color-primary);
    }
  `;

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
    const escaped = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const withStrong = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    const withParagraphs = withStrong
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    return withParagraphs || "<p></p>";
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title) || "打个比方";
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
