import componentStyles from "../styles/components/Timeline.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { TimelineApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnTimelineElement extends A2uiLitElement<typeof TimelineApi> {
  static styles = unsafeCSS(componentStyles);

  protected createController() {
    return new A2uiController(this, TimelineApi);
  }

  private handleEventClick(id: string) {
    const props = (this as any).controller?.props;
    if (props?.onEventSelect) {
      (this as any).context.dispatchAction({
        ...(props.onEventSelect as Record<string, unknown>),
        context: { eventId: id },
      });
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

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const events = props.events || [];
    const orientation = props.orientation === "horizontal" ? "horizontal" : "vertical";
    const variant = props.variant === "journey" && orientation === "vertical" ? "journey" : "default";

    return html`
      <div class="timeline-container ${variant === "journey" ? "timeline-journey" : orientation === "horizontal" ? "timeline-horizontal" : "timeline-vertical"}">
        ${events.map((event: any) => html`
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content" @click=${() => this.handleEventClick(event.id)}>
              <div class="timeline-time">${unsafeHTML(sanitizeHtml(this.resolveString(event.time)))}</div>
              <div class="timeline-title">${unsafeHTML(sanitizeHtml(this.resolveString(event.title)))}</div>
              ${event.description ? html`
                <div class="timeline-desc">${unsafeHTML(sanitizeHtml(this.resolveString(event.description)))}</div>
              ` : nothing}
            </div>
          </div>
        `)}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-timeline")) {
  customElements.define("a2learn-timeline", A2learnTimelineElement as any);
}

export const A2learnTimeline = {
  ...TimelineApi,
  tagName: "a2learn-timeline",
};
