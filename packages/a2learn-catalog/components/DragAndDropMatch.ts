import componentStyles from "../styles/components/DragAndDropMatch.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DragAndDropMatchApi } from "../api";
import { uiText } from "../utils/i18n";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";

/** Two-column Matching component with dual Click-to-Pair & Drag-and-Drop support. */
export class A2learnDragAndDropMatchElement extends A2uiLitElement<typeof DragAndDropMatchApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

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

if (!customElements.get("a2learn-drag-drop-match")) {
  customElements.define("a2learn-drag-drop-match", A2learnDragAndDropMatchElement as any);
}

export const A2learnDragAndDropMatch = { ...DragAndDropMatchApi, tagName: "a2learn-drag-drop-match" };
