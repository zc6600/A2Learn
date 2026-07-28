import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ScenarioDialogueApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

export class A2learnScenarioDialogueElement extends A2uiLitElement<typeof ScenarioDialogueApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .chat-container {
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .chat-header {
      background: var(--a2ui-color-surface);
      padding: 12px 16px;
      border-bottom: 1px solid var(--a2ui-color-border);
      text-align: center;
      font-weight: 600;
      font-size: 15px;
      color: var(--a2ui-color-on-surface);
    }
    .chat-body {
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 600px;
      overflow-y: auto;
    }
    
    /* Message Row */
    .message-row {
      display: flex;
      gap: 12px;
      max-width: 85%;
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      opacity: 0;
      transform: translateY(10px);
    }
    .message-row.left {
      align-self: flex-start;
      flex-direction: row;
    }
    .message-row.right {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    /* Avatar */
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--a2ui-color-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border: 1px solid var(--a2ui-color-border);
      overflow: hidden;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Bubble Content */
    .message-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .message-row.left .message-content {
      align-items: flex-start;
    }
    .message-row.right .message-content {
      align-items: flex-end;
    }
    
    .character-name {
      font-size: 12px;
      color: var(--app-muted);
      margin: 0 4px;
    }

    .bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 15px;
      line-height: 1.5;
      position: relative;
      word-wrap: break-word;
    }
    .bubble p {
      margin: 0 0 8px 0;
    }
    .bubble p:last-child {
      margin: 0;
    }
    .bubble pre {
      background: rgba(0,0,0,0.05);
      padding: 8px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .bubble code {
      font-family: monospace;
      font-size: 0.9em;
    }

    /* Left Bubble Style */
    .message-row.left .bubble {
      background: var(--a2ui-color-surface);
      color: var(--a2ui-color-on-surface);
      border: 1px solid var(--a2ui-color-border);
      border-top-left-radius: 4px;
    }
    
    /* Right Bubble Style (Like WeChat Green) */
    .message-row.right .bubble {
      background: #95ec69; /* Classic WeChat Green */
      color: #000;
      border: 1px solid #89d961;
      border-top-right-radius: 4px;
    }

    /* Typing Indicator */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 6px 12px;
      background: var(--a2ui-color-surface);
      border-radius: 16px;
      width: fit-content;
      align-items: center;
      border: 1px solid var(--a2ui-color-border);
      height: 32px;
    }
    .dot {
      width: 6px;
      height: 6px;
      background: var(--app-muted);
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }
    .dot:nth-child(1) { animation-delay: 0s; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes popIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes typing {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `;

  @state() private visibleMessageCount = 0;
  @state() private isTyping = false;
  private playbackTimer: number | null = null;
  private _currentMessagesJson: string | null = null;

  protected createController() {
    return new A2uiController(this, ScenarioDialogueApi);
  }

  connectedCallback() {
    super.connectedCallback();
    // Use a small timeout to ensure controller is fully initialized
    setTimeout(() => {
      const props = (this as any).controller?.props;
      const messagesJson = JSON.stringify(props?.messages || []);
      if (props?.messages && this._currentMessagesJson !== messagesJson) {
        this._currentMessagesJson = messagesJson;
        this.visibleMessageCount = 0;
        (this as any).requestUpdate();
        this.playNextMessage();
      }
    }, 0);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  // Handle auto-playback logic
  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    super.updated(changedProperties);
    const props = (this as any).controller?.props;
    
    // If messages change, restart playback
    const messagesJson = JSON.stringify(props?.messages || []);
    if (props?.messages && this._currentMessagesJson !== messagesJson) {
      this._currentMessagesJson = messagesJson;
      this.visibleMessageCount = 0;
      (this as any).requestUpdate();
      if (this.playbackTimer) {
        window.clearTimeout(this.playbackTimer);
        this.playbackTimer = null;
      }
      this.playNextMessage();
    }

    // Auto scroll to bottom
    const root = (this as any).shadowRoot;
    const body = root?.querySelector('.chat-body');
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.playbackTimer) {
      window.clearTimeout(this.playbackTimer);
    }
  }

  private playNextMessage() {
    const props = (this as any).controller?.props;
    if (!props?.messages || this.visibleMessageCount >= props.messages.length) {
      this.isTyping = false;
      (this as any).requestUpdate();
      return;
    }

    const nextMsg = props.messages[this.visibleMessageCount];
    const delay = nextMsg.delayMs || 1000; // Default 1s delay

    if (delay > 0) {
      this.isTyping = true;
      (this as any).requestUpdate();
      this.playbackTimer = window.setTimeout(() => {
        this.isTyping = false;
        this.visibleMessageCount++;
        (this as any).requestUpdate();
        // Short pause before next message starts typing
        this.playbackTimer = window.setTimeout(() => this.playNextMessage(), 300);
      }, delay);
    } else {
      this.visibleMessageCount++;
      (this as any).requestUpdate();
      this.playNextMessage();
    }
  }

  private renderAvatar(avatarStr?: string) {
    if (!avatarStr) return html`<div class="avatar">👤</div>`;
    
    // Check if it's a URL
    if (avatarStr.startsWith('http') || avatarStr.startsWith('/')) {
      return html`<div class="avatar"><img src="${avatarStr}" alt="avatar" /></div>`;
    }
    // Otherwise treat as Emoji
    return html`<div class="avatar">${avatarStr}</div>`;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props || !props.messages || !props.characters) return nothing;

    const topic = props.topic ? this.resolveString(props.topic) : null;
    const messages = props.messages;
    const characters = props.characters;

    return html`
      <div class="chat-container">
        ${topic ? html`<div class="chat-header">${topic}</div>` : nothing}
        
        <div class="chat-body">
          ${messages.slice(0, this.visibleMessageCount).map((msg: any) => {
            const char = characters[msg.characterId];
            if (!char) return nothing;
            
            const alignment = char.alignment === "right" ? "right" : "left";
            const name = this.resolveString(char.name);
            const avatar = char.avatar ? this.resolveString(char.avatar) : undefined;
            const content = this.resolveString(msg.content);

            return html`
              <div class="message-row ${alignment}">
                ${this.renderAvatar(avatar)}
                <div class="message-content">
                  <span class="character-name">${name}</span>
                  <div class="bubble">
                    ${unsafeHTML(sanitizeHtml(content))}
                  </div>
                </div>
              </div>
            `;
          })}

          ${this.isTyping ? html`
            <div class="message-row left">
              <div class="avatar">💬</div>
              <div class="message-content">
                <div class="typing-indicator">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-scenario-dialogue")) {
  customElements.define("a2learn-scenario-dialogue", A2learnScenarioDialogueElement as any);
}

export const A2learnScenarioDialogue = {
  ...ScenarioDialogueApi,
  tagName: "a2learn-scenario-dialogue",
};
