import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ResourceListApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnResourceListElement extends A2uiLitElement<typeof ResourceListApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
    }
    .resource-container {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: var(--a2ui-border-radius);
      padding: var(--a2ui-spacing-l);
    }
    .title {
      font-size: var(--a2ui-font-size-l);
      font-weight: 700;
      color: var(--a2ui-color-on-surface);
      margin: 0 0 var(--a2ui-spacing-m) 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title::before {
      content: "📚";
    }
    .resource-list {
      display: flex;
      flex-direction: column;
      gap: var(--a2ui-spacing-m);
    }
    .resource-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: var(--a2ui-spacing-m);
      border-radius: var(--a2ui-border-radius);
      background: color-mix(in oklab, var(--a2ui-color-surface) 96%, var(--a2ui-color-primary));
      border: 1px solid transparent;
      transition: all 0.2s ease;
      text-decoration: none;
      color: inherit;
    }
    .resource-item:hover {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-surface) 90%, var(--a2ui-color-primary));
    }
    .icon {
      font-size: 24px;
      line-height: 1;
    }
    .content {
      flex: 1;
    }
    .item-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--a2ui-color-primary);
      margin: 0 0 4px 0;
    }
    .item-desc {
      font-size: 13px;
      color: var(--app-muted);
      margin: 0;
      line-height: 1.4;
    }
    .external-link-icon {
      font-size: 12px;
      color: var(--app-muted);
      margin-left: 4px;
    }
  `;

  protected createController() {
    return new A2uiController(this, ResourceListApi);
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

  private getIconForType(type: string): string {
    switch (type) {
      case "wiki": return "🌐";
      case "video": return "🎥";
      case "github": return "🐙";
      case "doc": return "📄";
      case "article":
      default: return "📝";
    }
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : uiText("延伸阅读与资源", "Further Reading and Resources");
    const resources = props.resources || [];

    return html`
      <div class="resource-container">
        <h3 class="title">${title}</h3>
        <div class="resource-list">
          ${resources.map((res: any) => {
            const itemTitle = this.resolveString(res.title);
            const url = this.resolveString(res.url);
            const desc = res.description ? this.resolveString(res.description) : "";
            const type = res.type || "article";
            
            return html`
              <a href="${url}" target="_blank" rel="noopener noreferrer" class="resource-item">
                <div class="icon">${this.getIconForType(type)}</div>
                <div class="content">
                  <h4 class="item-title">${itemTitle} <span class="external-link-icon">↗</span></h4>
                  ${desc ? html`<p class="item-desc">${unsafeHTML(sanitizeHtml(desc))}</p>` : nothing}
                </div>
              </a>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-resource-list")) {
  customElements.define("a2learn-resource-list", A2learnResourceListElement);
}

export const A2learnResourceList = {
  ...ResourceListApi,
  tagName: "a2learn-resource-list",
};
