import componentStyles from "../styles/components/ScenarioDialogue.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { ScenarioDialogueApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

export class A2learnScenarioDialogueElement extends A2uiLitElement<typeof ScenarioDialogueApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
];

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
      const messagesJson = JSON.stringify({ variant: props?.variant, messages: props?.messages || [] });
      if (props?.messages && this._currentMessagesJson !== messagesJson) {
        this._currentMessagesJson = messagesJson;
        this.visibleMessageCount = props.variant === "correspondence" ? props.messages.length : 0;
        (this as any).requestUpdate();
        if (props.variant !== "correspondence") this.playNextMessage();
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
    const messagesJson = JSON.stringify({ variant: props?.variant, messages: props?.messages || [] });
    if (props?.messages && this._currentMessagesJson !== messagesJson) {
      this._currentMessagesJson = messagesJson;
      this.visibleMessageCount = props.variant === "correspondence" ? props.messages.length : 0;
      (this as any).requestUpdate();
      if (this.playbackTimer) {
        window.clearTimeout(this.playbackTimer);
        this.playbackTimer = null;
      }
      if (props.variant !== "correspondence") this.playNextMessage();
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
    if (props?.variant === "correspondence") {
      this.isTyping = false;
      this.visibleMessageCount = props.messages?.length || 0;
      (this as any).requestUpdate();
      return;
    }
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
    if (!props) return nothing;

    // Auto-normalize if provided in simple dialogue format
    let messages = props.messages;
    let characters = props.characters;

    if ((!messages || !characters) && Array.isArray(props.dialogue)) {
      characters = {};
      messages = props.dialogue.map((item: any, idx: number) => {
        const speaker = this.resolveString(item.speaker || item.name || (idx % 2 === 0 ? (props.speakerA || "Speaker A") : (props.speakerB || "Speaker B")));
        const charId = speaker.toLowerCase().replace(/[^a-z0-9]/g, "_") || `char_${idx}`;
        if (!characters[charId]) {
          characters[charId] = {
            name: speaker,
            avatar: idx % 2 === 0 ? "👩‍💼" : "👨‍💻",
            alignment: idx % 2 === 0 ? "left" : "right"
          };
        }
        return {
          characterId: charId,
          content: this.resolveString(item.text || item.content || item.message),
          delayMs: 0
        };
      });
    }

    if (!messages || !characters) return nothing;

    const topic = props.topic ? this.resolveString(props.topic) : null;
    const groupName = props.groupName ? this.resolveString(props.groupName) : null;
    const groupNotice = props.groupNotice ? this.resolveString(props.groupNotice) : null;
    const isWechatGroup = props.variant === "wechat-group" || (!props.variant && Boolean(groupName || groupNotice));
    const isCorrespondence = props.variant === "correspondence";

    return html`
      <div class="chat-container ${isWechatGroup ? "wechat-group" : ""} ${isCorrespondence ? "correspondence" : ""}">
        ${topic || groupName ? html`<div class="chat-header">${groupName || topic}</div>` : nothing}
        ${isWechatGroup && groupNotice ? html`<div class="group-notice">${unsafeHTML(sanitizeHtml(groupNotice))}</div>` : nothing}
        
        <div class="chat-body">
          ${(isCorrespondence || this.visibleMessageCount === 0 ? messages : messages.slice(0, this.visibleMessageCount)).map((msg: any) => {
            const char = characters[msg.characterId];
            if (!char) return nothing;
            
            const alignment = !isWechatGroup && char.alignment === "right" ? "right" : "left";
            const name = this.resolveString(char.name);
            const avatar = char.avatar ? this.resolveString(char.avatar) : undefined;
            const content = this.resolveString(msg.content);
            const imageUrl = msg.imageUrl ? this.resolveString(msg.imageUrl) : "";
            const imageAlt = msg.imageAlt ? this.resolveString(msg.imageAlt) : "";

            return html`
              <div class="message-row ${alignment}">
                ${isCorrespondence ? nothing : this.renderAvatar(avatar)}
                <div class="message-content">
                  <span class="character-name">${name}</span>
                  <div class="bubble">
                    ${unsafeHTML(sanitizeHtml(content))}
                    ${imageUrl ? html`<img class="message-image" src=${imageUrl} alt=${imageAlt || ""} loading="lazy" />` : nothing}
                  </div>
                </div>
              </div>
            `;
          })}

          ${this.isTyping && !isCorrespondence ? html`
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
