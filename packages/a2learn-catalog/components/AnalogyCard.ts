import componentStyles from "../styles/components/AnalogyCard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
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

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title) || uiText("打个比方", "An Analogy");
    const analogy = this.resolveString(props.analogy);

    return html`
      <div class="analogy-container">
        <div class="header">
          <h4 class="title">${title}</h4>
        </div>
        <div class="content a2learn-markdown-body">
          ${unsafeHTML(sanitizeHtml(analogy))}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-analogy-card")) {
  customElements.define("a2learn-analogy-card", A2learnAnalogyCardElement);
}

export const A2learnAnalogyCard = {
  ...AnalogyCardApi,
  tagName: "a2learn-analogy-card",
};
