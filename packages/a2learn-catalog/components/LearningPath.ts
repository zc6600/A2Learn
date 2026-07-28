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
      padding: 8px 12px 24px 12px;
      margin: 0 -12px;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.15s ease;
    }
    .step:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary) 6%, transparent);
    }
    .step:active {
      transform: scale(0.99);
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
    window.location.hash = "#/" + surfaceId;
    return true;
  }

  private handleStepClick(step: any, status: 'completed' | 'current' | 'locked') {
    const props = (this as any).controller?.props;

    // 1. 乐观更新游标
    this.localActiveId = step.id;
    (this as any).requestUpdate();

    // 2. 跨 Surface 切换视角
    if (step.targetSurfaceId) {
      this.navigateToSurface(step.targetSurfaceId);
    }

    // 3. 同页或跨页 DOM 元素平滑滚动
    const targetSectionId = step.targetSectionId || step.targetComponentId;
    if (targetSectionId) {
      setTimeout(() => {
        const targetEl = document.getElementById(targetSectionId) ||
          document.querySelector(`[data-component-id="${targetSectionId}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    }

    // 4. 同时 dispatch，让 Agent 追踪点击行为
    if (props && props.onStepSelect) {
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
    const activeId = this.localActiveId || props.activeStepId;
    const activeIndex = steps.findIndex((s: any) => s.id === activeId);

    return html`
      <div class="path-container">
        ${title ? html`<h3 class="path-title">${title}</h3>` : nothing}
        <div class="steps-wrapper">
          ${steps.map((step: any, index: number) => {
            let status: 'completed' | 'current' | 'locked' = 'locked';
            
            if (activeIndex === -1) {
              status = index === 0 ? 'current' : 'locked';
            } else {
              if (index < activeIndex) status = 'completed';
              else if (index === activeIndex) status = 'current';
              else status = 'locked';
            }

            return html`
              <div class="step ${status}" @click=${() => this.handleStepClick(step, status)}>
                <div class="icon-wrapper">
                  ${status === 'completed' ? '✓' : 
                    status === 'current' ? '●' : '🔒'}
                </div>
                <div class="content-wrapper">
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
