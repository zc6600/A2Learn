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

  private exampleSectionTitle(): string {
    return uiText("实践示例", "In Practice");
  }

  private isEnglishUi(): boolean {
    const documentLanguage = typeof document !== "undefined" ? document.documentElement.lang : "";
    return documentLanguage.toLowerCase().startsWith("en");
  }

  private renderExample(exampleStr: string) {
    if (!exampleStr) return nothing;

    // Strip any outer <pre><code>...</code></pre> or ```code``` wrapping first
    let cleanStr = exampleStr.trim();
    cleanStr = cleanStr.replace(/^<pre(?:\s+[^>]*)?>\s*<code(?:\s+[^>]*)?>([\s\S]*?)<\/code>\s*<\/pre>$/i, "$1");

    // Keep a full fenced block intact so the Markdown renderer can preserve
    // its language label and code formatting instead of treating it as a
    // plain text flow diagram.
    const isFullCodeFence = /^```[a-zA-Z0-9_-]*\r?\n[\s\S]*?\r?\n```$/i.test(cleanStr);
    if (!isFullCodeFence) {
      cleanStr = cleanStr.replace(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/i, "$1");
    }

    const hasMarkdown = isFullCodeFence || /```|(^|\n)\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)|\*\*[^*]+\*\*|`[^`]+`/.test(cleanStr);
    if (hasMarkdown) {
      return html`<div class="example-markdown">${unsafeHTML(this.renderExampleMarkdown(cleanStr))}</div>`;
    }

    // Generated examples sometimes contain real source code without Markdown
    // fences. Keep that code readable instead of letting HTML collapse its
    // line breaks into one paragraph.
    const looksLikeCode = /(^|\n)\s*(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=|for\s*\(|fetch\w*\s*\(|(?:\.|#)?[a-zA-Z][\w-]*\s*\{)/m.test(cleanStr);
    if (looksLikeCode) {
      return html`<div class="example-markdown">${unsafeHTML(this.renderExampleMarkdown(`\`\`\`text\n${cleanStr}\n\`\`\``))}</div>`;
    }

    const lines = cleanStr.split("\n");
    const hasArrows = lines.some((line) => line.includes("->") || line.includes("➔") || line.includes("=>"));

    if (hasArrows) {
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
                        <div class="flow-node">${node}</div>
                      `
                    )}
                  </div>
                </div>
              `;
            }

            return html`<div class="example-text-line">${unsafeHTML(sanitizeHtml(line))}</div>`;
          })}
        </div>
      `;
    }

    return html`
      <div class="example-box">
        ${unsafeHTML(sanitizeHtml(cleanStr))}
      </div>
    `;
  }

  private renderExampleMarkdown(markdown: string): string {
    const escapeHtml = (value: string): string =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");

    const inline = (value: string): string =>
      value
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");

    const codeBlocks: string[] = [];
    let source = markdown.replace(
      /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n?([\s\S]*?)\r?\n?```/g,
      (_match, language: string, code: string) => {
        const index = codeBlocks.length;
        const label = (language || "code").trim().toLowerCase();
        codeBlocks.push(
          `<div class="example-code-block"><div class="example-code-header"><span>${escapeHtml(label)}</span><span>code</span></div><pre>${escapeHtml(code)}</pre></div>`,
        );
        return `\x1aEXAMPLE_CODE_${index}\x1a`;
      },
    );

    const lines = source.split(/\r?\n/);
    const output: string[] = [];
    let paragraph: string[] = [];
    let listType: "ul" | "ol" | null = null;

    const flushParagraph = () => {
      if (paragraph.length > 0) {
        output.push(`<p>${inline(paragraph.join(" ").trim())}</p>`);
        paragraph = [];
      }
    };
    const closeList = () => {
      if (listType) {
        output.push(`</${listType}>`);
        listType = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const placeholder = trimmed.match(/^\x1aEXAMPLE_CODE_(\d+)\x1a$/);
      if (placeholder) {
        flushParagraph();
        closeList();
        output.push(codeBlocks[Number(placeholder[1])]);
        continue;
      }
      if (!trimmed) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }

      const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
      const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) {
          closeList();
          output.push(`<${nextType}>`);
          listType = nextType;
        }
        output.push(`<li>${inline((unordered || ordered)![1])}</li>`);
        continue;
      }

      closeList();
      paragraph.push(trimmed);
    }
    flushParagraph();
    closeList();

    return sanitizeHtml(output.join(""));
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
          <div class="definition">${unsafeHTML(sanitizeHtml(definition))}</div>

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
