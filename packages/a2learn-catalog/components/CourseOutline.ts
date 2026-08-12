import componentStyles from "../styles/components/CourseOutline.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { CourseOutlineApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnCourseOutlineElement extends A2uiLitElement<typeof CourseOutlineApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
  ];

  protected createController() {
    return new A2uiController(this, CourseOutlineApi);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private getStatusIcon(status: string) {
    switch (status) {
      case "completed": return "✓";
      case "current": return "▶";
      case "expanded": return "▼";
      case "locked": return "🔒";
      default: return "·";
    }
  }

  private getActionText(status: string) {
    switch (status) {
      case "completed": return uiText("复习", "Review");
      case "current": return uiText("开始学习", "Start Learning");
      case "expanded": return uiText("收起", "Collapse");
      case "locked": return uiText("未解锁", "Locked");
      default: return uiText("查看", "View");
    }
  }

  private handleModuleClick(mod: any) {
    if (mod.status === "locked") return;
    
    // 发送 action 给 Agent
    this.controller?.triggerAction("onModuleSelect", { moduleId: mod.id });
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    return html`
      <div class="outline-container">
        <div class="course-header">
          <h2 class="course-title">${this.resolveString(props.courseTitle)}</h2>
          ${props.description ? html`<div class="course-desc a2learn-markdown-body">${unsafeHTML(sanitizeHtml(this.resolveString(props.description)))}</div>` : nothing}
        </div>

        <div class="modules-list">
          ${props.modules?.map((mod: any) => html`
            <div class="module-item status-${mod.status}">
              <div class="module-header" @click=${() => this.handleModuleClick(mod)}>
                <div class="status-icon">${this.getStatusIcon(mod.status)}</div>
                <div class="module-content">
                  <h3 class="module-title">${this.resolveString(mod.title)}</h3>
                  ${mod.description ? html`<div class="module-desc a2learn-markdown-body">${unsafeHTML(sanitizeHtml(this.resolveString(mod.description), { inline: true }))}</div>` : nothing}
                </div>
                ${mod.status !== "locked" ? html`
                  <button class="action-btn">${this.getActionText(mod.status)}</button>
                ` : nothing}
              </div>
              
              <!-- 原位展开的子区域，Agent 会将子组件挂载到这个 DOM 节点下（需要 A2UI 框架层的容器支持） -->
              <div class="expansion-area">
                 <!-- 在这里，我们预留一个提示，或者利用 A2UI 的 children slot 机制 -->
                 <div class="child-container" id="child-container-${mod.id}">
                    ${mod.status === "expanded" ? html`<div style="color: var(--app-muted); text-align: center; font-size: 13px;">${uiText("Agent 生成的内容将在此处原位展开...", "Agent-generated content will expand here...")}</div>` : nothing}
                 </div>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-course-outline")) {
  customElements.define("a2learn-course-outline", A2learnCourseOutlineElement);
}

export const A2learnCourseOutline = {
  ...CourseOutlineApi,
  tagName: "a2learn-course-outline",
};
