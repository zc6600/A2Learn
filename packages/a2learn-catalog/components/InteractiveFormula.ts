import componentStyles from "../styles/components/InteractiveFormula.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { InteractiveFormulaApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles, katexStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";
import katex from "katex";
import "katex/dist/katex.min.css";

export class A2learnInteractiveFormulaElement extends A2uiLitElement<typeof InteractiveFormulaApi> {
  static styles = [
    katexStyles,
    tooltipStyles,
    unsafeCSS(componentStyles)
  ];

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

  private renderSymbol(symbol: string) {
    if (!symbol) return nothing;
    // If it's a multi-letter plain word like "softmax", render as \text{...}
    const isPlainWord = /^[a-zA-Z]{2,}$/.test(symbol);
    const expr = isPlainWord ? `\\text{${symbol}}` : symbol;
    return this.renderLatex(expr, false);
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
                      <span class="var-symbol">${this.renderSymbol(symbol)}</span>
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
