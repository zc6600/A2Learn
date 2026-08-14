import componentStyles from "../styles/components/DocumentFigure.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DocumentFigureApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnDocumentFigureElement extends A2uiLitElement<typeof DocumentFigureApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  @state() private activeHotspotId: string | null = null;
  @state() private imageLoaded = false;

  protected createController() {
    return new A2uiController(this, DocumentFigureApi);
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

  private handleHotspotClick(id: string, e: Event) {
    e.stopPropagation();
    
    // Toggle active state for mobile users (where hover doesn't work well)
    this.activeHotspotId = this.activeHotspotId === id ? null : id;
    (this as any).requestUpdate();

    const props = (this as any).controller?.props;
    if (props?.onHotspotClick) {
      (this as any).context.dispatchAction({
        ...(props.onHotspotClick as Record<string, unknown>),
        context: { hotspotId: id },
      });
    }
  }

  private handleImageLoad() {
    this.imageLoaded = true;
    (this as any).requestUpdate();
  }

  private handleContainerClick() {
    this.activeHotspotId = null;
    (this as any).requestUpdate();
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const imageUrl = this.resolveString(props.imageUrl);
    if (!imageUrl) return nothing;

    const caption = props.caption ? this.resolveString(props.caption) : null;
    const aiExplanation = props.aiExplanation ? this.resolveString(props.aiExplanation) : null;
    const hotspots = props.hotspots || [];

    return html`
      <div class="figure-card">
        <div class="image-container" @click=${this.handleContainerClick}>
          <img 
            src="${imageUrl}" 
            alt="${caption || uiText("图文示意", "Document figure")}"
            class="main-image"
            @load=${this.handleImageLoad}
          />
          
          ${this.imageLoaded ? hotspots.map((spot: any, index: number) => {
            const x = Math.max(0, Math.min(100, spot.x || 0));
            const y = Math.max(0, Math.min(100, spot.y || 0));
            const label = this.resolveString(spot.label);
            const desc = spot.description ? this.resolveString(spot.description) : null;
            const isActive = this.activeHotspotId === spot.id;
            
            return html`
              <div 
                class="hotspot ${isActive ? 'active' : ''}" 
                style="left: ${x}%; top: ${y}%;"
                @click=${(e: Event) => this.handleHotspotClick(spot.id, e)}
              >
                ${index + 1}
                <div class="tooltip">
                  <h4 class="tooltip-title">${label}</h4>
                  ${desc ? html`<div class="tooltip-desc a2learn-markdown-body">${unsafeHTML(sanitizeHtml(desc, { inline: true }))}</div>` : nothing}
                </div>
              </div>
            `;
          }) : nothing}
        </div>

        ${caption || aiExplanation ? html`
          <div class="content-area">
            ${caption ? html`<p class="caption">${caption}</p>` : nothing}
            
            ${aiExplanation ? html`
              <div class="ai-explanation">
                <div class="ai-explanation-title">✨ ${uiText("AI 解析", "AI Analysis")}</div>
                <div class="a2learn-markdown-body">${unsafeHTML(sanitizeHtml(aiExplanation))}</div>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-document-figure")) {
  customElements.define("a2learn-document-figure", A2learnDocumentFigureElement as any);
}

export const A2learnDocumentFigure = {
  ...DocumentFigureApi,
  tagName: "a2learn-document-figure",
};
