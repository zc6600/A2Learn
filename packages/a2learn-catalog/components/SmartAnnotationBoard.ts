import componentStyles from "../styles/components/SmartAnnotationBoard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SmartAnnotationBoardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnSmartAnnotationBoardElement extends A2uiLitElement<typeof SmartAnnotationBoardApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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
                ${uiText("提示：将鼠标悬浮在原文的高亮片段上，可以查看行内批注详情。", "Tip: Hover over highlighted text to view its inline annotation.")}
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
