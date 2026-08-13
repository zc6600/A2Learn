import componentStyles from "../styles/components/ConceptCard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ConceptCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnConceptCardElement extends A2uiLitElement<typeof ConceptCardApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
  ];

  protected createController() {
    return new A2uiController(this, ConceptCardApi as any);
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

  private handleRelatedClick(concept: string) {
    const props = this.controller?.props;
    if (props?.onConceptClick) {
      this.context.dispatchAction({
        ...(props.onConceptClick as Record<string, unknown>),
        context: { concept },
      });
    }
    this.dispatchEvent(
      new CustomEvent("a2learn-explore-concept", {
        detail: { concept },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderExample(exampleStr: string) {
    if (!exampleStr) return nothing;
    return html`
      <div class="example a2learn-markdown-body">
        ${unsafeHTML(sanitizeHtml(exampleStr))}
      </div>
    `;
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const icon = props.icon ? this.resolveString(props.icon) : "";
    const definitionTitle = props.definitionTitle !== undefined
      ? this.resolveString(props.definitionTitle)
      : "";
    const definition = this.resolveString(props.definition);
    const exampleTitle = props.exampleTitle !== undefined
      ? this.resolveString(props.exampleTitle)
      : "";
    const example = props.example ? this.resolveString(props.example) : "";
    const tags = props.tags ? (props.tags as unknown[]).map(t => this.resolveString(t)) : [];
    const relatedConcepts = props.relatedConcepts ? (props.relatedConcepts as unknown[]).map(c => this.resolveString(c).trim()).filter(Boolean) : [];

    return html`
      <div class="concept-card">
        <div class="header">
          <h2 class="title">
            ${icon ? html`<span class="title-icon">${icon}</span>` : nothing}
            <span>${title}</span>
          </h2>
          ${tags.length > 0 ? html`
            <div class="tags">
              ${tags.map((tag: string) => html`<span class="tag">${tag}</span>`)}
            </div>
          ` : nothing}
        </div>
        
        <div class="body">
          ${definitionTitle ? html`<h3 class="section-title">${definitionTitle}</h3>` : nothing}
          <div class="definition a2learn-markdown-body">${unsafeHTML(sanitizeHtml(definition))}</div>

          ${example ? html`
            ${exampleTitle ? html`<h3 class="section-title">${exampleTitle}</h3>` : nothing}
            ${this.renderExample(example)}
          ` : nothing}
          ${relatedConcepts.length > 0
        ? html`
                <details class="related-accordion">
                  <summary class="related-summary">
                    ${uiText("相关概念", "Related Concepts")} (${relatedConcepts.length})
                  </summary>
                  <div class="related-links">
                    ${relatedConcepts.map(
          (concept: string) => html`
                        <button class="related-link" @click=${() => this.handleRelatedClick(concept)}>
                          ${concept}
                        </button>
                      `
        )}
                  </div>
                </details>
              `
        : nothing}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-concept-card")) {
  customElements.define("a2learn-concept-card", A2learnConceptCardElement);
}

export const A2learnConceptCard = {
  ...ConceptCardApi,
  tagName: "a2learn-concept-card",
};
