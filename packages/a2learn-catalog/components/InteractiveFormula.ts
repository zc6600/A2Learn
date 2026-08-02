import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { InteractiveFormulaApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";
import katex from "katex";
import "katex/dist/katex.min.css";

export class A2learnInteractiveFormulaElement extends A2uiLitElement<typeof InteractiveFormulaApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .formula-card {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: var(--a2ui-border-radius, 16px);
      background: var(--a2ui-color-surface, #ffffff);
      padding: var(--a2ui-spacing-xl, 32px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--a2ui-color-primary, #3b82f6);
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, var(--a2ui-color-surface, #ffffff));
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 20px;
    }
    .formula-display {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin-bottom: 20px;
      overflow-x: auto;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
    }
    .formula-katex {
      display: inline-block;
      color: var(--a2ui-color-on-surface, #0f172a);
    }
    .formula-display .katex {
      font-size: 1.25em;
    }
    .formula-katex.formula-katex-error {
      font-family: "Courier New", Courier, monospace;
      font-size: 18px;
      font-weight: 700;
      white-space: pre-wrap;
      color: #b91c1c;
    }
    .description {
      font-size: 15px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface, #334155);
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--app-muted, #64748b);
      margin: 20px 0 12px 0;
      border-bottom: 1px dashed var(--a2ui-color-border, #e2e8f0);
      padding-bottom: 6px;
    }
    .variables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .variable-item {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 3%, var(--a2ui-color-surface, #ffffff));
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      gap: 12px;
      align-items: center;
      transition: all 0.2s ease;
    }
    .variable-item:hover {
      border-color: var(--a2ui-color-primary, #3b82f6);
      background: var(--a2ui-color-surface, #ffffff);
      transform: translateY(-1px);
    }
    .var-symbol {
      font-family: "Courier New", Courier, monospace;
      font-weight: 700;
      font-size: 16px;
      color: var(--a2ui-color-primary, #3b82f6);
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 10%, transparent);
      padding: 2px 8px;
      border-radius: 4px;
      min-width: 24px;
      text-align: center;
    }
    .var-explanation {
      font-size: 13px;
      color: var(--a2ui-color-on-surface, #334155);
      line-height: 1.4;
    }
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .step-item {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: 8px;
      overflow: hidden;
    }
    .step-header {
      background: #f8fafc;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      color: var(--a2ui-color-on-surface, #1e293b);
      user-select: none;
    }
    .step-header:hover {
      background: #f1f5f9;
    }
    .step-body {
      padding: 16px;
      background: var(--a2ui-color-surface, #ffffff);
      border-top: 1px solid var(--a2ui-color-border, #e2e8f0);
      display: none;
    }
    .step-body-open {
      display: block;
    }
    .step-latex {
      margin-bottom: 8px;
      text-align: center;
      background: #fafafa;
      padding: 8px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .step-latex .katex {
      color: var(--a2ui-color-secondary, #6366f1);
      font-size: 1.05em;
    }
    .step-explanation {
      font-size: 13px;
      line-height: 1.5;
      color: var(--a2ui-color-on-surface, #475569);
    }
  `;

  protected createController() {
    return new A2uiController(this, InteractiveFormulaApi);
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

  private renderLatex(expr: string, displayMode: boolean) {
    if (!expr) return nothing;
    try {
      const rendered = katex.renderToString(expr, {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode,
      });
      return html`<span class="formula-katex">${unsafeHTML(rendered)}</span>`;
    } catch {
      return html`<span class="formula-katex formula-katex-error">${expr}</span>`;
    }
  }

  private _openSteps: Set<number> = new Set();

  private toggleStep(idx: number) {
    if (this._openSteps.has(idx)) {
      this._openSteps.delete(idx);
    } else {
      this._openSteps.add(idx);
    }
    this.requestUpdate();
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const latex = this.resolveString(props.latex);
    const description = props.description ? this.resolveString(props.description) : "";
    
    // Parse variables record
    const variables = props.variables 
      ? Object.entries(props.variables).map(([k, v]) => [k, this.resolveString(v)]) 
      : [];

    const steps = props.derivationSteps 
      ? (props.derivationSteps as unknown[]).map((s: any) => ({
          step: this.resolveString(s.step),
          latex: this.resolveString(s.latex),
          explanation: this.resolveString(s.explanation)
        }))
      : [];

    return html`
      <div class="formula-card">
        <div class="badge">
          <span>📐</span>
          <span>Interactive Mathematical Formula</span>
        </div>

        <div class="formula-display">
          ${this.renderLatex(latex, true)}
        </div>

        ${description ? html`<div class="description">${unsafeHTML(sanitizeHtml(description))}</div>` : nothing}

        ${variables.length > 0
          ? html`
              <div class="section-title">${uiText("变量与符号释义", "Variables and Symbols")}</div>
              <div class="variables-grid">
                ${variables.map(
                  ([symbol, desc]) => html`
                    <div class="variable-item">
                      <span class="var-symbol">${this.renderLatex(symbol, false)}</span>
                      <span class="var-explanation">${unsafeHTML(sanitizeHtml(desc))}</span>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}

        ${steps.length > 0
          ? html`
              <div class="section-title">${uiText("公式推导步骤", "Derivation Steps")}</div>
              <div class="steps-list">
                ${steps.map(
                  (stepObj, idx) => html`
                    <div class="step-item">
                      <div class="step-header" @click=${() => this.toggleStep(idx)}>
                        <span>${stepObj.step}</span>
                        <span>${this._openSteps.has(idx) ? "▲" : "▼"}</span>
                      </div>
                      <div class="step-body ${this._openSteps.has(idx) ? 'step-body-open' : ''}">
                        <div class="step-latex">${this.renderLatex(stepObj.latex, true)}</div>
                        <div class="step-explanation">${unsafeHTML(sanitizeHtml(stepObj.explanation))}</div>
                      </div>
                    </div>
                  `
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-interactive-formula")) {
  customElements.define("a2learn-interactive-formula", A2learnInteractiveFormulaElement as any);
}

export const A2learnInteractiveFormula = {
  ...InteractiveFormulaApi,
  tagName: "a2learn-interactive-formula",
};
