import componentStyles from "../styles/components/ClozeTest.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ClozeTestApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnClozeTestElement extends A2uiLitElement<typeof ClozeTestApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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
            <strong>${uiText("解析：", "Explanation:")}</strong><br/>
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
