import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { FlashcardApi } from "../api";

export class A2learnFlashcardElement extends A2uiLitElement<typeof FlashcardApi> {
  private flipped = false;

  static styles = css`
    :host {
      display: block;
      perspective: 1000px;
      margin: var(--a2ui-spacing-m) 0;
    }
    .card-inner {
      position: relative;
      width: 100%;
      min-height: 200px;
      text-align: center;
      transition: transform 0.6s;
      transform-style: preserve-3d;
      cursor: pointer;
    }
    .card-inner.flipped {
      transform: rotateY(180deg);
    }
    .card-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--a2ui-spacing-xl);
      border-radius: var(--a2ui-border-radius);
      border: 1px solid var(--a2ui-color-border);
      background: var(--a2ui-color-surface);
      box-shadow: var(--a2ui-card-box-shadow);
      box-sizing: border-box;
    }
    .card-back {
      transform: rotateY(180deg);
      background: color-mix(in oklab, var(--a2ui-color-secondary) 10%, var(--a2ui-color-surface));
    }
    .card-label {
      font-size: var(--a2ui-font-size-xs);
      color: var(--app-muted);
      margin-bottom: var(--a2ui-spacing-s);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .card-content {
      font-size: var(--a2ui-font-size-m);
      font-weight: 500;
    }
  `;

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
