import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { MentalModelApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnMentalModelElement extends A2uiLitElement<typeof MentalModelApi> {
  static styles = [
    tooltipStyles,
    css`
      :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .mm-container {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: var(--a2ui-border-radius, 16px);
      background: var(--a2ui-color-surface, #ffffff);
      overflow: visible;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .mm-container:hover {
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }
    .header {
      background: linear-gradient(135deg, color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, var(--a2ui-color-surface, #ffffff)), color-mix(in oklab, var(--a2ui-color-secondary, #6366f1) 4%, var(--a2ui-color-surface, #ffffff)));
      padding: var(--a2ui-spacing-l, 24px);
      border-bottom: 1px solid var(--a2ui-color-border, #e2e8f0);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .icon-badge {
      font-size: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--a2ui-color-surface, #ffffff);
      width: 52px;
      height: 52px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      flex-shrink: 0;
    }
    .title-area {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .title {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--a2ui-color-on-surface, #1e293b);
      letter-spacing: -0.5px;
    }
    .subtitle {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--a2ui-color-primary, #3b82f6);
    }
    .body {
      padding: var(--a2ui-spacing-l, 24px);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .description {
      font-size: 16px;
      line-height: 1.65;
      color: var(--a2ui-color-on-surface, #334155);
      margin: 0;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #1e293b) 60%, transparent);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .pillar-card {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 2%, var(--a2ui-color-surface, #ffffff));
      border: 1px solid color-mix(in oklab, var(--a2ui-color-border, #e2e8f0) 80%, transparent);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pillar-card:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 4%, var(--a2ui-color-surface, #ffffff));
      border-color: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 20%, transparent);
    }
    .pillar-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pillar-icon {
      font-size: 18px;
    }
    .pillar-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--a2ui-color-on-surface, #1e293b);
      margin: 0;
    }
    .pillar-desc {
      font-size: 13.5px;
      line-height: 1.5;
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #334155) 80%, transparent);
      margin: 0;
    }
    .diagram-box {
      background: #0f172a;
      color: #38bdf8;
      border-radius: 12px;
      padding: 20px;
      font-family: "JetBrains Mono", "Fira Code", monospace;
      font-size: 13.5px;
      line-height: 1.6;
      overflow-x: auto;
      border: 1px solid #1e293b;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    .diagram-box pre {
      margin: 0;
      white-space: pre;
    }
    .analogy-box {
      background: color-mix(in oklab, var(--a2ui-color-secondary, #6366f1) 5%, var(--a2ui-color-surface, #ffffff));
      border-left: 4px solid var(--a2ui-color-secondary, #6366f1);
      border-radius: 4px 12px 12px 4px;
      padding: 20px;
      position: relative;
    }
    .analogy-header {
      font-size: 14px;
      font-weight: 800;
      color: var(--a2ui-color-secondary, #6366f1);
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .analogy-content {
      font-size: 15px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface, #334155);
      margin: 0;
    }
    .analogy-content p {
      margin: 0 0 8px 0;
    }
    .analogy-content p:last-child {
      margin-bottom: 0;
    }
    .diagram-box {
      background: color-mix(in oklab, var(--a2ui-color-surface, #ffffff) 97%, black);
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: 12px;
      padding: 16px;
      overflow-x: auto;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .visual-step-line {
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface, #1e293b);
    }
    .visual-step-line:last-child {
      margin-bottom: 0;
    }
    .visual-memory-row {
      display: inline-flex;
      gap: 6px;
      margin: 6px 0;
      flex-wrap: wrap;
      align-items: center;
      vertical-align: middle;
    }
    .visual-memory-cell {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      background: var(--a2ui-color-surface, #ffffff);
      border: 1px solid var(--a2ui-color-border, #cbd5e1);
      border-radius: 8px;
      padding: 4px 8px;
      min-width: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .visual-memory-cell.highlight {
      background: #dcfce7;
      border-color: #10b981;
      color: #047857;
      font-weight: 700;
    }
    .cell-idx {
      font-size: 10px;
      color: var(--app-muted, #64748b);
      font-family: monospace;
    }
    .cell-val {
      font-size: 13px;
      font-weight: 600;
      font-family: monospace;
    }
    .step-suffix {
      font-size: 13px;
      color: var(--app-muted, #64748b);
    }
    .visual-flow-line {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
      background: color-mix(in oklab, var(--a2ui-color-surface, #ffffff) 92%, black 5%);
      border: 1px solid var(--a2ui-color-border, #cbd5e1);
      border-radius: 10px;
      transition: all 0.2s ease;
    }
    .visual-flow-line:last-child {
      margin-bottom: 0;
    }
    .visual-flow-line:hover {
      transform: translateY(-1px);
    }
    .visual-flow-line.variant-warn {
      background: color-mix(in oklab, #fef2f2 85%, var(--a2ui-color-surface, #ffffff));
      border-color: #fca5a5;
    }
    .visual-flow-line.variant-success {
      background: color-mix(in oklab, #f0fdf4 85%, var(--a2ui-color-surface, #ffffff));
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
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: var(--a2ui-font-family, sans-serif);
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
      background: var(--a2ui-color-surface, #ffffff);
      border: 1px solid var(--a2ui-color-border, #cbd5e1);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 13px;
      font-family: var(--a2ui-font-family-mono, monospace);
      font-weight: 600;
      color: var(--a2ui-color-on-surface, #1e293b);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .flow-separator {
      color: #94a3b8;
      font-size: 14px;
      font-weight: 700;
    }
  `
];

  protected createController() {
    return new A2uiController(this, MentalModelApi);
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

  private renderInlineMarkdown(markdown: string): string {
    if (!markdown) return "";
    let htmlStr = markdown
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/<b>/gi, "<strong>")
      .replace(/<\/b>/gi, "</strong>");
    const paragraphs = htmlStr
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
    return paragraphs || "<p></p>";
  }

  private renderDiagram(diagramStr: string) {
    if (!diagramStr) return nothing;

    let cleanDiagram = diagramStr.trim();
    cleanDiagram = cleanDiagram.replace(/^<pre(?:\s+[^>]*)?>\s*<code(?:\s+[^>]*)?>([\s\S]*?)<\/code>\s*<\/pre>$/i, "$1");
    cleanDiagram = cleanDiagram.replace(/^```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)\r?\n```$/i, "$1");

    const lines = cleanDiagram.split("\n");

    return html`
      <div class="diagram-box">
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

          // Check if line contains array memory pattern like [0:10 | 1:20 | ...]
          const arrayMatch = cleanLine.match(/\[(.*?)\]/);
          if (arrayMatch) {
            const rawCells = arrayMatch[1].split("|");
            const prefix = cleanLine.substring(0, arrayMatch.index).trim();
            const suffix = cleanLine.substring(arrayMatch.index! + arrayMatch[0].length).trim();

            return html`
              <div class="visual-step-line">
                ${prefix ? html`<strong>${prefix}</strong> ` : nothing}
                <div class="visual-memory-row">
                  ${rawCells.map((cellStr) => {
                    const parts = cellStr.trim().split(":");
                    const idx = parts.length > 1 ? parts[0] : "";
                    const val = parts.length > 1 ? parts[1] : parts[0];
                    const isHighlight = val.includes("25") || val.includes("空") || val.includes("冲突");

                    return html`
                      <div class="visual-memory-cell ${isHighlight ? 'highlight' : ''}">
                        ${idx ? html`<span class="cell-idx">idx ${idx}</span>` : nothing}
                        <span class="cell-val">${val}</span>
                      </div>
                    `;
                  })}
                </div>
                ${suffix ? html` <span class="step-suffix">${suffix}</span>` : nothing}
              </div>
            `;
          }

          // Check if line contains flow pipeline pattern like "A -> B -> C" or "Title: A ➔ B"
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

            const rawNodes = flowContent.split(/->|➔|=>/).map(s => s.trim()).filter(Boolean);

            return html`
              <div class="visual-flow-line ${variantClass}">
                ${title ? html`
                  <div class="visual-flow-header">
                    <span class="flow-badge">${icon} ${title}</span>
                  </div>
                ` : nothing}
                <div class="visual-flow-nodes">
                  ${rawNodes.map((node, i) => html`
                    ${i > 0 ? html`<span class="flow-separator">➔</span>` : nothing}
                    <div class="flow-node">${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(node)))}</div>
                  `)}
                </div>
              </div>
            `;
          }

          return html`<div class="visual-step-line">${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(line)))}</div>`;
        })}
      </div>
    `;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const description = this.resolveString(props.description);
    const icon = this.resolveString(props.icon) || "🧠";
    const analogy = props.analogy ? this.resolveString(props.analogy) : "";
    const analogyTitle = props.analogyTitle ? this.resolveString(props.analogyTitle) : uiText("💡 真实案例剖析演推", "💡 Worked Example");
    const diagram = props.diagram ? this.resolveString(props.diagram) : "";
    const diagramTitle = props.diagramTitle ? this.resolveString(props.diagramTitle) : uiText("📊 内存与数据分布图示", "📊 Memory and Data Layout");
    const pillars = (props.pillars as Array<Record<string, unknown>>) || [];
    const pillarsTitle = props.pillarsTitle ? this.resolveString(props.pillarsTitle) : uiText("🗝️ 核心要素", "🗝️ Key Elements");

    return html`
      <div class="mm-container">
        <div class="header">
          <div class="icon-badge">${icon}</div>
          <div class="title-area">
            <h2 class="title">${title}</h2>
          </div>
        </div>
        <div class="body">
          <div class="description">${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(description)))}</div>

          ${pillars.length > 0
            ? html`
                <div>
                  <h3 class="section-title">${pillarsTitle}</h3>
                  <div class="pillars-grid">
                    ${pillars.map((pillar) => {
                      const pTitle = this.resolveString(pillar.title);
                      const pDesc = this.resolveString(pillar.description);
                      const pIcon = pillar.icon ? this.resolveString(pillar.icon) : "";
                      return html`
                        <div class="pillar-card">
                          <div class="pillar-header">
                            ${pIcon ? html`<span class="pillar-icon">${pIcon}</span>` : nothing}
                            <h4 class="pillar-title">${pTitle}</h4>
                          </div>
                          <p class="pillar-desc">${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(pDesc)))}</p>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              `
            : nothing}

          ${diagram
            ? html`
                <div>
                  <h3 class="section-title">${diagramTitle}</h3>
                  ${this.renderDiagram(diagram)}
                </div>
              `
            : nothing}

          ${analogy
            ? html`
                <div class="analogy-box">
                  <h4 class="analogy-header">${analogyTitle}</h4>
                  <div class="analogy-content">
                    ${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(analogy)))}
                  </div>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-mental-model")) {
  customElements.define("a2learn-mental-model", A2learnMentalModelElement as any);
}

export const A2learnMentalModel = {
  ...MentalModelApi,
  tagName: "a2learn-mental-model",
};
