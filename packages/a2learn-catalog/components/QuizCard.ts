import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { QuizCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnQuizCardElement extends A2uiLitElement<typeof QuizCardApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-m) 0;
      font-family: var(--a2ui-font-family);
    }
    .quiz-container {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .quiz-header {
      padding: 16px 20px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border-bottom: 1px solid var(--a2ui-color-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .quiz-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: var(--a2ui-color-on-surface);
    }
    .quiz-progress {
      font-size: 13px;
      color: var(--app-muted);
      font-weight: 500;
    }
    .question-block {
      padding: 20px;
      display: none;
      animation: fadeIn 0.3s ease-out;
    }
    .question-block.active {
      display: block;
    }
    .question-text {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
      color: var(--a2ui-color-on-surface);
    }
    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .option {
      padding: 14px 16px;
      border: 2px solid var(--a2ui-color-border);
      border-radius: 8px;
      cursor: pointer;
      background: var(--a2ui-color-surface);
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      color: var(--a2ui-color-on-surface);
    }
    .option:hover:not(.disabled) {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, var(--a2ui-color-primary));
    }
    .option.selected {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-surface) 90%, var(--a2ui-color-primary));
    }
    .option.correct {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
      color: #166534;
    }
    .option.incorrect {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      color: #991b1b;
    }
    .option.disabled {
      cursor: default;
      opacity: 0.8;
    }
    .option-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid var(--app-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .option-radio {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid var(--app-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .option.selected .option-checkbox,
    .option.selected .option-radio {
      border-color: var(--a2ui-color-primary);
      background: var(--a2ui-color-primary);
    }
    .option.selected .option-checkbox::after {
      content: "✓";
      color: white;
      font-size: 14px;
    }
    .option.selected .option-radio::after {
      content: "";
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
    }
    
    .action-bar {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    button {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-submit {
      background: var(--a2ui-color-primary);
      color: var(--a2ui-color-on-primary);
    }
    .btn-next {
      background: var(--a2ui-color-secondary);
      color: var(--a2ui-color-on-secondary);
    }

    .explanation-box {
      margin-top: 20px;
      padding: 16px;
      border-radius: 8px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border-left: 4px solid var(--app-muted);
      animation: slideDown 0.3s ease-out;
    }
    .explanation-box.correct {
      border-left-color: #22c55e;
      background: rgba(34, 197, 94, 0.05);
    }
    .explanation-box.incorrect {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.05);
    }
    .explanation-title {
      font-weight: 600;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .explanation-title.correct { color: #166534; }
    .explanation-title.incorrect { color: #991b1b; }
    .explanation-content {
      font-size: 14px;
      line-height: 1.5;
      color: var(--a2ui-color-on-surface);
      margin: 0;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  // { questionId: Set<number> }
  @state() private userSelections: Record<string, Set<number>> = {};
  // { questionId: boolean }
  @state() private submittedQuestions: Record<string, boolean> = {};
  
  @state() private currentQuestionIndex = 0;

  protected createController() {
    return new A2uiController(this, QuizCardApi);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private isMultiSelect(correctIndex: number | number[]): boolean {
    return Array.isArray(correctIndex);
  }

  private toggleSelection(qId: string, optIndex: number, isMulti: boolean, isSubmitted: boolean) {
    if (isSubmitted) return;

    const selections = this.userSelections[qId] ? new Set(this.userSelections[qId]) : new Set<number>();
    
    if (isMulti) {
      if (selections.has(optIndex)) {
        selections.delete(optIndex);
      } else {
        selections.add(optIndex);
      }
    } else {
      selections.clear();
      selections.add(optIndex);
    }

    this.userSelections = { ...this.userSelections, [qId]: selections };
    (this as any).requestUpdate();
  }

  private submitQuestion(qId: string) {
    const selections = this.userSelections[qId];
    if (!selections || selections.size === 0) return;

    this.submittedQuestions = { ...this.submittedQuestions, [qId]: true };
    (this as any).requestUpdate();
  }

  private nextQuestion() {
    const props = (this as any).controller?.props;
    if (props && this.currentQuestionIndex < props.questions.length - 1) {
      this.currentQuestionIndex++;
      (this as any).requestUpdate();
    }
  }

  private prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      (this as any).requestUpdate();
    }
  }

  private checkCorrectness(selections: Set<number>, correctIndex: number | number[] | undefined): boolean {
    if (correctIndex === undefined) return true; // 如果没有标准答案，直接算对
    if (Array.isArray(correctIndex)) {
      if (selections.size !== correctIndex.length) return false;
      return correctIndex.every(idx => selections.has(idx));
    }
    return selections.has(correctIndex);
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props || !props.questions || props.questions.length === 0) return nothing;

    const questions = props.questions;
    const title = props.title ? this.resolveString(props.title) : "互动测验";
    const total = questions.length;

    return html`
      <div class="quiz-container">
        <div class="quiz-header">
          <h3 class="quiz-title">${title}</h3>
          ${total > 1 ? html`<span class="quiz-progress">${this.currentQuestionIndex + 1} / ${total}</span>` : nothing}
        </div>

        ${questions.map((q: any, index: number) => {
          const qId = q.id;
          const isMulti = this.isMultiSelect(q.correctIndex);
          const selections = this.userSelections[qId] || new Set<number>();
          const isSubmitted = this.submittedQuestions[qId] || false;
          
          let isCorrect = false;
          if (isSubmitted) {
            isCorrect = this.checkCorrectness(selections, q.correctIndex);
          }

          return html`
            <div class="question-block ${index === this.currentQuestionIndex ? 'active' : ''}">
              <div class="question-text">${unsafeHTML(sanitizeHtml(this.resolveString(q.question)))}</div>
              
              <div class="options">
                ${q.options.map((opt: any, optIndex: number) => {
                  const isSelected = selections.has(optIndex);
                  
                  let optClass = "option";
                  if (isSelected) optClass += " selected";
                  if (isSubmitted) {
                    optClass += " disabled";
                    
                    if (q.correctIndex !== undefined) {
                      const isActualCorrect = isMulti 
                        ? (q.correctIndex as number[]).includes(optIndex)
                        : q.correctIndex === optIndex;
                      
                      if (isActualCorrect) {
                        optClass += " correct";
                      } else if (isSelected && !isActualCorrect) {
                        optClass += " incorrect";
                      }
                    } else if (isSelected) {
                      // 如果没有正确答案的配置，选中的项就当做是对的
                      optClass += " correct";
                    }
                  }

                  return html`
                    <div class="${optClass}" @click=${() => this.toggleSelection(qId, optIndex, isMulti, isSubmitted)}>
                      ${isMulti 
                        ? html`<div class="option-checkbox"></div>`
                        : html`<div class="option-radio"></div>`
                      }
                      <span class="option-text">${unsafeHTML(sanitizeHtml(this.resolveString(opt)))}</span>
                    </div>
                  `;
                })}
              </div>

              ${isSubmitted ? html`
                <div class="explanation-box ${isCorrect ? 'correct' : 'incorrect'}">
                  <h4 class="explanation-title ${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? "✅ 回答正确" : "❌ 回答错误"}
                  </h4>
                  ${q.explanation ? html`
                    <p class="explanation-content">${unsafeHTML(sanitizeHtml(this.resolveString(q.explanation)))}</p>
                  ` : nothing}
                </div>
              ` : nothing}

              <div class="action-bar">
                ${total > 1 && index > 0 ? html`
                  <button class="btn-next" @click=${this.prevQuestion}>上一题</button>
                ` : nothing}
                
                ${!isSubmitted ? html`
                  <button class="btn-submit" 
                    ?disabled=${selections.size === 0}
                    @click=${() => this.submitQuestion(qId)}>
                    提交答案
                  </button>
                ` : html`
                  ${index < total - 1 ? html`
                    <button class="btn-next" @click=${this.nextQuestion}>下一题</button>
                  ` : nothing}
                `}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-quiz-card")) {
  customElements.define("a2learn-quiz-card", A2learnQuizCardElement as any);
}

export const A2learnQuizCard = {
  ...QuizCardApi,
  tagName: "a2learn-quiz-card",
};
