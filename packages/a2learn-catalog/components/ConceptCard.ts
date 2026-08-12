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

  private renderExample(exampleStr: string) {
    if (!exampleStr) return nothing;

    let cleanStr = exampleStr.trim();
    cleanStr = cleanStr.replace(/^<pre(?:\s+[^>]*)?>\s*<code(?:\s+[^>]*)?>([\s\S]*?)<\/code>\s*<\/pre>$/i, "$1");

    const lines = cleanStr.split("\n");
    const hasArrows = lines.some((line) => line.includes("->") || line.includes("➔") || line.includes("=>"));
    const isMarkdown = /^```|^\s*#{1,6}\s|^\s*[-*+]\s|^\s*\d+[.)]\s/m.test(cleanStr);

    if (hasArrows && !isMarkdown) {
      return html`
        <div class="example-box-flow">
          ${lines.map((line) => {
            let cleanLine = line
              .replace(/^<pre(?:\s+[^>]*)?>/, "")
              .replace(/^<code(?:\s+[^>]*)?>/, "")
              .replace(/<\/code>$/, "")
              .replace(/<\/pre>$/, "")
              .replace(/^\/\/\s*/, "")
              .replace(/^#\s*/, "")
              .trim();
            if (!cleanLine) return nothing;

            const hasArrow = cleanLine.includes("->") || cleanLine.includes("➔") || cleanLine.includes("=>");
            if (hasArrow) {
              let title = "";
              let flowContent = cleanLine;

              const colonIdx = cleanLine.indexOf(":");
              if (colonIdx !== -1 && colonIdx < cleanLine.search(/->|➔|=>/)) {
                title = cleanLine.substring(0, colonIdx).trim();
                flowContent = cleanLine.substring(colonIdx + 1).trim();
              }

              const isWarn = /传统|搜索|遍历|线性|慢|O\(N\)|警告|瓶颈/i.test(cleanLine);
              const isSuccess = /哈希|计算|常数|突破|快|O\(1\)|一步|直接/i.test(cleanLine);
              const variantClass = isWarn ? 'variant-warn' : isSuccess ? 'variant-success' : 'variant-info';
              const icon = isWarn ? '🐢' : isSuccess ? '⚡' : '🔄';

              const rawNodes = flowContent
                .split(/->|➔|=>/)
                .map((s) => s.replace(/<\/?[^>]+>/g, "").trim())
                .filter(Boolean);

              return html`
                <div class="visual-flow-line ${variantClass}">
                  ${title
                    ? html`
                        <div class="visual-flow-header">
                          <span class="flow-badge">${icon} ${title}</span>
                        </div>
                      `
                    : nothing}
                  <div class="visual-flow-nodes">
                    ${rawNodes.map(
                      (node, i) => html`
                        ${i > 0 ? html`<span class="flow-separator">➔</span>` : nothing}
                        <div class="flow-node">${unsafeHTML(sanitizeHtml(node, { inline: true }))}</div>
                      `
                    )}
                  </div>
                </div>
              `;
            }

            return html`<div class="example-text-line">${unsafeHTML(sanitizeHtml(line, { inline: true }))}</div>`;
          })}
        </div>
      `;
    }

    return html`
      <div class="example-box a2learn-markdown-body">
        ${unsafeHTML(sanitizeHtml(cleanStr))}
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
    const relatedConcepts = props.relatedConcepts ? (props.relatedConcepts as unknown[]).map(c => this.resolveString(c)) : [];

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

          ${relatedConcepts.length > 0 ? html`
            <details class="related-accordion">
              <summary class="related-summary">
                🔍 ${uiText("关联延伸探索", "Explore Related Concepts")} (${relatedConcepts.length})
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
