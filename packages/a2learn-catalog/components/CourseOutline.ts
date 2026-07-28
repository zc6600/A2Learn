import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { CourseOutlineApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnCourseOutlineElement extends A2uiLitElement<typeof CourseOutlineApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .outline-container {
      background: var(--a2ui-color-surface);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--a2ui-color-border);
    }
    .course-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid color-mix(in oklab, var(--a2ui-color-primary) 15%, transparent);
    }
    .course-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: var(--a2ui-color-on-surface);
    }
    .course-desc {
      font-size: 15px;
      color: var(--app-muted);
      line-height: 1.5;
      margin: 0;
    }
    .modules-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .module-item {
      border: 1px solid var(--a2ui-color-border);
      border-radius: 10px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 98%, black);
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .module-header {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      cursor: pointer;
    }
    .module-item.status-current {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, var(--a2ui-color-primary));
    }
    .module-item.status-expanded {
      border-color: var(--a2ui-color-primary);
      box-shadow: 0 4px 12px color-mix(in oklab, var(--a2ui-color-primary) 15%, transparent);
    }
    .module-item.status-completed .module-title {
      color: #16a34a;
    }
    .module-item.status-locked {
      opacity: 0.6;
      cursor: not-allowed;
      background: color-mix(in oklab, var(--a2ui-color-surface) 90%, black);
    }
    
    .status-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .status-current .status-icon { background: var(--a2ui-color-primary); color: white; }
    .status-completed .status-icon { background: #16a34a; color: white; }
    .status-locked .status-icon { background: var(--app-muted); color: white; }
    .status-expanded .status-icon { background: var(--a2ui-color-primary); color: white; }

    .module-content {
      flex: 1;
    }
    .module-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: var(--a2ui-color-on-surface);
    }
    .module-desc {
      font-size: 13px;
      color: var(--app-muted);
      margin: 0;
    }
    .action-btn {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: var(--a2ui-color-primary);
      color: white;
      border: none;
      cursor: pointer;
    }
    .status-expanded .action-btn {
      background: var(--app-muted);
    }

    .expansion-area {
      border-top: 1px dashed var(--a2ui-color-border);
      padding: 24px;
      background: var(--a2ui-color-surface);
      display: none;
    }
    .module-item.status-expanded .expansion-area {
      display: block;
      animation: slideDown 0.3s ease-out;
    }
    
    /* 这里的 child-container 是给 A2UI 留的插槽位 */
    .child-container {
      min-height: 50px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

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
      case "completed": return "复习";
      case "current": return "开始学习";
      case "expanded": return "收起";
      case "locked": return "未解锁";
      default: return "查看";
    }
  }

  private handleModuleClick(mod: any) {
    if (mod.status === "locked") return;
    
    // 发送 action 给 Agent
    this.controller?.triggerAction("onModuleSelect", { moduleId: mod.id });
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    return html`
      <div class="outline-container">
        <div class="course-header">
          <h2 class="course-title">${this.resolveString(props.courseTitle)}</h2>
          ${props.description ? html`<p class="course-desc">${unsafeHTML(sanitizeHtml(this.resolveString(props.description)))}</p>` : nothing}
        </div>

        <div class="modules-list">
          ${props.modules?.map((mod: any) => html`
            <div class="module-item status-${mod.status}">
              <div class="module-header" @click=${() => this.handleModuleClick(mod)}>
                <div class="status-icon">${this.getStatusIcon(mod.status)}</div>
                <div class="module-content">
                  <h3 class="module-title">${this.resolveString(mod.title)}</h3>
                  ${mod.description ? html`<p class="module-desc">${this.resolveString(mod.description)}</p>` : nothing}
                </div>
                ${mod.status !== "locked" ? html`
                  <button class="action-btn">${this.getActionText(mod.status)}</button>
                ` : nothing}
              </div>
              
              <!-- 原位展开的子区域，Agent 会将子组件挂载到这个 DOM 节点下（需要 A2UI 框架层的容器支持） -->
              <div class="expansion-area">
                 <!-- 在这里，我们预留一个提示，或者利用 A2UI 的 children slot 机制 -->
                 <div class="child-container" id="child-container-${mod.id}">
                    ${mod.status === "expanded" ? html`<div style="color: var(--app-muted); text-align: center; font-size: 13px;">Agent 生成的内容将在此处原位展开...</div>` : nothing}
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
  customElements.define("a2learn-course-outline", A2learnCourseOutlineElement as any);
}

export const A2learnCourseOutline = {
  ...CourseOutlineApi,
  tagName: "a2learn-course-outline",
};
