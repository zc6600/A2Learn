import componentStyles from "../styles/components/QuizCard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { QuizCardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnQuizCardElement extends A2uiLitElement<typeof QuizCardApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
  ];

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
    this.requestUpdate();
  }

  private submitQuestion(qId: string) {
    const selections = this.userSelections[qId];
    if (!selections || selections.size === 0) return;

    this.submittedQuestions = { ...this.submittedQuestions, [qId]: true };
    this.requestUpdate();
  }

  private nextQuestion() {
    const props = this.controller?.props;
    if (props && this.currentQuestionIndex < props.questions.length - 1) {
      this.currentQuestionIndex++;
      this.requestUpdate();
    }
  }

  private prevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.requestUpdate();
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
    const props = this.controller?.props;
    if (!props) return nothing;

    let questions = props.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      if (props.question && Array.isArray(props.options)) {
        questions = [{
          id: "q1",
          question: props.question,
          options: props.options,
          correctIndex: props.correctIndex !== undefined ? props.correctIndex : 0,
          explanation: props.explanation || ""
        }];
      }
    }

    if (!questions || questions.length === 0) return nothing;

    const title = props.title ? this.resolveString(props.title) : uiText("互动测验", "Interactive Quiz");
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

          const qText = this.resolveString(q.question);

          return html`
            <div class="question-block ${index === this.currentQuestionIndex ? 'active' : ''}">
              <div class="question-text a2learn-markdown-body">${unsafeHTML(sanitizeHtml(qText))}</div>
              
              <div class="options">
                ${q.options.map((opt: any, optIndex: number) => {
                  const isSelected = selections.has(optIndex);
                  const optStr = this.resolveString(opt);
                  
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
                      optClass += " correct";
                    }
                  }

                  return html`
                    <div class="${optClass}" @click=${() => this.toggleSelection(qId, optIndex, isMulti, isSubmitted)}>
                      ${isMulti 
                        ? html`<div class="option-checkbox"></div>`
                        : html`<div class="option-radio"></div>`
                      }
                      <span class="option-text a2learn-markdown-body">${unsafeHTML(sanitizeHtml(optStr, { inline: true }))}</span>
                    </div>
                  `;
                })}
              </div>

              ${isSubmitted ? html`
                <div class="explanation-box ${isCorrect ? 'correct' : 'incorrect'}">
                  <h4 class="explanation-title ${isCorrect ? 'correct' : 'incorrect'}">
                    ${isCorrect ? uiText("✅ 回答正确", "✅ Correct") : uiText("❌ 回答错误", "❌ Incorrect")}
                  </h4>
                  ${q.explanation ? html`
                    <div class="explanation-content a2learn-markdown-body">${unsafeHTML(sanitizeHtml(this.resolveString(q.explanation)))}</div>
                  ` : nothing}
                </div>
              ` : nothing}

              <div class="action-bar">
                ${total > 1 && index > 0 ? html`
                  <button class="btn-next" @click=${this.prevQuestion}>${uiText("上一题", "Previous")}</button>
                ` : nothing}
                
                ${!isSubmitted ? html`
                  <button class="btn-submit" 
                    ?disabled=${selections.size === 0}
                    @click=${() => this.submitQuestion(qId)}>
                    ${uiText("提交答案", "Submit Answer")}
                  </button>
                ` : html`
                  ${index < total - 1 ? html`
                    <button class="btn-next" @click=${this.nextQuestion}>${uiText("下一题", "Next")}</button>
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
  customElements.define("a2learn-quiz-card", A2learnQuizCardElement);
}

export const A2learnQuizCard = {
  ...QuizCardApi,
  tagName: "a2learn-quiz-card",
};
