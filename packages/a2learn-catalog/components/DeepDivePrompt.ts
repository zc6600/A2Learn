import { html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DeepDivePromptApi } from "../api";

export class A2learnDeepDivePromptElement extends A2uiLitElement<typeof DeepDivePromptApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .prompts-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: flex-start;
      margin-top: var(--a2ui-spacing-m);
    }
    .prompt-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-primary);
      border-radius: 20px;
      color: var(--a2ui-color-primary);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }
    .prompt-btn:hover:not(:disabled) {
      background: var(--a2ui-color-primary);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .prompt-btn.selected {
      background: var(--a2ui-color-primary);
      color: white;
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--a2ui-color-primary) 30%, transparent);
      cursor: default;
    }
    .prompt-btn:disabled:not(.selected) {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: var(--a2ui-color-border);
      color: var(--app-muted);
    }
    .icon {
      font-size: 16px;
    }
    .deep-dive-title {
      font-size: 13px;
      color: var(--app-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 12px 0;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .deep-dive-title::before {
      content: "";
      display: block;
      width: 20px;
      height: 2px;
      background: var(--a2ui-color-primary);
    }
  `;

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
        <h5 class="deep-dive-title">继续深挖</h5>
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
                <span class="label">${this.resolveString(prompt.label)}</span>
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
