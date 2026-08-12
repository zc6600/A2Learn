import componentStyles from "../styles/components/Flashcard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { FlashcardApi } from "../api";

export class A2learnFlashcardElement extends A2uiLitElement<typeof FlashcardApi> {
  private flipped = false;

  static styles = unsafeCSS(componentStyles);

  protected createController() {
    return new A2uiController(this, FlashcardApi);
  }

  private toggleFlip() {
    this.flipped = !this.flipped;
    this.requestUpdate();
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
    const props = this.controller?.props as
      | { front: unknown; back: unknown; isFlipped?: boolean }
      | undefined;
    if (!props) return nothing;

    const isFlipped = props.isFlipped ?? this.flipped;

    return html`
      <div class="card-inner ${isFlipped ? 'flipped' : ''}" @click=${this.toggleFlip}>
        <div class="card-face card-front">
          <div class="card-label">Question</div>
          <div class="card-content">${this.resolveString(props.front)}</div>
        </div>
        <div class="card-face card-back">
          <div class="card-label">Answer</div>
          <div class="card-content">${this.resolveString(props.back)}</div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-flashcard")) {
  customElements.define("a2learn-flashcard", A2learnFlashcardElement);
}

export const A2learnFlashcard = {
  ...FlashcardApi,
  tagName: "a2learn-flashcard",
};
