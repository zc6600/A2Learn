import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SmartAnnotationBoardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnSmartAnnotationBoardElement extends A2uiLitElement<typeof SmartAnnotationBoardApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .board-card {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      margin-bottom: 20px;
    }
    .title {
      font-size: 18px;
      font-weight: 700;
      color: var(--a2ui-color-on-surface);
      margin: 0 0 8px 0;
    }
    .prompt {
      font-size: 14px;
      color: var(--app-muted);
      margin: 0;
      line-height: 1.5;
    }
    
    .editor-container {
      position: relative;
    }
    .textarea {
      width: 100%;
      min-height: 180px;
      padding: 16px;
      font-size: 15px;
      line-height: 1.6;
      font-family: inherit;
      color: var(--a2ui-color-on-surface);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border: 2px solid var(--a2ui-color-border);
      border-radius: 12px;
      resize: vertical;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .textarea:focus {
      outline: none;
      border-color: var(--a2ui-color-primary);
      background: var(--a2ui-color-surface);
    }
    .textarea:disabled {
      cursor: default;
      opacity: 0.8;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
    }

    .annotated-text {
      min-height: 180px;
      padding: 16px;
      font-size: 15px;
      line-height: 1.8;
      color: var(--a2ui-color-on-surface);
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      white-space: pre-wrap;
    }
    
    .annotation-mark {
      position: relative;
      cursor: pointer;
      border-bottom: 2px dashed transparent;
      padding: 0 2px;
      border-radius: 2px;
      transition: background 0.2s;
    }
    .annotation-mark.type-error {
      border-bottom-color: var(--a2ui-color-error, #f44336);
      background: color-mix(in oklab, var(--a2ui-color-error, #f44336) 10%, transparent);
    }
    .annotation-mark.type-good {
      border-bottom-color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 10%, transparent);
    }
    .annotation-mark.type-suggestion {
      border-bottom-color: #ff9800;
      background: color-mix(in oklab, #ff9800 10%, transparent);
    }
    .annotation-mark:hover {
      filter: brightness(0.95);
    }

    .annotation-tooltip {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #333;
      color: white;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 6px;
      width: max-content;
      max-width: 250px;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      pointer-events: none;
    }
    .annotation-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
    }
    .annotation-mark:hover .annotation-tooltip {
      display: block;
      animation: tooltipFadeIn 0.2s ease-out;
    }
    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translate(-50%, 5px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    .word-count {
      font-size: 13px;
      color: var(--app-muted);
    }
    .btn-submit {
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
    .btn-submit:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .btn-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .feedback-panel {
      margin-top: 24px;
      padding: 20px;
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
      border-radius: 12px;
      border-left: 4px solid var(--a2ui-color-primary);
      animation: fadeIn 0.4s ease-out;
    }
    .feedback-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .feedback-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--a2ui-color-primary);
      margin: 0;
    }
    .score-badge {
      font-size: 18px;
      font-weight: 800;
      color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 10%, transparent);
      padding: 4px 12px;
      border-radius: 20px;
    }
    .overall-comment {
      font-size: 14px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface);
    }
  `;

  @state() private localContent = "";
  private lastUserContent = "";

  protected createController() {
    return new A2uiController(this, SmartAnnotationBoardApi);
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has("controller")) {
      const props = (this as any).controller?.props;
      if (props) {
        const nextContent = this.resolveString(props.userContent || "");
        if (this.lastUserContent !== nextContent) {
          this.localContent = nextContent;
          this.lastUserContent = nextContent;
        }
      }
    }
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

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.localContent = target.value;
    (this as any).requestUpdate();
  }

  private handleSubmit() {
    const props = (this as any).controller?.props;
    if (!props || !this.localContent.trim()) return;

    if (props.onSubmit) {
      (this as any).context.dispatchAction({
        ...(props.onSubmit as Record<string, unknown>),
        context: { content: this.localContent },
      });
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // 高亮替换逻辑：将原文中的 quote 替换为带样式的 mark
  private renderAnnotatedText(text: string, annotations: any[]) {
    if (!annotations || annotations.length === 0) {
      return this.escapeHtml(text);
    }

    let htmlStr = this.escapeHtml(text);
    
    // 按引用长度从长到短排序，避免短片段错误匹配长片段的子串
    const sortedAnns = [...annotations].sort((a, b) => {
      const qa = this.resolveString(a.quote) || "";
      const qb = this.resolveString(b.quote) || "";
      return qb.length - qa.length;
    });

    sortedAnns.forEach(ann => {
      const quote = this.escapeHtml(this.resolveString(ann.quote));
      const comment = this.escapeHtml(this.resolveString(ann.comment));
      const type = ann.type || "suggestion";
      
      if (quote && htmlStr.includes(quote)) {
        // Simple string replace. For robustness, regex with word boundaries could be used.
        const replacement = `<span class="annotation-mark type-${type}">${quote}<div class="annotation-tooltip">${comment}</div></span>`;
        htmlStr = htmlStr.replace(quote, replacement);
      }
    });

    return unsafeHTML(sanitizeHtml(htmlStr));
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const prompt = props.prompt ? this.resolveString(props.prompt) : null;
    const status = props.status || "idle";
    const feedback = props.feedback;
    
    const displayContent = this.localContent;
    const wordCount = displayContent.trim() ? displayContent.trim().split(/\s+/).length : 0;
    
    const isReviewing = status === "reviewing";
    const isReviewed = status === "reviewed";

    return html`
      <div class="board-card">
        <div class="header">
          <h3 class="title">${title}</h3>
          ${prompt ? html`<p class="prompt">${prompt}</p>` : nothing}
        </div>

        <div class="editor-container">
          ${isReviewed ? html`
            <div class="annotated-text">
              ${this.renderAnnotatedText(displayContent, feedback?.inlineAnnotations || [])}
            </div>
          ` : html`
            <textarea 
              class="textarea" 
              placeholder=${uiText("在这里输入你的内容...", "Enter your response here...")}
              .value=${displayContent}
              @input=${this.handleInput}
              ?disabled=${isReviewing}
            ></textarea>
          `}
        </div>

        ${!isReviewed ? html`
          <div class="footer-actions">
            <span class="word-count">${wordCount} words</span>
            <button 
              class="btn-submit" 
              @click=${this.handleSubmit}
              ?disabled=${isReviewing || wordCount === 0}
            >
              ${isReviewing ? uiText("处理中...", "Processing...") : uiText("提交", "Submit")}
            </button>
          </div>
        ` : nothing}

        ${isReviewed && feedback ? html`
          <div class="feedback-panel">
            <div class="feedback-header">
              <h4 class="feedback-title">${uiText("AI 反馈与批注", "AI Feedback and Annotations")}</h4>
              ${feedback.score !== undefined ? html`<div class="score-badge">${feedback.score} ${uiText("分", "points")}</div>` : nothing}
            </div>
            ${feedback.overallComment ? html`
              <div class="overall-comment">
                ${unsafeHTML(sanitizeHtml(this.resolveString(feedback.overallComment)))}
              </div>
            ` : nothing}
            ${feedback.inlineAnnotations?.length > 0 ? html`
              <p style="font-size: 13px; color: var(--app-muted); margin-top: 12px; margin-bottom: 0;">
                💡 ${uiText("提示：将鼠标悬浮在原文的高亮片段上，可以查看行内批注详情。", "Tip: Hover over highlighted text to view its inline annotation.")}
              </p>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-smart-annotation-board")) {
  customElements.define("a2learn-smart-annotation-board", A2learnSmartAnnotationBoardElement as any);
}

export const A2learnSmartAnnotationBoard = {
  ...SmartAnnotationBoardApi,
  tagName: "a2learn-smart-annotation-board",
};
