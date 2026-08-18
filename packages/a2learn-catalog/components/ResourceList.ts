import componentStyles from "../styles/components/ResourceList.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ResourceListApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnResourceListElement extends A2uiLitElement<typeof ResourceListApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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
    const resources = props.resources || props.items || props.links || [];

    return html`
      <div class="resource-container">
        <h3 class="title">${title}</h3>
        <div class="resource-list">
          ${resources.map((res: any) => {
            const itemTitle = this.resolveString(res.title || res.name || res.label);
            const url = this.resolveString(res.url || res.link || res.href);
            const desc = this.resolveString(res.description || res.desc || res.summary || "");
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
