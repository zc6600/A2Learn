import { html, css, nothing } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DetailedExplanationApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnDetailedExplanationElement extends A2uiLitElement<typeof DetailedExplanationApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l, 20px) 0;
      font-family: var(--a2ui-font-family, sans-serif);
    }
    .explanation-card {
      border: 1px solid var(--a2ui-color-border, #e2e8f0);
      border-left: 5px solid var(--a2ui-color-primary, #3b82f6);
      border-radius: 8px var(--a2ui-border-radius, 16px) var(--a2ui-border-radius, 16px) 8px;
      background: var(--a2ui-color-surface, #ffffff);
      padding: var(--a2ui-spacing-xl, 32px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      position: relative;
      transition: all 0.3s ease;
    }
    .explanation-card:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    }
    .meta-badge {
      position: absolute;
      top: 20px;
      right: 20px;
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 8%, var(--a2ui-color-surface, #ffffff));
      color: var(--a2ui-color-primary, #3b82f6);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .icon {
      font-size: 24px;
    }
    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--a2ui-color-on-surface, #1e293b);
      letter-spacing: -0.5px;
    }
    .content-body {
      font-size: 16px;
      line-height: 1.8;
      color: var(--a2ui-color-on-surface, #334155);
    }
    .content-body p {
      margin: 0 0 16px 0;
    }
    .content-body p:last-child {
      margin-bottom: 0;
    }
    .content-body strong {
      color: var(--a2ui-color-primary, #3b82f6);
    }
    .content-body ul, .content-body ol {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }
    .content-body li {
      margin-bottom: 8px;
    }
    .content-body code {
      font-family: "JetBrains Mono", "Fira Code", monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 6%, var(--a2ui-color-surface, #ffffff));
      color: var(--a2ui-color-primary, #3b82f6);
      font-size: 0.9em;
      border: 1px solid color-mix(in oklab, var(--a2ui-color-primary, #3b82f6) 12%, transparent);
    }
    .content-body pre {
      background: #0f172a;
      color: #38bdf8;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
    }
    .content-body pre code {
      background: transparent;
      border: none;
      color: inherit;
      padding: 0;
    }
    .content-body blockquote {
      margin: 16px 0;
      padding: 8px 16px;
      border-left: 4px solid var(--a2ui-color-secondary, #6366f1);
      background: color-mix(in oklab, var(--a2ui-color-secondary, #6366f1) 4%, var(--a2ui-color-surface, #ffffff));
      color: color-mix(in oklab, var(--a2ui-color-on-surface, #334155) 90%, transparent);
      border-radius: 0 8px 8px 0;
    }
  `;

  protected createController() {
    return new A2uiController(this, DetailedExplanationApi);
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

  private renderMarkdown(markdown: string): string {
    if (!markdown) return "";
    let htmlContent = markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 1) Replace code blocks
    htmlContent = htmlContent.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]+?)\n```/g, "<pre><code>$1</code></pre>");

    // 2) Replace inline code
    htmlContent = htmlContent.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 3) Replace bold
    htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // 4) Parse blockquotes
    htmlContent = htmlContent.split("\n").map(line => {
      if (line.trim().startsWith("&gt;")) {
        return `<blockquote>${line.trim().substring(4).trim()}</blockquote>`;
      }
      return line;
    }).join("\n");

    // 5) Parse bullet points
    let inList = false;
    const lines = htmlContent.split("\n");
    const outputLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList) {
          outputLines.push("<ul>");
          inList = true;
        }
        outputLines.push(`<li>${trimmed.substring(2)}</li>`);
      } else {
        if (inList) {
          outputLines.push("</ul>");
          inList = false;
        }
        outputLines.push(line);
      }
    }
    if (inList) outputLines.push("</ul>");
    htmlContent = outputLines.join("\n");

    // 6) Split paragraphs
    const paragraphs = htmlContent
      .split(/\n{2,}/)
      .map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith("<ul>") || trimmed.startsWith("<pre>") || trimmed.startsWith("<blockquote>")) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    return paragraphs;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "";
    const content = this.resolveString(props.content);
    const icon = props.icon ? this.resolveString(props.icon) : "";
    const estimatedReadTime = props.estimatedReadTime ? this.resolveString(props.estimatedReadTime) : "";

    const parsedContent = this.renderMarkdown(content);

    return html`
      <div class="explanation-card">
        ${estimatedReadTime
          ? html`
              <div class="meta-badge">
                <span>⏱️</span>
                <span>${estimatedReadTime}</span>
              </div>
            `
          : nothing}

        ${title || icon
          ? html`
              <div class="header">
                ${icon ? html`<span class="icon">${icon}</span>` : nothing}
                ${title ? html`<h2 class="title">${title}</h2>` : nothing}
              </div>
            `
          : nothing}

        <div class="content-body">
          ${unsafeHTML(sanitizeHtml(parsedContent))}
        </div>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-detailed-explanation")) {
  customElements.define("a2learn-detailed-explanation", A2learnDetailedExplanationElement as any);
}

export const A2learnDetailedExplanation = {
  ...DetailedExplanationApi,
  tagName: "a2learn-detailed-explanation",
};
