import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { MentalModelApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "./sanitize";

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
      overflow: hidden;
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
    .analogy-content strong {
      color: var(--a2ui-color-secondary, #6366f1);
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

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const description = this.resolveString(props.description);
    const icon = this.resolveString(props.icon) || "🧠";
    const analogy = props.analogy ? this.resolveString(props.analogy) : "";
    const diagram = props.diagram ? this.resolveString(props.diagram) : "";
    const pillars = (props.pillars as Array<Record<string, unknown>>) || [];

    return html`
      <div class="mm-container">
        <div class="header">
          <div class="icon-badge">${icon}</div>
          <div class="title-area">
            <span class="subtitle">Mental Model · 心智模型</span>
            <h2 class="title">${title}</h2>
          </div>
        </div>
        <div class="body">
          <div class="description">${unsafeHTML(sanitizeHtml(this.renderInlineMarkdown(description)))}</div>

          ${pillars.length > 0
            ? html`
                <div>
                  <h3 class="section-title">🗝️ 核心要素 (Pillars)</h3>
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
                          <p class="pillar-desc">${pDesc}</p>
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
                  <h3 class="section-title">📊 结构化示意 (Diagram)</h3>
                  <div class="diagram-box">
                    <pre><code>${diagram.trim()}</code></pre>
                  </div>
                </div>
              `
            : nothing}

          ${analogy
            ? html`
                <div class="analogy-box">
                  <h4 class="analogy-header">💡 直觉类比 (Analogy)</h4>
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
