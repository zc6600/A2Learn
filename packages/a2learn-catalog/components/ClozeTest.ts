import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ClozeTestApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnClozeTestElement extends A2uiLitElement<typeof ClozeTestApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .cloze-card {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }
    .cloze-card.correct {
      border-color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 5%, var(--a2ui-color-surface));
    }
    .cloze-card.incorrect {
      border-color: var(--a2ui-color-error, #f44336);
      background: color-mix(in oklab, var(--a2ui-color-error, #f44336) 5%, var(--a2ui-color-surface));
    }
    .text-content {
      font-size: 16px;
      line-height: 2;
      color: var(--a2ui-color-on-surface);
      margin-bottom: 24px;
    }
    .blank-input {
      display: inline-block;
      margin: 0 4px;
      padding: 4px 12px;
      font-size: 16px;
      font-family: inherit;
      color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
      border: 1px dashed var(--a2ui-color-primary);
      border-radius: 6px;
      min-width: 80px;
      text-align: center;
      transition: all 0.2s;
      outline: none;
    }
    .blank-input:focus {
      border-style: solid;
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--a2ui-color-primary) 20%, transparent);
    }
    .blank-input:disabled {
      cursor: default;
      background: transparent;
    }
    
    .blank-input.is-correct {
      border-color: var(--a2ui-color-success, #4caf50);
      border-style: solid;
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 10%, transparent);
      color: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 80%, black);
      font-weight: 600;
    }
    .blank-input.is-incorrect {
      border-color: var(--a2ui-color-error, #f44336);
      border-style: solid;
      background: color-mix(in oklab, var(--a2ui-color-error, #f44336) 10%, transparent);
      color: color-mix(in oklab, var(--a2ui-color-error, #f44336) 80%, black);
      text-decoration: line-through;
    }
    
    .correct-answer-hint {
      display: inline-block;
      font-size: 13px;
      color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 15%, transparent);
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 4px;
      font-weight: 600;
      animation: fadeIn 0.3s ease-out;
    }

    .submit-btn {
      display: inline-block;
      padding: 10px 24px;
      background: var(--a2ui-color-primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .submit-btn:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .explanation {
      margin-top: 20px;
      padding: 16px;
      border-radius: 10px;
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
      border-left: 4px solid var(--a2ui-color-primary);
      font-size: 14px;
      line-height: 1.6;
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  @state() private localAnswers: string[] = [];
  @state() private localStatus: 'idle' | 'correct' | 'incorrect' = 'idle';
  @state() private showAnswers = false;

  protected createController() {
    return new A2uiController(this, ClozeTestApi);
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

  private handleInputChange(e: Event, index: number) {
    const input = e.target as HTMLInputElement;
    const newAnswers = [...this.localAnswers];
    newAnswers[index] = input.value.trim();
    this.localAnswers = newAnswers;
    (this as any).requestUpdate();
  }

  private handleSubmit(correctAnswers: string[]) {
    if (this.localStatus !== 'idle') return;
    
    const props = (this as any).controller?.props;
    if (!props) return;

    let isAllCorrect = true;
    if (correctAnswers.length > 0) {
      // 前端闭环校验逻辑
      isAllCorrect = correctAnswers.every(
        (ans, i) => this.localAnswers[i]?.toLowerCase() === ans.toLowerCase()
      );
      this.localStatus = isAllCorrect ? 'correct' : 'incorrect';
      this.showAnswers = true;
    } else {
      // 如果没有答案，直接当作提交成功
      this.localStatus = 'correct';
      this.showAnswers = true;
    }
    (this as any).requestUpdate();

    if (props.onSubmit) {
      (this as any).context.dispatchAction({
        ...(props.onSubmit as Record<string, unknown>),
        context: { isCorrect: isAllCorrect, userAnswers: this.localAnswers },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const rawText = this.resolveString(props.text);
    const correctAnswers = (props.correctAnswers || []).map((a: unknown) => this.resolveString(a));
    const explanation = props.explanation ? this.resolveString(props.explanation) : null;
    
    const status = this.localStatus;
    const hasAnswered = status !== 'idle';
    
    // 允许直接提交：不阻塞用户点击，评判逻辑在 handleSubmit 中处理
    const isReadyToSubmit = true;

    // 解析文本中的占位符 ___
    const parts = rawText.split('___');

    return html`
      <div class="cloze-card ${status}">
        <div class="text-content">
          ${parts.map((part, index) => {
            const isLast = index === parts.length - 1;
            
            // 渲染占位符对应的 Input
            let inputHtml = nothing;
            if (!isLast) {
              let inputClass = 'blank-input';
              let hintHtml = nothing;
              
              if (hasAnswered) {
                const userAns = this.localAnswers[index] || '';
                const correctAns = correctAnswers[index] || '';
                const isMatch = userAns.toLowerCase() === correctAns.toLowerCase();
                
                inputClass += isMatch ? ' is-correct' : ' is-incorrect';
                
                // 如果答错了，旁边显示正确答案提示
                if (!isMatch && this.showAnswers) {
                  hintHtml = html`<span class="correct-answer-hint">${correctAns}</span>`;
                }
              }

              inputHtml = html`
                <input 
                  type="text" 
                  class="${inputClass}"
                  .value=${this.localAnswers[index] || ''}
                  @input=${(e: Event) => this.handleInputChange(e, index)}
                  ?disabled=${hasAnswered}
                  autocomplete="off"
                  spellcheck="false"
                />
                ${hintHtml}
              `;
            }

            return html`<span>${unsafeHTML(sanitizeHtml(part))}</span>${inputHtml}`;
          })}
        </div>

        ${!hasAnswered ? html`
          <button 
            class="submit-btn" 
            @click=${() => this.handleSubmit(correctAnswers)}
            ?disabled=${!isReadyToSubmit}
          >
            Check Answers
          </button>
        ` : nothing}
        
        ${hasAnswered && explanation && status === 'incorrect' ? html`
          <div class="explanation">
            <strong>解析：</strong><br/>
            ${unsafeHTML(sanitizeHtml(explanation))}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-cloze-test")) {
  customElements.define("a2learn-cloze-test", A2learnClozeTestElement as any);
}

export const A2learnClozeTest = {
  ...ClozeTestApi,
  tagName: "a2learn-cloze-test",
};
