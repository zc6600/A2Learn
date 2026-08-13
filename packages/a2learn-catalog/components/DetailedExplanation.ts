import componentStyles from "../styles/components/DetailedExplanation.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DetailedExplanationApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

export class A2learnDetailedExplanationElement extends A2uiLitElement<typeof DetailedExplanationApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
  ];

  protected createController() {
    return new A2uiController(this, DetailedExplanationApi);
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

    const title = props.title ? this.resolveString(props.title) : "";
    const content = this.resolveString(props.content);
    const centered = props.contentAlign === "center";

    return html`
      <div class="explanation-card">
        ${title
          ? html`
              <div class="header">
                ${title ? html`<h2 class="title">${title}</h2>` : nothing}
              </div>
            `
          : nothing}

        <div class="content-body ${centered ? "centered" : ""} a2learn-markdown-body">
          ${unsafeHTML(sanitizeHtml(content))}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-detailed-explanation")) {
  customElements.define("a2learn-detailed-explanation", A2learnDetailedExplanationElement);
}

export const A2learnDetailedExplanation = {
  ...DetailedExplanationApi,
  tagName: "a2learn-detailed-explanation",
};
