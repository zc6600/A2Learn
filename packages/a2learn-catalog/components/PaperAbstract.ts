import componentStyles from "../styles/components/PaperAbstract.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { PaperAbstractApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnPaperAbstractElement extends A2uiLitElement<typeof PaperAbstractApi> {
  static styles = unsafeCSS(componentStyles);

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
