import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ConceptCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnConceptCardElement extends A2uiLitElement<typeof ConceptCardApi> {
  static styles = [
    tooltipStyles,
    css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .concept-card {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-left: 4px solid var(--a2ui-color-primary, #0d9488);
      border-radius: var(--a2ui-border-radius, 12px);
      background: var(--a2ui-color-surface, #ffffff);
      padding: 24px 28px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      transition: all 0.25s ease;
    }
    .concept-card:hover {
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.06);
    }
    .header {
      margin-bottom: 16px;
    }
    .title {
      margin: 0 0 10px 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.4;
      color: var(--a2ui-color-on-surface, #1e293b);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-icon {
      font-size: 22px;
      display: inline-flex;
      align-items: center;
    }
    .tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      background: color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 10%, var(--a2ui-color-surface, #ffffff));
      color: var(--a2ui-color-primary, #0d9488);
      border: 1px solid color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 20%, transparent);
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .body {
      padding: 0;
    }
    .section-title {
      font-size: 12.5px;
      font-weight: 700;
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #111827) 50%, transparent);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 16px 0 8px 0;
      display: flex;
      align-items: center;
    }
    .definition {
      font-size: 15.5px;
      line-height: 1.7;
      color: var(--a2ui-color-on-surface, #334155);
      margin-bottom: 12px;
    }
    .definition p {
      margin: 0 0 6px 0;
      line-height: 1.7;
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
      background: color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 8%, var(--a2ui-color-surface, #ffffff));
      color: var(--a2ui-color-primary, #0d9488);
      font-size: 0.9em;
      border: 1px solid var(--a2ui-color-border, #e5e7eb);
    }
    .example-box {
      background: color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 4%, var(--a2ui-color-surface, #ffffff));
      border: 1px solid color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 15%, transparent);
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 14px;
      font-size: 14.5px;
      line-height: 1.65;
      color: var(--a2ui-color-on-surface, #1e293b);
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
    .example-markdown {
      margin-bottom: var(--a2ui-spacing-xl);
      color: var(--a2ui-color-on-surface, #1f2937);
      font-size: 15px;
      line-height: 1.7;
    }
    .example-markdown p {
      margin: 0 0 12px;
    }
    .example-markdown h1,
    .example-markdown h2,
    .example-markdown h3,
    .example-markdown h4 {
      margin: 0 0 10px;
      color: var(--a2ui-color-on-surface, #0f172a);
      line-height: 1.35;
    }
    .example-markdown ul,
    .example-markdown ol {
      margin: 0 0 14px;
      padding-left: 24px;
    }
    .example-markdown li {
      margin: 4px 0;
    }
    .example-markdown code:not(pre code) {
      padding: 2px 6px;
      border: 1px solid var(--a2ui-color-border, #dbeafe);
      border-radius: 5px;
      background: var(--a2ui-color-surface-subtle, #eff6ff);
      color: var(--a2ui-color-primary, #075985);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.9em;
    }
    .example-code-block {
      margin: 14px 0 18px;
      overflow: hidden;
      border: 1px solid #1e293b;
      border-radius: 10px;
      background: #0f172a;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
    }
    .example-code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 12px;
      background: #1e293b;
      color: #cbd5e1;
      font: 600 11px/1.2 ui-monospace, "SFMono-Regular", Consolas, monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .example-code-block pre {
      margin: 0;
      padding: 14px 16px;
      overflow-x: auto;
      color: #e2e8f0;
      font: 13px/1.7 ui-monospace, "JetBrains Mono", "Fira Code", Consolas, monospace;
      white-space: pre;
    }
    .example-box-flow {
      margin-bottom: var(--a2ui-spacing-xl);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .visual-flow-line {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .visual-flow-line:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
    .visual-flow-line.variant-warn {
      background: color-mix(in oklab, #fef2f2 85%, #ffffff);
      border-color: #fca5a5;
    }
    .visual-flow-line.variant-success {
      background: color-mix(in oklab, #f0fdf4 85%, #ffffff);
      border-color: #86efac;
    }
    .visual-flow-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
    }
    .flow-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: sans-serif;
    }
    .variant-warn .flow-badge {
      background: #fee2e2;
      color: #991b1b;
    }
    .variant-success .flow-badge {
      background: #dcfce7;
      color: #166534;
    }
    .variant-info .flow-badge {
      background: #e0f2fe;
      color: #075985;
    }
    .visual-flow-nodes {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .flow-node {
      display: inline-flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 13px;
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-weight: 600;
      color: #1e293b;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .flow-separator {
      color: #94a3b8;
      font-size: 14px;
      font-weight: 700;
    }
    .example-text-line {
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
      padding: 4px 0;
    }
    .related-accordion {
      border-top: 1px dashed var(--a2ui-color-border, #e5e7eb);
      margin-top: 16px;
      padding-top: 12px;
    }
    .related-summary {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--a2ui-color-primary, #0d9488);
      cursor: pointer;
      user-select: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: var(--a2ui-color-surface-subtle, #f9fafb);
      border: 1px solid var(--a2ui-color-border, #e5e7eb);
      transition: all 0.2s ease;
    }
    .related-summary:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary, #0d9488) 10%, var(--a2ui-color-surface, #ffffff));
      border-color: var(--a2ui-color-primary, #0d9488);
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
      color: var(--a2ui-color-primary, #0d9488);
      background: var(--a2ui-color-surface, #ffffff);
      border: 1px solid var(--a2ui-color-border, #e5e7eb);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .related-link:hover {
      background: var(--a2ui-color-primary, #0d9488);
      color: var(--a2ui-color-on-primary, #ffffff);
      border-color: var(--a2ui-color-primary, #0d9488);
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
