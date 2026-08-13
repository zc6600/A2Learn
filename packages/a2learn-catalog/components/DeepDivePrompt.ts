import componentStyles from "../styles/components/DeepDivePrompt.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DeepDivePromptApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnDeepDivePromptElement extends A2uiLitElement<typeof DeepDivePromptApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  protected createController() {
    return new A2uiController(this, DeepDivePromptApi as any);
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

  private handlePromptClick(promptLabel: string, promptId: string) {
    const props = this.controller?.props;

    // 1. Dispatch A2UI action if configured
    if (props?.onPromptSelect) {
      this.context.dispatchAction({
        ...(props.onPromptSelect as Record<string, unknown>),
        context: { selectedId: promptId, prompt: promptLabel },
      });
    }

    // 2. Trigger global AI companion assistant for direct streaming response
    this.dispatchEvent(
      new CustomEvent("a2learn-explore-concept", {
        detail: { prompt: promptLabel, concept: promptLabel },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    const prompts = (props.prompts as Array<Record<string, unknown>>) || [];
    const selectedId = props.selectedId ? this.resolveString(props.selectedId) : undefined;

    if (prompts.length === 0) return nothing;

    return html`
      <div class="deep-dive-box">
        <div class="deep-dive-header">
          <span class="deep-dive-title">${uiText("深入探索", "Deep Dive")}</span>
        </div>
        <div class="prompts-container">
          ${prompts.map((prompt) => {
            const promptId = this.resolveString(prompt.id);
            const isSelected = promptId === selectedId;
            const label = this.resolveString(prompt.label);

            return html`
              <button 
                class="prompt-btn ${isSelected ? 'selected' : ''}" 
                @click=${() => this.handlePromptClick(label, promptId)}
              >
                <span class="label">${unsafeHTML(sanitizeHtml(label, { inline: true }))}</span>
                ${isSelected ? html`<span class="check-icon">✓</span>` : nothing}
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-deep-dive-prompt")) {
  customElements.define("a2learn-deep-dive-prompt", A2learnDeepDivePromptElement);
}

export const A2learnDeepDivePrompt = {
  ...DeepDivePromptApi,
  tagName: "a2learn-deep-dive-prompt",
};
