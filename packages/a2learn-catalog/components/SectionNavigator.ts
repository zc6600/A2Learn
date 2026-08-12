import componentStyles from "../styles/components/SectionNavigator.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { SectionNavigatorApi } from "../api";
import { classMap } from "lit/directives/class-map.js";

export class A2learnSectionNavigatorElement extends A2uiLitElement<typeof SectionNavigatorApi> {
  static styles = unsafeCSS(componentStyles);

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
