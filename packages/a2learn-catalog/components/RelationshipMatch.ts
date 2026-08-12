import componentStyles from "../styles/components/RelationshipMatch.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { RelationshipMatchApi } from "../api";
import { uiText } from "../utils/i18n";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

/** Interactive Relationship Card Matching component. 100% reliable click-based selection. */
export class A2learnRelationshipMatchElement extends A2uiLitElement<typeof RelationshipMatchApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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
                      ${explanations.map((item: { label: string; content: string }) => html`<li><b>${item.label}</b>：${unsafeHTML(sanitizeHtml(item.content, { inline: true }))}</li>`)}
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
