import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { AchievementApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnAchievementElement extends A2uiLitElement<typeof AchievementApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-m) 0;
    }
    .achievement-card {
      display: flex;
      align-items: center;
      gap: var(--a2ui-spacing-l);
      padding: var(--a2ui-spacing-l);
      border-radius: var(--a2ui-border-radius);
      background: linear-gradient(135deg, #fff5e6 0%, #fffbf2 100%);
      border: 1px solid #fbe6c4;
      box-shadow: 0 4px 12px rgba(255, 160, 0, 0.1);
      position: relative;
      overflow: hidden;
    }
    .achievement-card::before {
      content: "";
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%);
      opacity: 0.5;
      animation: rotate 10s linear infinite;
    }
    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .icon-container {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #ffb300;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      flex-shrink: 0;
      box-shadow: 0 4px 8px rgba(255, 179, 0, 0.3);
      position: relative;
      z-index: 1;
    }
    .content {
      position: relative;
      z-index: 1;
      flex: 1;
    }
    .title {
      font-size: var(--a2ui-font-size-l);
      font-weight: 700;
      color: #b37700;
      margin: 0 0 4px 0;
    }
    .description {
      font-size: var(--a2ui-font-size-m);
      color: var(--a2ui-color-on-surface);
      margin: 0 0 8px 0;
      line-height: 1.4;
    }
    .date {
      font-size: var(--a2ui-font-size-s);
      color: var(--app-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `;

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
