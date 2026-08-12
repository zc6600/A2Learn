import componentStyles from "../styles/components/Achievement.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { AchievementApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnAchievementElement extends A2uiLitElement<typeof AchievementApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles),
  ];

  protected createController() {
    return new A2uiController(this, AchievementApi);
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
    const props = this.controller?.props;
    if (!props) return nothing;

    const title = this.resolveString(props.title);
    const description = this.resolveString(props.description);
    const icon = this.resolveString(props.icon) || "🏆";
    const unlockedAt = props.unlockedAt ? this.resolveString(props.unlockedAt) : new Date().toLocaleDateString();

    return html`
      <div class="achievement-card">
        <div class="icon-container">${icon}</div>
        <div class="content">
          <h3 class="title">${uiText("解锁成就：", "Achievement unlocked: ")}${title}</h3>
          <p class="description">${unsafeHTML(sanitizeHtml(description))}</p>
          <div class="date">
            <span>📅</span> ${unlockedAt}
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-achievement")) {
  customElements.define("a2learn-achievement", A2learnAchievementElement);
}

export const A2learnAchievement = {
  ...AchievementApi,
  tagName: "a2learn-achievement",
};
