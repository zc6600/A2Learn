import componentStyles from "../styles/components/LiteratureReference.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { LiteratureReferenceApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnLiteratureReferenceElement extends A2uiLitElement<typeof LiteratureReferenceApi> {
  static styles = unsafeCSS(componentStyles);

  protected createController() {
    return new A2uiController(this, LiteratureReferenceApi);
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

  private handleRefClick(event: Event) {
    const props = this.controller?.props;
    if (props?.onReferenceClick) {
      event.stopPropagation();
      this.context.dispatchAction({
        ...(props.onReferenceClick as Record<string, unknown>),
        context: {
          citation: this.resolveString(props.citation),
          title: this.resolveString(props.title),
        },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const citation = this.resolveString(props.citation);
    const title = this.resolveString(props.title);
    const url = props.url ? this.resolveString(props.url) : "";
    const highlightQuote = props.highlightQuote ? this.resolveString(props.highlightQuote) : "";

    const authors = props.authors
      ? (props.authors as unknown[]).map(a => this.resolveString(a)).join(", ")
      : "";

    const hasAction = !!props.onReferenceClick;

    return html`
      <div 
        class="ref-card ${hasAction ? 'ref-card-clickable' : ''}" 
        @click=${this.handleRefClick}
      >
        <div class="header">
          <span class="citation-badge">${citation}</span>
          <h4 class="ref-title">
            ${url
              ? html`
                  <a class="ref-title-link" href="${url}" target="_blank" @click=${(e: Event) => e.stopPropagation()}>
                    ${title} 🔗
                  </a>
                `
              : title}
          </h4>
        </div>
        
        ${authors ? html`<div class="authors">By ${authors}</div>` : nothing}
        
        ${highlightQuote
          ? html`
              <div class="quote-box">
                "${unsafeHTML(sanitizeHtml(highlightQuote))}"
              </div>
            `
          : nothing}

        ${hasAction
          ? html`
              <div class="action-tip">
                ${uiText("点击以让 AI 解读此引用 →", "Click to have AI interpret this reference →")}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-literature-reference")) {
  customElements.define("a2learn-literature-reference", A2learnLiteratureReferenceElement as any);
}

export const A2learnLiteratureReference = {
  ...LiteratureReferenceApi,
  tagName: "a2learn-literature-reference",
};
