import componentStyles from "../styles/components/MentalModel.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { MentalModelApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnMentalModelElement extends A2uiLitElement<typeof MentalModelApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
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
                    <div class="flow-node">${unsafeHTML(sanitizeHtml(node, { inline: true }))}</div>
                  `)}
                </div>
              </div>
            `;
          }

          return html`<div class="visual-step-line">${unsafeHTML(sanitizeHtml(line, { inline: true }))}</div>`;
        })}
      </div>
    `;
  }

  render() {
    const props = this.controller?.props;
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
          <div class="description a2learn-markdown-body">${unsafeHTML(sanitizeHtml(description))}</div>

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
                          <div class="pillar-desc a2learn-markdown-body">${unsafeHTML(sanitizeHtml(pDesc))}</div>
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
                  <div class="analogy-content a2learn-markdown-body">
                    ${unsafeHTML(sanitizeHtml(analogy))}
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
  customElements.define("a2learn-mental-model", A2learnMentalModelElement);
}

export const A2learnMentalModel = {
  ...MentalModelApi,
  tagName: "a2learn-mental-model",
};
