import componentStyles from "../styles/components/Flashcard.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { FlashcardApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

interface NormalizedCard {
  id?: string;
  front: string;
  back: string;
  hint?: string;
}

export class A2learnFlashcardElement extends A2uiLitElement<typeof FlashcardApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  @state() private currentIndex = 0;
  @state() private flipped = false;

  protected createController() {
    return new A2uiController(this, FlashcardApi as any);
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

  private toggleFlip(e?: Event) {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest(".card-nav-btn")) return;
    }
    this.flipped = !this.flipped;
    this.requestUpdate();
  }

  private nextCard(total: number, e?: Event) {
    if (e) e.stopPropagation();
    this.currentIndex = (this.currentIndex + 1) % total;
    this.flipped = false;
    this.requestUpdate();
  }

  private handleCardKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    this.toggleFlip();
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;

    // Normalize cards
    let cardList: NormalizedCard[] = [];
    if (Array.isArray(props.cards) && props.cards.length > 0) {
      cardList = (props.cards as Array<Record<string, unknown>>).map((c) => ({
        id: c.id ? this.resolveString(c.id) : undefined,
        front: this.resolveString(c.front),
        back: this.resolveString(c.back),
        hint: c.hint ? this.resolveString(c.hint) : undefined,
      }));
    } else if (props.front || props.back) {
      cardList = [
        {
          front: this.resolveString(props.front),
          back: this.resolveString(props.back),
        },
      ];
    }

    if (cardList.length === 0) return nothing;

    const totalCards = cardList.length;
    const currentCard = cardList[this.currentIndex % totalCards];
    const isFlipped = props.isFlipped ?? this.flipped;
    const isMultiple = totalCards > 1;

    return html`
      <div
        class="card-scene"
        role="button"
        tabindex="0"
        aria-pressed=${String(isFlipped)}
        aria-label=${isFlipped ? uiText("显示问题", "Show question") : uiText("显示答案", "Show answer")}
        @click=${(e: Event) => this.toggleFlip(e)}
        @keydown=${(e: KeyboardEvent) => this.handleCardKeydown(e)}
      >
        <div class="card-inner ${isFlipped ? "flipped" : ""}">
          <!-- Front Face -->
          <div class="card-face card-front">
            ${isMultiple
              ? html`
                  <div class="card-top-bar" @click=${(e: Event) => e.stopPropagation()}>
                    <span class="card-count">${this.currentIndex + 1} / ${totalCards}</span>
                    <button
                      type="button"
                      class="card-nav-btn"
                      @click=${(e: Event) => this.nextCard(totalCards, e)}
                      title=${this.currentIndex === totalCards - 1 ? uiText("重新开始", "Start Over") : uiText("下一张", "Next")}
                    >
                      ${this.currentIndex === totalCards - 1 ? "⟲" : "→"}
                    </button>
                  </div>
                `
              : nothing}

            <div class="card-body a2learn-markdown-body">
              ${unsafeHTML(sanitizeHtml(currentCard.front))}
            </div>

            ${currentCard.hint
              ? html`<div class="card-hint">${currentCard.hint}</div>`
              : nothing}
          </div>

          <!-- Back Face -->
          <div class="card-face card-back">
            ${isMultiple
              ? html`
                  <div class="card-top-bar" @click=${(e: Event) => e.stopPropagation()}>
                    <span class="card-count">${this.currentIndex + 1} / ${totalCards}</span>
                    <button
                      type="button"
                      class="card-nav-btn"
                      @click=${(e: Event) => this.nextCard(totalCards, e)}
                      title=${this.currentIndex === totalCards - 1 ? uiText("重新开始", "Start Over") : uiText("下一张", "Next")}
                    >
                      ${this.currentIndex === totalCards - 1 ? "⟲" : "→"}
                    </button>
                  </div>
                `
              : nothing}

            <div class="card-body a2learn-markdown-body">
              ${unsafeHTML(sanitizeHtml(currentCard.back))}
            </div>
          </div>
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
