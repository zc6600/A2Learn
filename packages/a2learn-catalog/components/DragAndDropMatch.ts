import { html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DragAndDropMatchApi } from "../api";
import { uiText } from "../utils/i18n";

/** Two-column Matching component with dual Click-to-Pair & Drag-and-Drop support. */
export class A2learnDragAndDropMatchElement extends A2uiLitElement<typeof DragAndDropMatchApi> {
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

    /* 2-Column Classic Layout */
    .matching-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 22px;
    }

    .column-title {
      color: var(--app-muted, #64748b);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .items-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Cards */
    .match-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      border: 2px solid var(--a2ui-color-border, #d9dde5);
      border-radius: 12px;
      background: var(--a2ui-color-surface, #fff);
      color: var(--a2ui-color-on-surface, #1e293b);
      cursor: pointer;
      font-size: 14.5px;
      line-height: 1.5;
      transition: all 0.18s ease;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
    }
    .match-card:hover:not(:disabled) {
      border-color: var(--a2ui-color-primary, #2563eb);
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 4%, var(--a2ui-color-surface, #fff));
      transform: translateY(-1px);
    }

    /* Active Selection */
    .match-card.active-selected {
      border-color: var(--a2ui-color-primary, #2563eb);
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 12%, var(--a2ui-color-surface, #fff));
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 20%, transparent);
    }

    /* Paired State */
    .match-card.paired {
      border-color: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 60%, var(--a2ui-color-border, #d9dde5));
      background: color-mix(in srgb, var(--a2ui-color-primary, #2563eb) 8%, var(--a2ui-color-surface, #fff));
    }

    /* Results State */
    .match-card.correct {
      border-color: var(--a2ui-color-success, #16a34a);
      background: color-mix(in srgb, var(--a2ui-color-success, #16a34a) 10%, var(--a2ui-color-surface, #fff));
      color: var(--a2ui-color-success, #16a34a);
    }
    .match-card.incorrect {
      border-color: var(--a2ui-color-error, #dc2626);
      background: color-mix(in srgb, var(--a2ui-color-error, #dc2626) 10%, var(--a2ui-color-surface, #fff));
      color: var(--a2ui-color-error, #dc2626);
    }

    .pair-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 7px;
      border-radius: 999px;
      background: var(--a2ui-color-primary, #2563eb);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .pair-badge.correct { background: var(--a2ui-color-success, #16a34a); }
    .pair-badge.incorrect { background: var(--a2ui-color-error, #dc2626); }

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

    @media (max-width: 680px) {
      .matching-columns { grid-template-columns: 1fr; gap: 16px; padding: 16px; }
      footer { padding: 16px; }
      .feedback { margin-left: 16px; margin-right: 16px; }
    }
  `;

  @state() private selectedLeftId: string | null = null;
  @state() private matches: Record<string, string> = {};
  @state() private status: "idle" | "correct" | "incorrect" = "idle";

  protected createController() {
    return new A2uiController(this, DragAndDropMatchApi);
  }

  private text(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private handleLeftClick(id: string) {
    if (this.status !== "idle") return;
    if (this.selectedLeftId === id) {
      this.selectedLeftId = null;
    } else {
      this.selectedLeftId = id;
    }
    this.requestUpdate();
  }

  private handleRightClick(rightId: string) {
    if (this.status !== "idle") return;

    // If a left item is selected, pair them up!
    if (this.selectedLeftId) {
      const next = { ...this.matches };

      // Remove any existing pairing that points to this rightId
      for (const [key, val] of Object.entries(next)) {
        if (val === rightId) delete next[key];
      }

      next[this.selectedLeftId] = rightId;
      this.matches = next;
      this.selectedLeftId = null;
      this.requestUpdate();
      return;
    }

    // If no left item is selected, but rightId is already paired, clicking unpairs it!
    for (const [key, val] of Object.entries(this.matches)) {
      if (val === rightId) {
        const next = { ...this.matches };
        delete next[key];
        this.matches = next;
        this.requestUpdate();
        return;
      }
    }
  }

  private reset() {
    this.selectedLeftId = null;

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

  // Drag & drop handlers
  private handleDragStart(e: DragEvent, leftId: string) {
    if (this.status !== "idle") return;
    e.dataTransfer?.setData("text/plain", leftId);
    this.selectedLeftId = leftId;
    this.requestUpdate();
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
  }

  private handleDrop(e: DragEvent, rightId: string) {
    e.preventDefault();
    const leftId = e.dataTransfer?.getData("text/plain") || this.selectedLeftId;
    if (leftId) {
      this.selectedLeftId = leftId;
      this.handleRightClick(rightId);
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

    const title = this.text(props.title) || uiText("连线匹配练习", "Matching Exercise");
    const instruction =
      this.text(props.instruction) ||
      uiText("点击左侧项目高亮，再点击右侧对应选项进行连线配对（也可拖拽匹配）。", "Click a left item, then click its matching right item (or drag & drop).");
    const leftLabel = this.text(props.leftLabel) || uiText("待匹配项", "Items");
    const rightLabel = this.text(props.rightLabel) || uiText("对应选项", "Options");

    const feedback =
      this.status === "correct"
        ? this.text(props.successMessage) || uiText("全部匹配正确！", "All items matched correctly!")
        : this.text(props.incorrectMessage) ||
          uiText("匹配存在错误，请核对红色标记项。", "Some matches are incorrect. Please check the red items.");

    const explanations =
      props.matchExplanations && answered
        ? leftItems
            .map((item: any) => ({ label: this.text(item.content), content: this.text(props.matchExplanations[item.id]) }))
            .filter((item: { content: string }) => item.content)
        : [];

    // Helper map to assign index numbers (1, 2, 3...) to pairings
    const leftIdsOrder = leftItems.map((i: any) => i.id);
    const getPairNumber = (leftId: string): number => leftIdsOrder.indexOf(leftId) + 1;

    return html`
      <section class="board ${this.status}" aria-label=${title}>
        <header>
          <h3>${title}</h3>
          <p class="instruction">${instruction}</p>
          <span class="progress">${uiText("已连接", "Connected")} ${Object.keys(this.matches).length} / ${leftItems.length}</span>
        </header>

        <div class="matching-columns">
          <!-- Left Column -->
          <div class="column-box">
            <div class="column-title">${leftLabel}</div>
            <div class="items-stack">
              ${leftItems.map((item: any) => {
                const isSelected = this.selectedLeftId === item.id;
                const pairedRightId = this.matches[item.id];
                const isPaired = Boolean(pairedRightId);
                const pairNum = getPairNumber(item.id);

                let statusClass = isSelected ? "active-selected" : isPaired ? "paired" : "";
                if (answered && isPaired) {
                  statusClass = correct[item.id] === pairedRightId ? "correct" : "incorrect";
                }

                return html`
                  <div
                    class="match-card ${statusClass}"
                    draggable=${!answered ? "true" : "false"}
                    @dragstart=${(e: DragEvent) => this.handleDragStart(e, item.id)}
                    @click=${() => this.handleLeftClick(item.id)}
                  >
                    <span>${this.text(item.content)}</span>
                    ${isPaired
                      ? html`<span class="pair-badge ${answered ? (correct[item.id] === pairedRightId ? "correct" : "incorrect") : ""}">
                          #${pairNum}
                        </span>`
                      : isSelected
                      ? html`<span class="pair-badge">点击选择右侧 →</span>`
                      : nothing}
                  </div>
                `;
              })}
            </div>
          </div>

          <!-- Right Column -->
          <div class="column-box">
            <div class="column-title">${rightLabel}</div>
            <div class="items-stack">
              ${rightItems.map((rItem: any) => {
                // Find which left item is paired with this rItem.id
                const pairedLeftEntry = Object.entries(this.matches).find(([_, val]) => val === rItem.id);
                const pairedLeftId = pairedLeftEntry ? pairedLeftEntry[0] : null;
                const isPaired = Boolean(pairedLeftId);
                const pairNum = pairedLeftId ? getPairNumber(pairedLeftId) : null;

                let statusClass = isPaired ? "paired" : "";
                if (answered && pairedLeftId) {
                  statusClass = correct[pairedLeftId] === rItem.id ? "correct" : "incorrect";
                }

                return html`
                  <div
                    class="match-card ${statusClass}"
                    @dragover=${this.handleDragOver}
                    @drop=${(e: DragEvent) => this.handleDrop(e, rItem.id)}
                    @click=${() => this.handleRightClick(rItem.id)}
                  >
                    <span>${this.text(rItem.content)}</span>
                    ${isPaired
                      ? html`<span class="pair-badge ${answered ? (correct[pairedLeftId!] === rItem.id ? "correct" : "incorrect") : ""}">
                          #${pairNum}
                        </span>`
                      : nothing}
                  </div>
                `;
              })}
            </div>
          </div>
        </div>

        ${answered
          ? html`
              <div class="feedback ${this.status}" role="status" aria-live="polite">
                <strong>${this.status === "correct" ? uiText("匹配完成", "Complete") : uiText("再想一想", "Try again")}</strong>
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

if (!customElements.get("a2learn-drag-drop-match")) {
  customElements.define("a2learn-drag-drop-match", A2learnDragAndDropMatchElement as any);
}

export const A2learnDragAndDropMatch = { ...DragAndDropMatchApi, tagName: "a2learn-drag-drop-match" };
