import { html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { RelationshipMatchApi } from "../api";
import { uiText } from "../utils/i18n";

/** Interactive Relationship Card Matching component. 100% reliable click-based selection. */
export class A2learnRelationshipMatchElement extends A2uiLitElement<typeof RelationshipMatchApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
      user-select: none;
      -webkit-user-select: none;
    }
    .board {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--a2ui-color-border, #d9dde5);
      border-radius: var(--a2ui-card-border-radius, 16px);
      background: var(--a2ui-color-surface, #fff);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
    }
    header {
      padding: 20px 22px 16px;
      border-bottom: 1px solid color-mix(in srgb, var(--a2ui-color-border, #d9dde5) 72%, transparent);
      background: color-mix(in srgb, var(--a2ui-color-surface, #fff) 94%, var(--a2ui-color-primary, #2563eb));
    }
    h3 {
      margin: 0;
      color: var(--a2ui-color-on-surface, #1e293b);
      font-family: var(--a2ui-font-family-title, var(--a2ui-font-family));
      font-size: 18px;
      line-height: 1.35;
    }
    .instruction {
      margin: 7px 0 0;
      color: var(--app-muted, #64748b);
      font-size: 14px;
      line-height: 1.55;
    }
    .progress {
      display: inline-flex;
      margin-top: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 12%, transparent);
      color: var(--a2ui-color-primary, #2563eb);
      font-size: 12px;
      font-weight: 700;
    }

    .matching-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 22px;
    }

    .target-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 20px;
      border: 1px solid var(--a2ui-color-border, #d9dde5);
      border-radius: 14px;
      background: var(--a2ui-color-surface, #fff);
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
    }
    .target-card.correct-card {
      border-color: var(--a2ui-color-success, #16a34a);
      background: color-mix(in srgb, var(--a2ui-color-success, #16a34a) 4%, var(--a2ui-color-surface, #fff));
    }
    .target-card.incorrect-card {
      border-color: var(--a2ui-color-error, #dc2626);
      background: color-mix(in srgb, var(--a2ui-color-error, #dc2626) 4%, var(--a2ui-color-surface, #fff));
    }

    .target-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .target-content {
      color: var(--a2ui-color-on-surface, #1e293b);
      font-size: 16px;
      font-weight: 700;
      line-height: 1.5;
    }
    .card-badge {
      font-size: 13px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 999px;
    }
    .card-badge.correct {
      background: color-mix(in srgb, var(--a2ui-color-success, #16a34a) 12%, transparent);
      color: var(--a2ui-color-success, #16a34a);
    }
    .card-badge.incorrect {
      background: color-mix(in srgb, var(--a2ui-color-error, #dc2626) 12%, transparent);
      color: var(--a2ui-color-error, #dc2626);
    }

    .options-label {
      color: var(--app-muted, #64748b);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    /* Option Pill Chips Array */
    .option-chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .option-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 15px;
      border: 1px solid var(--a2ui-color-border, #d9dde5);
      border-radius: 10px;
      background: var(--a2ui-color-surface, #fff);
      color: var(--a2ui-color-on-surface, #1e293b);
      cursor: pointer;
      font: inherit;
      font-size: 13.5px;
      font-weight: 550;
      line-height: 1.4;
      text-align: left;
      transition: all 0.18s ease;
      box-shadow: 0 1.5px 4px rgba(15, 23, 42, 0.03);
    }
    .option-chip:hover:not(:disabled) {
      border-color: var(--a2ui-color-primary, #2563eb);
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 6%, var(--a2ui-color-surface, #fff));
      transform: translateY(-1px);
    }
    .option-chip.selected {
      border-color: var(--a2ui-color-primary, #2563eb);
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 12%, var(--a2ui-color-surface, #fff));
      color: var(--a2ui-color-primary, #2563eb);
      font-weight: 700;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 20%, transparent);
    }
    .option-chip.selected-correct {
      border-color: var(--a2ui-color-success, #16a34a);
      background: color-mix(in srgb, var(--a2ui-color-success, #16a34a) 12%, var(--a2ui-color-surface, #fff));
      color: var(--a2ui-color-success, #16a34a);
      font-weight: 700;
    }
    .option-chip.selected-incorrect {
      border-color: var(--a2ui-color-error, #dc2626);
      background: color-mix(in srgb, var(--a2ui-color-error, #dc2626) 12%, var(--a2ui-color-surface, #fff));
      color: var(--a2ui-color-error, #dc2626);
      font-weight: 700;
    }
    .option-chip:disabled {
      cursor: default;
    }

    /* Feedback */
    .feedback {
      margin: 0 22px 18px;
      padding: 14px 16px;
      border-left: 4px solid var(--a2ui-color-primary, #2563eb);
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 6%, transparent);
      color: var(--a2ui-color-on-surface, #1e293b);
      font-size: 14px;
      line-height: 1.6;
      border-radius: 0 8px 8px 0;
    }
    .feedback.correct {
      border-left-color: var(--a2ui-color-success, #16a34a);
      background: color-mix(in srgb, var(--a2ui-color-success, #16a34a) 7%, transparent);
    }
    .feedback.incorrect {
      border-left-color: var(--a2ui-color-error, #dc2626);
      background: color-mix(in srgb, var(--a2ui-color-error, #dc2626) 7%, transparent);
    }
    .feedback strong { display: block; margin-bottom: 3px; }
    .feedback ul { margin: 9px 0 0; padding-left: 18px; }
    .feedback li { margin: 4px 0; }

    footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 18px 22px 22px;
      border-top: 1px solid color-mix(in srgb, var(--a2ui-color-border, #d9dde5) 50%, transparent);
    }
    .btn {
      min-height: 38px;
      padding: 8px 16px;
      border: 1px solid var(--a2ui-color-border, #d9dde5);
      border-radius: var(--a2learn-control-radius, 8px);
      background: transparent;
      color: var(--a2ui-color-on-surface, #1e293b);
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      font-weight: 650;
    }
    .btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 7%, var(--a2ui-color-surface, #fff));
    }
    .submit {
      border-color: var(--a2ui-color-primary, #2563eb);
      background: var(--a2ui-color-primary, #2563eb);
      color: var(--a2ui-color-on-primary, #fff);
    }
    .submit:hover:not(:disabled) {
      filter: brightness(1.06);
      background: var(--a2ui-color-primary, #2563eb);
    }
    .btn:disabled { cursor: not-allowed; opacity: 0.48; }

    @media (max-width: 600px) {
      .matching-container { padding: 16px; gap: 14px; }
      footer { padding: 16px; }
      .feedback { margin-left: 16px; margin-right: 16px; }
    }
  `;

  @state() private matches: Record<string, string> = {};
  @state() private status: "idle" | "correct" | "incorrect" = "idle";

  protected createController() {
    return new A2uiController(this, RelationshipMatchApi);
  }

  private text(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private toggleChoice(leftId: string, rightId: string) {
    if (this.status !== "idle") return;
    const next = { ...this.matches };
    if (next[leftId] === rightId) {
      delete next[leftId];
    } else {
      next[leftId] = rightId;
    }
    this.matches = next;
    // Explicitly request reactive DOM update to bypass TS class-fields decorator neutralization
    this.requestUpdate();
  }

  private reset() {
    this.matches = {};
    this.status = "idle";
    this.requestUpdate();
  }

  private submit(correct: Record<string, string>) {
    if (this.status !== "idle") return;
    const isCorrect = Object.entries(correct).every(([left, right]) => this.matches[left] === right);
    this.status = isCorrect ? "correct" : "incorrect";
    this.requestUpdate();
    const props = (this as any).controller?.props;
    if (props?.onMatchComplete) {
      (this as any).context.dispatchAction({
        ...(props.onMatchComplete as Record<string, unknown>),
        context: { isCorrect, userMatches: this.matches },
      });
    }
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const leftItems = props.leftItems || [];
    const rightItems = props.rightItems || [];
    const correct = props.correctMatches || {};
    const answered = this.status !== "idle";
    const complete = leftItems.length > 0 && Object.keys(this.matches).length === leftItems.length;

    const title = this.text(props.title) || uiText("关系匹配解读", "Match the relationships");
    const instruction =
      this.text(props.instruction) ||
      uiText("请为每个项目点击选择最合适的作用或对应关系。", "Tap an option to pair with each item.");
    const rightLabel = this.text(props.rightLabel) || uiText("对应解读选项", "Matching options");

    const feedback =
      this.status === "correct"
        ? this.text(props.successMessage) || uiText("全部匹配正确！", "All relationships are correct!")
        : this.text(props.incorrectMessage) ||
          uiText("部分解读配对需要调整，标红的卡片表示对应关系不正确。", "Some relationships need adjustment. Red cards mark incorrect pairings.");

    const explanations =
      props.matchExplanations && answered
        ? leftItems
            .map((item: any) => ({ label: this.text(item.content), content: this.text(props.matchExplanations[item.id]) }))
            .filter((item: { content: string }) => item.content)
        : [];

    return html`
      <section class="board ${this.status}" aria-label=${title}>
        <header>
          <h3>${title}</h3>
          <p class="instruction">${instruction}</p>
          <span class="progress">${uiText("已选择", "Selected")} ${Object.keys(this.matches).length} / ${leftItems.length}</span>
        </header>

        <div class="matching-container">
          ${leftItems.map((item: any) => {
            const selectedRightId = this.matches[item.id];
            const isFilled = Boolean(selectedRightId);

            let cardStatusClass = "";
            let badgeText = "";
            if (answered && isFilled) {
              const isCorrect = correct[item.id] === selectedRightId;
              cardStatusClass = isCorrect ? "correct-card" : "incorrect-card";
              badgeText = isCorrect ? "✓ 正确" : "✗ 不匹配";
            }

            return html`
              <div class="target-card ${cardStatusClass}">
                <div class="target-header">
                  <span class="target-content">${this.text(item.content)}</span>
                  ${badgeText
                    ? html`<span class="card-badge ${correct[item.id] === selectedRightId ? "correct" : "incorrect"}">
                        ${badgeText}
                      </span>`
                    : nothing}
                </div>

                <div class="options-label">${rightLabel}</div>

                <div class="option-chips-grid">
                  ${rightItems.map((rItem: any) => {
                    const isSelected = selectedRightId === rItem.id;
                    let chipClass = isSelected ? "selected" : "";
                    if (answered && isSelected) {
                      chipClass = correct[item.id] === rItem.id ? "selected-correct" : "selected-incorrect";
                    }

                    return html`
                      <button
                        type="button"
                        class="option-chip ${chipClass}"
                        ?disabled=${answered}
                        @click=${() => this.toggleChoice(item.id, rItem.id)}
                      >
                        ${isSelected ? html`<span>✓</span>` : nothing}
                        <span>${this.text(rItem.content)}</span>
                      </button>
                    `;
                  })}
                </div>
              </div>
            `;
          })}
        </div>

        ${answered
          ? html`
              <div class="feedback ${this.status}" role="status" aria-live="polite">
                <strong>${this.status === "correct" ? uiText("解读匹配完成", "Complete") : uiText("再想一想", "Try again")}</strong>
                ${feedback}
                ${explanations.length
                  ? html`<ul>
                      ${explanations.map((item: { label: string; content: string }) => html`<li><b>${item.label}</b>：${item.content}</li>`)}
                    </ul>`
                  : nothing}
              </div>
            `
          : nothing}

        <footer>
          <button type="button" class="btn" @click=${this.reset}>${uiText("重置", "Reset")}</button>
          ${answered
            ? html`<button type="button" class="btn submit" @click=${this.reset}>${uiText("再试一次", "Try again")}</button>`
            : html`<button type="button" class="btn submit" ?disabled=${!complete} @click=${() => this.submit(correct)}>
                ${uiText("核对匹配", "Check matches")}
              </button>`}
        </footer>
      </section>
    `;
  }
}

if (!customElements.get("a2learn-relationship-match")) {
  customElements.define("a2learn-relationship-match", A2learnRelationshipMatchElement as any);
}

export const A2learnRelationshipMatch = { ...RelationshipMatchApi, tagName: "a2learn-relationship-match" };
