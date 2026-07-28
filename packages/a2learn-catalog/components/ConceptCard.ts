import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ConceptCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

export class A2learnConceptCardElement extends A2uiLitElement<typeof ConceptCardApi> {
  static styles = [
    tooltipStyles,
    css`
      :host {
      display: block;
      margin: var(--a2ui-spacing-m) 0;
    }
    .concept-card {
      border: 1px solid var(--a2ui-color-border);
      border-radius: var(--a2ui-border-radius);
      background: var(--a2ui-color-surface);
      overflow: visible;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.2s ease;
    }
    .concept-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, var(--a2ui-color-surface));
      padding: var(--a2ui-spacing-l);
      border-bottom: 1px solid var(--a2ui-color-border);
    }
    .title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: var(--a2ui-color-on-surface);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title::before {
      content: "💡";
      font-size: 20px;
    }
    .tags {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }
    .tag {
      background: #f3f4f6;
      color: #0f766e;
      border: 1px solid #e5e7eb;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .body {
      padding: var(--a2ui-spacing-l);
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
    }
    .definition {
      font-size: 16px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface, #111827);
      margin-bottom: var(--a2ui-spacing-l, 20px);
    }
    .definition p {
      margin: 0 0 6px 0;
      line-height: 1.6;
    }
    .definition ul, .definition ol {
      margin: 4px 0 8px 0;
      padding-left: 20px;
    }
    .definition li {
      margin-bottom: 3px;
      line-height: 1.55;
    }
    code {
      font-family: "JetBrains Mono", "Fira Code", monospace;
      padding: 2px 6px;
      border-radius: 6px;
      background: #f3f4f6;
      color: #0d9488;
      font-size: 0.9em;
      border: 1px solid #e5e7eb;
    }
    .example-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #0d9488;
      padding: var(--a2ui-spacing-m) var(--a2ui-spacing-l);
      border-radius: 0 var(--a2ui-border-radius) var(--a2ui-border-radius) 0;
      margin-bottom: var(--a2ui-spacing-xl);
      font-size: 14px;
      overflow-x: auto;
      color: #111827;
    }
    .example-box pre {
      margin: 0;
      padding: 0;
      background: transparent;
      border: none;
      color: inherit;
      font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px;
      line-height: 1.65;
    }
    .example-box code {
      padding: 0;
      background: transparent;
      border: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
    }
    .related-accordion {
      border-top: 1px dashed var(--a2ui-color-border, #e5e7eb);
      margin-top: 16px;
      padding-top: 12px;
    }
    .related-summary {
      font-size: 13.5px;
      font-weight: 700;
      color: #0d9488;
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      transition: all 0.2s ease;
    }
    .related-summary:hover {
      background: #f3f4f6;
      border-color: #0d9488;
    }
    .related-links {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding: 4px 0;
    }
    .related-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #0f766e;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .related-link:hover {
      background: #0d9488;
      color: #ffffff;
      border-color: #0d9488;
      transform: scale(1.03);
    }
  `
];

  protected createController() {
    return new A2uiController(this, ConceptCardApi);
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

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const definition = this.resolveString(props.definition);
    const example = props.example ? this.resolveString(props.example) : "";
    const tags = props.tags ? (props.tags as unknown[]).map(t => this.resolveString(t)) : [];
    const relatedConcepts = props.relatedConcepts ? (props.relatedConcepts as unknown[]).map(c => this.resolveString(c)) : [];

    return html`
      <div class="concept-card">
        <div class="header">
          <h2 class="title">${title}</h2>
          ${tags.length > 0 ? html`
            <div class="tags">
              ${tags.map((tag: string) => html`<span class="tag">${tag}</span>`)}
            </div>
          ` : nothing}
        </div>
        
        <div class="body">
          <h3 class="section-title">核心定义</h3>
          <div class="definition">${unsafeHTML(sanitizeHtml(definition))}</div>

          ${example ? html`
            <h3 class="section-title">代码与案例</h3>
            <div class="example-box">
              ${unsafeHTML(sanitizeHtml(example))}
            </div>
          ` : nothing}

          ${relatedConcepts.length > 0 ? html`
            <details class="related-accordion">
              <summary class="related-summary">
                🔍 关联延伸探索 (${relatedConcepts.length})
              </summary>
              <div class="related-links">
                ${relatedConcepts.map((concept: string) => html`
                  <button class="related-link" @click=${() => this.handleRelatedClick(concept)}>
                    ${concept} →
                  </button>
                `)}
              </div>
            </details>
          ` : nothing}
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
