import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { LearningPathApi } from "../api";

export class A2learnLearningPathElement extends A2uiLitElement<typeof LearningPathApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .path-container {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    }
    .path-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--a2ui-color-on-surface);
      margin: 0 0 24px 0;
      text-align: center;
    }
    .steps-wrapper {
      position: relative;
    }
    .step {
      display: flex;
      gap: 16px;
      position: relative;
      padding-bottom: 24px;
    }
    .step:last-child {
      padding-bottom: 0;
    }
    .step::before {
      content: "";
      position: absolute;
      left: 15px;
      top: 32px;
      bottom: 0;
      width: 2px;
      background: var(--a2ui-color-border);
      z-index: 0;
    }
    .step:last-child::before {
      display: none;
    }
    /* Past step line */
    .step.completed::before {
      background: var(--a2ui-color-primary);
    }
    
    .icon-wrapper {
      position: relative;
      z-index: 1;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--a2ui-color-surface);
      border: 2px solid var(--a2ui-color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }
    .step.completed .icon-wrapper {
      border-color: var(--a2ui-color-primary);
      background: var(--a2ui-color-primary);
      color: white;
    }
    .step.current .icon-wrapper {
      border-color: var(--a2ui-color-primary);
      border-width: 3px;
      box-shadow: 0 0 0 4px color-mix(in oklab, var(--a2ui-color-primary) 15%, transparent);
    }
    .step.locked .icon-wrapper {
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      color: var(--a2ui-color-border);
    }

    .content-wrapper {
      flex: 1;
      padding-top: 4px;
      cursor: pointer;
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: -4px;
      transition: background 0.2s;
    }
    .step:not(.locked) .content-wrapper:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
    }
    .step.locked .content-wrapper {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .title {
      font-weight: 600;
      font-size: 15px;
      color: var(--a2ui-color-on-surface);
      margin: 0 0 4px 0;
    }
    .step.completed .title {
      color: var(--a2ui-color-primary);
    }
    .step.current .title {
      color: var(--a2ui-color-primary);
      font-weight: 700;
    }
    .desc {
      font-size: 13px;
      color: var(--app-muted);
      margin: 0;
      line-height: 1.4;
    }
  `;

  // Local optimistic state
  @state() private localActiveId: string | null = null;

  protected createController() {
    return new A2uiController(this, LearningPathApi);
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

  private navigateToSurface(surfaceId: string): boolean {
    // 尝试在当前文档里找到对应的 surface
    const candidates = [
      document.querySelector(`[data-surface-id="${surfaceId}"]`),
      document.getElementById(`surface-${surfaceId}`),
      document.getElementById(surfaceId),
    ];
    const target = candidates.find(Boolean) as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // 尚光效果：简短闪烁高亮
      target.style.transition = "box-shadow 0.3s ease";
      target.style.boxShadow = "0 0 0 3px var(--a2ui-color-primary)";
      setTimeout(() => { target.style.boxShadow = ""; }, 1200);
      return true;
    }
    // 如果 viewer 在 iframe 里，尝试通过 postMessage 通知父级
    if (window.parent !== window) {
      window.parent.postMessage({ type: "a2learn:navigate", surfaceId }, "*");
      return true;
    }
    return false;
  }

  private handleStepClick(step: any, status: 'completed' | 'current' | 'locked') {
    const props = (this as any).controller?.props;
    if (!props) return;

    // 1. 乐观更新游标
    this.localActiveId = step.id;
    (this as any).requestUpdate();

    // 2. 如果 step 配置了 targetSurfaceId，直接滚动导航
    if (step.targetSurfaceId) {
      this.navigateToSurface(step.targetSurfaceId);
    }

    // 3. 同时 dispatch，让 Agent 也知道用户点击了
    if (props.onStepSelect) {
      (this as any).context.dispatchAction({
        ...(props.onStepSelect as Record<string, unknown>),
        context: { stepId: step.id },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const steps = props.steps || [];
    
    // Determine the active cursor
    // 优先使用前端乐观更新的 localActiveId，如果没被点击过，则使用 Agent 下发的 activeStepId
    const activeId = this.localActiveId || props.activeStepId;
    
    // Find the index of the active step to determine the status of all steps
    const activeIndex = steps.findIndex((s: any) => s.id === activeId);

    return html`
      <div class="path-container">
        ${title ? html`<h3 class="path-title">${title}</h3>` : nothing}
        <div class="steps-wrapper">
          ${steps.map((step: any, index: number) => {
            // Self-consistent status calculation
            let status: 'completed' | 'current' | 'locked' = 'locked';
            
            if (activeIndex === -1) {
              // If activeId not found, default to first step being current
              status = index === 0 ? 'current' : 'locked';
            } else {
              if (index < activeIndex) status = 'completed';
              else if (index === activeIndex) status = 'current';
              else status = 'locked';
            }

            return html`
              <div class="step ${status}">
                <div class="icon-wrapper">
                  ${status === 'completed' ? '✓' : 
                    status === 'current' ? '●' : '🔒'}
                </div>
                <div class="content-wrapper" @click=${() => this.handleStepClick(step, status)}>
                  <h4 class="title">${this.resolveString(step.title)}</h4>
                  ${step.description ? html`<p class="desc">${this.resolveString(step.description)}</p>` : nothing}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-learning-path")) {
  customElements.define("a2learn-learning-path", A2learnLearningPathElement as any);
}

export const A2learnLearningPath = {
  ...LearningPathApi,
  tagName: "a2learn-learning-path",
};
