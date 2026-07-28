import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DocumentFigureApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnDocumentFigureElement extends A2uiLitElement<typeof DocumentFigureApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .figure-card {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .image-container {
      position: relative;
      width: 100%;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      border-bottom: 1px solid var(--a2ui-color-border);
    }
    .main-image {
      max-width: 100%;
      max-height: 600px;
      object-fit: contain;
      display: block;
    }
    
    /* Hotspot Styling */
    .hotspot {
      position: absolute;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%);
      background: var(--a2ui-color-primary);
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 10;
    }
    .hotspot:hover, .hotspot.active {
      transform: translate(-50%, -50%) scale(1.2);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 20;
    }
    .hotspot::before {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--a2ui-color-primary);
      opacity: 0.4;
      animation: pulse 2s infinite;
      z-index: -1;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2); opacity: 0; }
    }

    /* Tooltip */
    .tooltip {
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(30, 30, 30, 0.95);
      backdrop-filter: blur(8px);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      width: max-content;
      max-width: 280px;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .hotspot:hover .tooltip, .hotspot.active .tooltip {
      opacity: 1;
      visibility: visible;
      bottom: calc(100% + 15px);
    }
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px;
      border-style: solid;
      border-color: rgba(30, 30, 30, 0.95) transparent transparent transparent;
    }
    .tooltip-title {
      font-weight: 700;
      font-size: 14px;
      margin: 0 0 6px 0;
      color: #fff;
    }
    .tooltip-desc {
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
      color: #ccc;
      white-space: normal;
    }

    /* Text Content */
    .content-area {
      padding: 20px 24px;
    }
    .caption {
      font-size: 14px;
      color: var(--app-muted);
      font-style: italic;
      text-align: center;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }
    .ai-explanation {
      font-size: 15px;
      line-height: 1.6;
      color: var(--a2ui-color-on-surface);
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
      padding: 16px;
      border-radius: 8px;
      border-left: 3px solid var(--a2ui-color-primary);
    }
    .ai-explanation-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--a2ui-color-primary);
      font-weight: 700;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;

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
            alt="${caption || 'Document figure'}" 
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
                  ${desc ? html`<p class="tooltip-desc">${desc}</p>` : nothing}
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
                <div class="ai-explanation-title">✨ AI 解析</div>
                <div>${unsafeHTML(sanitizeHtml(aiExplanation))}</div>
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
