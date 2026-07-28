import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { PaperAbstractApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnPaperAbstractElement extends A2uiLitElement<typeof PaperAbstractApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .paper-card {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-radius: var(--a2ui-border-radius, 16px);
      background: var(--a2ui-color-surface, #ffffff);
      padding: var(--a2ui-spacing-xl, 32px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.2s ease;
    }
    .paper-card:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--a2ui-color-primary, #3b82f6);
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, var(--a2ui-color-surface, #ffffff));
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: var(--a2ui-spacing-m, 12px);
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.3;
      margin: 0 0 16px 0;
      color: var(--a2ui-color-on-surface, #0f172a);
      letter-spacing: -0.5px;
    }
    .authors {
      font-size: 14px;
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #334155) 70%, transparent);
      margin-bottom: 8px;
      font-style: italic;
    }
    .meta-info {
      font-size: 13px;
      font-weight: 600;
      color: var(--app-muted, #64748b);
      margin-bottom: 24px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .tldr-box {
      background: color-mix(in oklab, var(--a2ui-color-secondary, #6366f1) 5%, var(--a2ui-color-surface, #ffffff));
      border-left: 4px solid var(--a2ui-color-secondary, #6366f1);
      padding: var(--a2ui-spacing-l, 20px);
      border-radius: 0 var(--a2ui-border-radius, 12px) var(--a2ui-border-radius, 12px) 0;
      margin-bottom: var(--a2ui-spacing-xl, 28px);
    }
    .tldr-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--a2ui-color-secondary, #6366f1);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .tldr-content {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.5;
      color: var(--a2ui-color-on-surface, #1e293b);
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--app-muted, #64748b);
      margin-bottom: 12px;
    }
    .abstract-text {
      font-size: 15px;
      line-height: 1.7;
      color: var(--a2ui-color-on-surface, #334155);
      margin-bottom: 24px;
      text-align: justify;
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      border-top: 1px solid var(--a2ui-color-border, #e2e8f0);
      padding-top: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: var(--a2ui-color-primary, #3b82f6);
      color: #ffffff;
      border: 1px solid var(--a2ui-color-primary, #3b82f6);
    }
    .btn-primary:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 85%, #000000);
      border-color: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 85%, #000000);
    }
    .btn-secondary {
      background: transparent;
      color: var(--a2ui-color-primary, #3b82f6);
      border: 1px solid var(--a2ui-color-primary, #3b82f6);
    }
    .btn-secondary:hover {
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, transparent);
    }
  `;

  protected createController() {
    return new A2uiController(this, PaperAbstractApi);
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

    const title = this.resolveString(props.title);
    const abstract = this.resolveString(props.abstract);
    const tldr = props.tldr ? this.resolveString(props.tldr) : "";
    const venue = props.venue ? this.resolveString(props.venue) : "";
    const year = props.year ? Number(props.year) : null;
    const pdfUrl = props.pdfUrl ? this.resolveString(props.pdfUrl) : "";
    const sourceUrl = props.sourceUrl ? this.resolveString(props.sourceUrl) : "";

    const authors = props.authors
      ? (props.authors as unknown[]).map(a => this.resolveString(a)).join(", ")
      : "";

    return html`
      <div class="paper-card">
        <div class="badge">
          <span>📄</span>
          <span>Academic Paper Abstract</span>
        </div>
        
        <h1 class="title">${title}</h1>
        
        ${authors ? html`<div class="authors">By ${authors}</div>` : nothing}
        
        ${venue || year
          ? html`
              <div class="meta-info">
                ${venue ? html`<span>🏫 ${venue}</span>` : nothing}
                ${year ? html`<span>📅 ${year}</span>` : nothing}
              </div>
            `
          : nothing}

        ${tldr
          ? html`
              <div class="tldr-box">
                <div class="tldr-title">
                  <span>💡</span>
                  <span>Core Takeaway (TL;DR)</span>
                </div>
                <div class="tldr-content">${tldr}</div>
              </div>
            `
          : nothing}

        <div class="section-title">Abstract</div>
        <div class="abstract-text">${unsafeHTML(sanitizeHtml(abstract))}</div>

        ${pdfUrl || sourceUrl
          ? html`
              <div class="actions">
                ${pdfUrl
                  ? html`
                      <a class="btn btn-primary" href="${pdfUrl}" target="_blank">
                        <span>📥</span> Download PDF
                      </a>
                    `
                  : nothing}
                ${sourceUrl
                  ? html`
                      <a class="btn btn-secondary" href="${sourceUrl}" target="_blank">
                        <span>🔗</span> View Source
                      </a>
                    `
                  : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-paper-abstract")) {
  customElements.define("a2learn-paper-abstract", A2learnPaperAbstractElement as any);
}

export const A2learnPaperAbstract = {
  ...PaperAbstractApi,
  tagName: "a2learn-paper-abstract",
};
