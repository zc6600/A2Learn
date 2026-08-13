import componentStyles from "../styles/components/LearningPath.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { LearningPathApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

const STAGE_LABELS = {
  problem: () => uiText("问题", "Problem"),
  outline: () => uiText("轮廓", "Outline"),
  solution: () => uiText("解法", "Solution"),
  deepening: () => uiText("深入", "Deepening"),
  newQuestion: () => uiText("新问题", "New Question"),
} as const;

export class A2learnLearningPathElement extends A2uiLitElement<typeof LearningPathApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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

  // Every catalog component (including this one) renders into its own
  // shadow root, and a2ui-surface itself is shadow-DOM too. document.getElementById /
  // document.querySelector can never cross a shadow boundary, so a plain
  // top-level lookup silently finds nothing. Walk the whole tree by hand,
  // descending into every node's shadowRoot, matching either a real id or
  // the data-component-id A2UI stamps on render.
  private findTargetElement(targetId: string): Element | null {
    const matches = (el: Element): boolean =>
      el.id === targetId || el.getAttribute("data-component-id") === targetId;

    const search = (root: ParentNode): Element | null => {
      const nodes = root.querySelectorAll("*");
      for (const node of Array.from(nodes)) {
        if (matches(node)) return node;
        const shadow = (node as any).shadowRoot as ShadowRoot | null | undefined;
        if (shadow) {
          const found = search(shadow);
          if (found) return found;
        }
      }
      return null;
    };

    return search(document.body);
  }

  private handleStepClick(step: any, status: 'completed' | 'current' | 'locked') {
    const props = this.controller?.props;

    // 1. 乐观更新游标
    this.localActiveId = step.id;
    this.requestUpdate();

    // 2. 跨 Surface 切换视角
    if (step.targetSurfaceId) {
      this.navigateToSurface(step.targetSurfaceId);
    }

    // 3. 同页或跨页 DOM 元素平滑滚动
    const targetSectionId = step.targetSectionId || step.targetComponentId;
    if (targetSectionId) {
      // Presentation mode may place the destination on a different generated
      // slide. The viewer listens for this composed event and changes slides
      // before the existing DOM scroll fallback runs.
      this.dispatchEvent(new CustomEvent("a2learn:navigate-component", {
        detail: { targetComponentId: targetSectionId },
        bubbles: true,
        composed: true,
      }));
      setTimeout(() => {
        const targetEl = this.findTargetElement(targetSectionId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    }

    // 4. 同时 dispatch，让 Agent 追踪点击行为
    if (props && props.onStepSelect) {
      this.context.dispatchAction({
        ...(props.onStepSelect as Record<string, unknown>),
        context: { stepId: step.id },
      });
    }
  }

  render() {
    const props = this.controller?.props;
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
            // A course navigator and an in-page learning structure are different
            // things. Only show a stage when the content explicitly supplies one;
            // never infer it from the position of a course module.
            const stage = step.stage as keyof typeof STAGE_LABELS | undefined;

            return html`
              <div class="step ${status}" @click=${() => this.handleStepClick(step, status)}>
                <div class="icon-wrapper">
                  <span class="step-index">${index + 1}</span>
                </div>
                <div class="content-wrapper">
                  ${stage && STAGE_LABELS[stage] ? html`<span class="stage-label">${STAGE_LABELS[stage]()}</span>` : nothing}
                  <h4 class="title">${this.resolveString(step.title)}</h4>
                  ${step.description ? html`<div class="desc a2learn-markdown-body">${unsafeHTML(sanitizeHtml(this.resolveString(step.description)))}</div>` : nothing}
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
  customElements.define("a2learn-learning-path", A2learnLearningPathElement);
}

export const A2learnLearningPath = {
  ...LearningPathApi,
  tagName: "a2learn-learning-path",
};
