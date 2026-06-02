import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { LiteratureReferenceApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnLiteratureReferenceElement extends A2uiLitElement<typeof LiteratureReferenceApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-m, 12px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .ref-card {
      border: 1px dashed var(--a2ui-color-border, #e2e8f0);
      border-radius: var(--a2ui-border-radius, 12px);
      background: color-mix(in oklab, var(--a2ui-color-surface, #ffffff) 98%, #000000);
      padding: var(--a2ui-spacing-l, 20px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      transition: all 0.2s ease;
      cursor: default;
    }
    .ref-card-clickable {
      cursor: pointer;
      border-style: solid;
    }
    .ref-card-clickable:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border-color: var(--a2ui-color-primary, #3b82f6);
      background: var(--a2ui-color-surface, #ffffff);
    }
    .header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .citation-badge {
      background: var(--a2ui-color-primary, #3b82f6);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
    .ref-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.4;
      margin: 0;
      color: var(--a2ui-color-on-surface, #0f172a);
    }
    .ref-title-link {
      color: inherit;
      text-decoration: none;
    }
    .ref-title-link:hover {
      color: var(--a2ui-color-primary, #3b82f6);
      text-decoration: underline;
    }
    .authors {
      font-size: 13px;
      color: var(--app-muted, #64748b);
      margin-left: 0;
      margin-bottom: 12px;
    }
    .quote-box {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 4%, var(--a2ui-color-surface, #ffffff));
      border-left: 3px solid var(--a2ui-color-primary, #3b82f6);
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.5;
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #334155) 85%, transparent);
      margin: 8px 0 0 0;
      font-style: italic;
      border-radius: 0 6px 6px 0;
    }
    .action-tip {
      display: flex;
      justify-content: flex-end;
      font-size: 11px;
      font-weight: 600;
      color: var(--a2ui-color-primary, #3b82f6);
      margin-top: 12px;
      opacity: 0.8;
    }
  `;

  protected createController() {
    return new A2uiController(this, LiteratureReferenceApi);
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

  private handleRefClick(event: Event) {
    const props = this.controller?.props;
    if (props?.onReferenceClick) {
      event.stopPropagation();
      this.context.dispatchAction({
        ...(props.onReferenceClick as Record<string, unknown>),
        context: {
          citation: this.resolveString(props.citation),
          title: this.resolveString(props.title),
        },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const citation = this.resolveString(props.citation);
    const title = this.resolveString(props.title);
    const url = props.url ? this.resolveString(props.url) : "";
    const highlightQuote = props.highlightQuote ? this.resolveString(props.highlightQuote) : "";

    const authors = props.authors
      ? (props.authors as unknown[]).map(a => this.resolveString(a)).join(", ")
      : "";

    const hasAction = !!props.onReferenceClick;

    return html`
      <div 
        class="ref-card ${hasAction ? 'ref-card-clickable' : ''}" 
        @click=${this.handleRefClick}
      >
        <div class="header">
          <span class="citation-badge">${citation}</span>
          <h4 class="ref-title">
            ${url
              ? html`
                  <a class="ref-title-link" href="${url}" target="_blank" @click=${(e: Event) => e.stopPropagation()}>
                    ${title} 🔗
                  </a>
                `
              : title}
          </h4>
        </div>
        
        ${authors ? html`<div class="authors">By ${authors}</div>` : nothing}
        
        ${highlightQuote
          ? html`
              <div class="quote-box">
                "${unsafeHTML(sanitizeHtml(highlightQuote))}"
              </div>
            `
          : nothing}

        ${hasAction
          ? html`
              <div class="action-tip">
                点击以让 AI 解读此引用 →
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-literature-reference")) {
  customElements.define("a2learn-literature-reference", A2learnLiteratureReferenceElement as any);
}

export const A2learnLiteratureReference = {
  ...LiteratureReferenceApi,
  tagName: "a2learn-literature-reference",
};
