import componentStyles from "../styles/components/LearningSection.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { map } from "lit/directives/map.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { LearningSectionApi } from "../api";
import { uiText } from "../utils/i18n";

const STAGE_LABELS = {
  problem: () => uiText("01 · 问题", "01 · Problem"),
  outline: () => uiText("02 · 轮廓", "02 · Outline"),
  solution: () => uiText("03 · 解法", "03 · Solution"),
  deepening: () => uiText("04 · 深入", "04 · Deepening"),
  newQuestion: () => uiText("05 · 新的问题", "05 · New Question"),
} as const;

export class A2learnLearningSectionElement extends A2uiLitElement<typeof LearningSectionApi> {
  static styles = [unsafeCSS(componentStyles)];

  protected createController() {
    return new A2uiController(this, LearningSectionApi);
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;
    const children = Array.isArray(props.children) ? props.children : [];
    const stage = props.stage as keyof typeof STAGE_LABELS | undefined;
    // Research and review pages need their own vocabulary. A free eyebrow
    // deliberately takes precedence over the teaching-stage shorthand.
    const eyebrow = props.eyebrow ? this.resolveString(props.eyebrow) : (stage ? STAGE_LABELS[stage]?.() ?? "" : "");
    const title = this.resolveString(props.title);
    const showTitle = props.showTitle !== false;
    const summary = props.summary ? this.resolveString(props.summary) : "";

    return html`
      <section class="learning-section" aria-label=${title}>
        <header class="section-header">
          <p class="section-eyebrow">${eyebrow}</p>
          ${showTitle ? html`<h2 class="section-title">${title}</h2>` : nothing}
          ${summary ? html`<p class="section-summary">${summary}</p>` : nothing}
        </header>
        <div class="section-content">
          ${map(children, (child: unknown) => html`${this.renderNode(child as any)}`)}
        </div>
      </section>
    `;
  }
}

if (!customElements.get("a2learn-learning-section")) {
  customElements.define("a2learn-learning-section", A2learnLearningSectionElement);
}

export const A2learnLearningSection = {
  ...LearningSectionApi,
  tagName: "a2learn-learning-section",
};
