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
    return new A2uiController(this, DeepDivePromptApi);
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

  private handlePromptClick(id: string) {
    const props = (this as any).controller?.props;
    if (props?.selectedId || !props?.onPromptSelect) return; // Prevent multiple clicks if already selected

    (this as any).context.dispatchAction({
      ...(props.onPromptSelect as Record<string, unknown>),
      context: { selectedId: id },
    });
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const prompts = props.prompts || [];
    const selectedId = props.selectedId;

    if (prompts.length === 0) return nothing;

    return html`
      <div>
        <h5 class="deep-dive-title">${uiText("继续深挖", "Explore Further")}</h5>
        <div class="prompts-container">
          ${prompts.map((prompt: any) => {
            const isSelected = prompt.id === selectedId;
            const isDisabled = !!selectedId && !isSelected;
            
            return html`
              <button 
                class="prompt-btn ${isSelected ? 'selected' : ''}" 
                @click=${() => this.handlePromptClick(prompt.id)}
                ?disabled=${isDisabled}
              >
                ${prompt.icon ? html`<span class="icon">${this.resolveString(prompt.icon)}</span>` : nothing}
                <span class="label">${unsafeHTML(sanitizeHtml(this.resolveString(prompt.label), { inline: true }))}</span>
              </button>
            `;
          })}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-deep-dive-prompt")) {
  customElements.define("a2learn-deep-dive-prompt", A2learnDeepDivePromptElement as any);
}

export const A2learnDeepDivePrompt = {
  ...DeepDivePromptApi,
  tagName: "a2learn-deep-dive-prompt",
};
