import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SectionNavigatorApi } from "../api";
import { classMap } from "lit/directives/class-map.js";

export class A2learnSectionNavigatorElement extends A2uiLitElement<typeof SectionNavigatorApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .nav-container {
      display: flex;
      flex-direction: column;
      gap: var(--a2ui-spacing-m);
    }
    .nav-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--a2ui-color-on-surface);
      margin: 0 0 8px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }
    .section-card {
      background: var(--a2ui-color-surface);
      border: 2px solid var(--a2ui-color-border);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
    }
    .section-card:hover:not(.locked) {
      border-color: var(--a2ui-color-primary);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }
    .section-card.active {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, var(--a2ui-color-surface));
    }
    .section-card.locked {
      cursor: not-allowed;
      opacity: 0.6;
      background: #f8f9fa;
    }
    .section-card.completed {
      border-color: #34a853;
    }
    .icon-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 24px;
    }
    .status-badge {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.completed { background: #e8f5e9; color: #137333; }
    .status-badge.locked { background: #f1f3f4; color: #5f6368; }
    .status-badge.active { background: #e8f0fe; color: #1967d2; }
    
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--a2ui-color-on-surface);
      margin: 0;
    }
    .card-desc {
      font-size: 13px;
      color: var(--app-muted);
      margin: 0;
      line-height: 1.4;
    }
  `;

  protected createController() {
    return new A2uiController(this, SectionNavigatorApi);
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

  private handleSectionClick(section: any, normalizedStatus: string) {
    if (normalizedStatus === "locked") return;

    // 1. targetSurfaceId: cross-surface navigation
    if (section.targetSurfaceId) {
      window.location.hash = "#/" + section.targetSurfaceId;
    }

    // 2. targetComponentId: smooth scroll within the same page
    if (section.targetComponentId) {
      setTimeout(() => {
        const targetEl = this.findTargetElement(section.targetComponentId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    }

    // 3. Dispatch action so Agent/static handler can track and update active state
    const props = this.controller?.props;
    if (props && props.onSectionClick) {
      this.context.dispatchAction({
        ...(props.onSectionClick as Record<string, unknown>),
        context: { sectionId: section.id },
      });
    }
  }


  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "";
    const sections = props.sections || [];
    const activeId = props.activeSectionId;

    return html`
      <div class="nav-container">
        ${title ? html`<h2 class="nav-title">${title}</h2>` : nothing}
        <div class="grid">
          ${sections.map((sec: any) => {
            const secTitle = this.resolveString(sec.title);
            const secDesc = sec.description ? this.resolveString(sec.description) : "";
            const icon = sec.icon ? this.resolveString(sec.icon) : "📄";
            const status = sec.status || "available";
            const normalizedStatus =
              status === "pending" ? "available" : status;
            const isActive = sec.id === activeId || status === "current";

            const classes = {
              "section-card": true,
              "active": isActive,
              "locked": normalizedStatus === "locked",
              "completed": normalizedStatus === "completed" && !isActive
            };

            let badge = nothing;
            if (isActive) badge = html`<span class="status-badge active">CURRENT</span>`;
            else if (normalizedStatus === "completed") badge = html`<span class="status-badge completed">DONE</span>`;
            else if (normalizedStatus === "locked") badge = html`<span class="status-badge locked">LOCKED</span>`;

            return html`
              <div 
                class=${classMap(classes)} 
                @click=${() => this.handleSectionClick(sec, normalizedStatus)}
              >
                <div class="icon-header">
                  <span>${icon}</span>
                  ${badge}
                </div>
                <h3 class="card-title">${secTitle}</h3>
                ${secDesc ? html`<p class="card-desc">${secDesc}</p>` : nothing}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-section-navigator")) {
  customElements.define("a2learn-section-navigator", A2learnSectionNavigatorElement);
}

export const A2learnSectionNavigator = {
  ...SectionNavigatorApi,
  tagName: "a2learn-section-navigator",
};
