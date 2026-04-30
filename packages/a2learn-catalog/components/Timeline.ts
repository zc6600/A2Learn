import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { TimelineApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnTimelineElement extends A2uiLitElement<typeof TimelineApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .timeline-container {
      position: relative;
      padding: var(--a2ui-spacing-m) 0;
    }
    /* Vertical layout (default) */
    .timeline-vertical::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 15px; /* Center of the dot */
      width: 2px;
      background: var(--a2ui-color-border);
    }
    .timeline-item {
      position: relative;
      padding-left: 40px;
      margin-bottom: var(--a2ui-spacing-l);
    }
    .timeline-item:last-child {
      margin-bottom: 0;
    }
    .timeline-dot {
      position: absolute;
      left: 7px;
      top: 6px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--a2ui-color-primary);
      border: 2px solid var(--a2ui-color-surface);
      box-shadow: 0 0 0 2px var(--a2ui-color-border);
      z-index: 1;
    }
    .timeline-content {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: var(--a2ui-border-radius);
      padding: var(--a2ui-spacing-m);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .timeline-content:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-color: var(--a2ui-color-primary);
    }
    .timeline-time {
      font-size: var(--a2ui-font-size-s);
      color: var(--a2ui-color-primary);
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .timeline-title {
      font-size: var(--a2ui-font-size-m);
      font-weight: 600;
      color: var(--a2ui-color-on-surface);
      margin-bottom: 8px;
    }
    .timeline-desc {
      font-size: var(--a2ui-font-size-s);
      color: var(--a2ui-color-on-surface);
      opacity: 0.8;
      line-height: 1.5;
    }
    /* Horizontal layout */
    .timeline-horizontal {
      display: flex;
      gap: var(--a2ui-spacing-m);
      overflow-x: auto;
      padding-bottom: var(--a2ui-spacing-s);
    }
    .timeline-horizontal::before {
      content: none;
    }
    .timeline-horizontal .timeline-item {
      min-width: 240px;
      padding-left: 0;
      margin-bottom: 0;
    }
    .timeline-horizontal .timeline-dot {
      position: static;
      margin-bottom: 8px;
    }
    .timeline-horizontal .timeline-content {
      min-height: 120px;
    }
  `;

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

    return html`
      <div class="timeline-container ${orientation === "horizontal" ? "timeline-horizontal" : "timeline-vertical"}">
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
