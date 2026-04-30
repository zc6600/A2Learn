import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DragAndDropMatchApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class A2learnDragAndDropMatchElement extends A2uiLitElement<typeof DragAndDropMatchApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .match-board {
      background: var(--a2ui-color-surface);
      border: 1px solid var(--a2ui-color-border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .columns-container {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      position: relative;
    }
    .column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 1;
    }
    .item {
      padding: 16px;
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border: 2px solid var(--a2ui-color-border);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 15px;
      font-weight: 500;
      color: var(--a2ui-color-on-surface);
      position: relative;
      text-align: center;
      user-select: none;
    }
    .item:hover:not(.disabled) {
      border-color: var(--a2ui-color-primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .item.selected {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 10%, transparent);
      box-shadow: 0 0 0 3px color-mix(in oklab, var(--a2ui-color-primary) 20%, transparent);
    }
    .item.matched {
      border-color: var(--a2ui-color-primary);
      background: color-mix(in oklab, var(--a2ui-color-primary) 5%, transparent);
      opacity: 0.8;
    }
    .item.disabled {
      cursor: default;
    }
    
    /* Error state highlights */
    .match-board.incorrect .item.matched-wrong {
      border-color: var(--a2ui-color-error, #f44336);
      background: color-mix(in oklab, var(--a2ui-color-error, #f44336) 10%, transparent);
      color: var(--a2ui-color-error, #f44336);
    }
    .match-board.incorrect .item.matched-correct {
      border-color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 10%, transparent);
    }
    
    .match-board.correct .item {
      border-color: var(--a2ui-color-success, #4caf50);
      background: color-mix(in oklab, var(--a2ui-color-success, #4caf50) 5%, transparent);
    }

    svg.connections {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    path.line {
      stroke: var(--a2ui-color-primary);
      stroke-width: 3;
      fill: none;
      opacity: 0.6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .match-board.correct path.line { stroke: var(--a2ui-color-success, #4caf50); }
    path.line.wrong { stroke: var(--a2ui-color-error, #f44336); stroke-dasharray: 5,5; }

    .actions {
      margin-top: 24px;
      display: flex;
      justify-content: center;
      gap: 16px;
      position: relative;
      z-index: 1;
    }
    .btn {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-submit {
      background: var(--a2ui-color-primary);
      color: white;
    }
    .btn-submit:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .btn-reset {
      background: transparent;
      border: 1px solid var(--a2ui-color-border);
      color: var(--a2ui-color-on-surface);
    }
    .btn-reset:hover { background: color-mix(in oklab, var(--a2ui-color-surface) 90%, black); }
  `;

  @state() private selectedLeftId: string | null = null;
  @state() private selectedRightId: string | null = null;
  @state() private localMatches: Record<string, string> = {}; // { leftId: rightId }
  @state() private localStatus: 'idle' | 'correct' | 'incorrect' = 'idle';

  protected createController() {
    return new A2uiController(this, DragAndDropMatchApi);
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

  private handleLeftClick(id: string) {
    if (this.localStatus !== 'idle') return;
    
    // Toggle selection or select new
    this.selectedLeftId = this.selectedLeftId === id ? null : id;
    (this as any).requestUpdate();
    
    // If right was already selected, make a match
    if (this.selectedLeftId && this.selectedRightId) {
      this.createMatch();
    }
  }

  private handleRightClick(id: string) {
    if (this.localStatus !== 'idle') return;

    // Toggle selection or select new
    this.selectedRightId = this.selectedRightId === id ? null : id;
    (this as any).requestUpdate();
    
    // If left was already selected, make a match
    if (this.selectedLeftId && this.selectedRightId) {
      this.createMatch();
    }
  }

  private createMatch() {
    if (!this.selectedLeftId || !this.selectedRightId) return;

    // Remove any existing matches for these items
    const newMatches = { ...this.localMatches };
    
    // Remove if left was matched elsewhere
    delete newMatches[this.selectedLeftId];
    
    // Remove if right was matched elsewhere
    for (const [lId, rId] of Object.entries(newMatches)) {
      if (rId === this.selectedRightId) {
        delete newMatches[lId];
      }
    }

    // Add new match
    newMatches[this.selectedLeftId] = this.selectedRightId;
    this.localMatches = newMatches;
    
    // Clear selections
    this.selectedLeftId = null;
    this.selectedRightId = null;
    
    // Force re-render to update SVG lines
    (this as any).requestUpdate();
  }

  private handleReset() {
    this.localMatches = {};
    this.selectedLeftId = null;
    this.selectedRightId = null;
    this.localStatus = 'idle';
    (this as any).requestUpdate();
  }

  private handleSubmit(correctMatches: Record<string, string> | undefined) {
    if (this.localStatus !== 'idle') return;
    
    const props = (this as any).controller?.props;
    if (!props) return;

    let isAllCorrect = true;
    if (correctMatches && Object.keys(correctMatches).length > 0) {
      // 前端闭环校验逻辑
      for (const [leftId, expectedRightId] of Object.entries(correctMatches)) {
        if (this.localMatches[leftId] !== expectedRightId) {
          isAllCorrect = false;
          break;
        }
      }
      this.localStatus = isAllCorrect ? 'correct' : 'incorrect';
    } else {
      // 如果没有配置标准答案，当做匹配成功
      this.localStatus = 'correct';
    }
    (this as any).requestUpdate();

    if (props.onMatchComplete) {
      (this as any).context.dispatchAction({
        ...(props.onMatchComplete as Record<string, unknown>),
        context: { isCorrect: isAllCorrect, userMatches: this.localMatches },
      });
    }
  }

  // --- SVG Drawing Logic ---
  // Note: For a robust implementation, we would use ResizeObserver and getBoundingClientRect,
  // but for this conceptual Lit element, we'll use approximate fixed percentages.
  private renderConnections(correctMatches: Record<string, string>) {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const leftItems = props.leftItems || [];
    const rightItems = props.rightItems || [];

    return html`
      <svg class="connections">
        ${Object.entries(this.localMatches).map(([leftId, rightId]) => {
          const leftIndex = leftItems.findIndex((i: any) => i.id === leftId);
          const rightIndex = rightItems.findIndex((i: any) => i.id === rightId);
          
          if (leftIndex === -1 || rightIndex === -1) return nothing;

          // Approximate positions based on gap=16px and padding
          // A real implementation would calculate actual DOM coordinates
          const itemHeight = 60; 
          const gap = 16;
          const topOffset = 24 + (itemHeight / 2); // padding + half item height
          
          const y1 = topOffset + leftIndex * (itemHeight + gap);
          const y2 = topOffset + rightIndex * (itemHeight + gap);
          
          const x1 = '45%'; // End of left column
          const x2 = '55%'; // Start of right column
          
          // Curve path for aesthetics
          const path = `M ${x1} ${y1} C 50% ${y1}, 50% ${y2}, ${x2} ${y2}`;

          // Determine line style if answered
          let lineClass = 'line';
          if (this.localStatus === 'incorrect') {
            const isCorrectMatch = correctMatches[leftId] === rightId;
            if (!isCorrectMatch) lineClass += ' wrong';
          }

          return html`<path class="${lineClass}" d="${path}" />`;
        })}
      </svg>
    `;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const leftItems = props.leftItems || [];
    const rightItems = props.rightItems || [];
    const correctMatches = props.correctMatches || {};
    
    const status = this.localStatus;
    const hasAnswered = status !== 'idle';
    
    const isReadyToSubmit = Object.keys(this.localMatches).length === leftItems.length;

    return html`
      <div class="match-board ${status}">
        <div class="columns-container">
          ${this.renderConnections(correctMatches)}
          
          <!-- Left Column -->
          <div class="column left-col">
            ${leftItems.map((item: any) => {
              const isSelected = this.selectedLeftId === item.id;
              const isMatched = !!this.localMatches[item.id];
              
              let itemClass = 'item';
              if (isSelected) itemClass += ' selected';
              if (isMatched) itemClass += ' matched';
              if (hasAnswered) {
                itemClass += ' disabled';
                if (status === 'incorrect') {
                  const actualRight = this.localMatches[item.id];
                  const expectedRight = correctMatches[item.id];
                  itemClass += actualRight === expectedRight ? ' matched-correct' : ' matched-wrong';
                }
              }

              return html`
                <div class="${itemClass}" @click=${() => this.handleLeftClick(item.id)}>
                  ${this.resolveString(item.content)}
                </div>
              `;
            })}
          </div>

          <!-- Right Column -->
          <div class="column right-col">
            ${rightItems.map((item: any) => {
              const isSelected = this.selectedRightId === item.id;
              // Check if any left item is matched to this right item
              const isMatched = Object.values(this.localMatches).includes(item.id);
              
              let itemClass = 'item';
              if (isSelected) itemClass += ' selected';
              if (isMatched) itemClass += ' matched';
              if (hasAnswered) {
                itemClass += ' disabled';
                if (status === 'incorrect') {
                  // Find which left item matched this right item
                  const matchedLeftId = Object.keys(this.localMatches).find(lId => this.localMatches[lId] === item.id);
                  if (matchedLeftId) {
                    const expectedRight = correctMatches[matchedLeftId];
                    itemClass += item.id === expectedRight ? ' matched-correct' : ' matched-wrong';
                  }
                }
              }

              return html`
                <div class="${itemClass}" @click=${() => this.handleRightClick(item.id)}>
                  ${this.resolveString(item.content)}
                </div>
              `;
            })}
          </div>
        </div>

        ${!hasAnswered ? html`
          <div class="actions">
            <button class="btn btn-reset" @click=${this.handleReset}>Reset</button>
            <button class="btn btn-submit" @click=${() => this.handleSubmit(correctMatches)} ?disabled=${!isReadyToSubmit}>
              Check Matches
            </button>
          </div>
        ` : html`
          <div class="actions">
             <button class="btn btn-reset" @click=${this.handleReset}>Try Again</button>
          </div>
        `}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-drag-drop-match")) {
  customElements.define("a2learn-drag-drop-match", A2learnDragAndDropMatchElement as any);
}

export const A2learnDragAndDropMatch = {
  ...DragAndDropMatchApi,
  tagName: "a2learn-drag-drop-match",
};
