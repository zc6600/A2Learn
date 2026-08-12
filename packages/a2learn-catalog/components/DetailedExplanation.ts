import componentStyles from "../styles/components/DetailedExplanation.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { DetailedExplanationApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml, tooltipStyles } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnDetailedExplanationElement extends A2uiLitElement<typeof DetailedExplanationApi> {
  static styles = [
    tooltipStyles,
    unsafeCSS(componentStyles)
];

  protected createController() {
    return new A2uiController(this, DetailedExplanationApi);
  }

  // Code-block copy buttons live inside unsafeHTML-rendered markdown, so they
  // aren't Lit templates and can't take a @click binding directly. Delegate
  // from the wrapping .content-body div instead, which Lit does control.
  private async handleContentClick(e: Event) {
    const target = e.target as HTMLElement;
    const btn = target.closest(".code-copy-btn") as HTMLButtonElement | null;
    if (!btn) return;

    const codeEl = btn.closest(".code-block")?.querySelector("code");
    if (!codeEl) return;

    try {
      await navigator.clipboard.writeText(codeEl.textContent || "");
      const original = btn.textContent;
      btn.textContent = uiText("已复制", "Copied");
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original || uiText("复制", "Copy");
        btn.classList.remove("copied");
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently.
    }
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

    const codeBlocks: string[] = [];

    // 1) Extract code blocks (both ```lang ... ``` and raw <pre><code>...</code></pre>)
    // into placeholders FIRST, so that double newlines (\n\n) inside code blocks
    // do not break paragraph splitting into orphaned tags like </code></pre>.
    let htmlContent = markdown.replace(
      /```([a-zA-Z0-9_+-]*)[ \t]*\r?\n?([\s\S]*?)\r?\n?```/g,
      (_match, lang: string, code: string) => {
        const langLabel = (lang || "text").trim().toLowerCase();
        const escapedCode = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const placeholder = `\x1aCODEBLOCK_${codeBlocks.length}\x1a`;
        codeBlocks.push(
          `<div class="code-block"><div class="code-block-header"><span class="code-block-lang">${langLabel}</span><button type="button" class="code-copy-btn">${uiText("复制", "Copy")}</button></div><pre><code class="language-${langLabel}">${escapedCode}</code></pre></div>`
        );
        return placeholder;
      }
    );

    // Handle any raw <pre><code>...</code></pre> or <pre>...</pre> tags in input
    htmlContent = htmlContent.replace(
      /<pre(?:\s+[^>]*)?>[\s\S]*?<\/pre>/gi,
      (match) => {
        const placeholder = `\x1aCODEBLOCK_${codeBlocks.length}\x1a`;
        codeBlocks.push(match);
        return placeholder;
      }
    );

    // 2) Replace bold tags
    htmlContent = htmlContent
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/<b>/gi, "<strong>")
      .replace(/<\/b>/gi, "</strong>");

    // 3) Replace inline code `code`
    htmlContent = htmlContent.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 4) Parse blockquotes
    htmlContent = htmlContent
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("&gt;")) {
          return `<blockquote>${line.trim().substring(4).trim()}</blockquote>`;
        }
        return line;
      })
      .join("\n");

    // 5) Parse bullet points
    let inList = false;
    const lines = htmlContent.split("\n");
    const outputLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ") ||
        trimmed.startsWith("• ")
      ) {
        if (!inList) {
          outputLines.push("<ul>");
          inList = true;
        }
        const text = trimmed.replace(/^[-*•]\s*/, "");
        outputLines.push(`<li>${text}</li>`);
      } else if (trimmed === "" && inList) {
        const nextLine = lines.slice(i + 1).find((l) => l.trim().length > 0);
        if (
          nextLine &&
          (nextLine.trim().startsWith("- ") ||
            nextLine.trim().startsWith("* ") ||
            nextLine.trim().startsWith("• "))
        ) {
          continue;
        } else {
          outputLines.push("</ul>");
          inList = false;
        }
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
    htmlContent = htmlContent
      .split(/\n{2,}/)
      .map((p) => {
        const trimmed = p.trim();
        if (
          trimmed.startsWith("<ul>") ||
          trimmed.startsWith("<pre>") ||
          trimmed.startsWith("<blockquote>") ||
          trimmed.startsWith('<div class="code-block"') ||
          trimmed.startsWith("\x1aCODEBLOCK_")
        ) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("");

    // 7) Restore code block placeholders
    codeBlocks.forEach((block, idx) => {
      const placeholder = `\x1aCODEBLOCK_${idx}\x1a`;
      htmlContent = htmlContent.replace(placeholder, block);
    });

    return htmlContent;
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "";
    const content = this.resolveString(props.content);
    const icon = props.icon ? this.resolveString(props.icon) : "";

    const parsedContent = this.renderMarkdown(content);
    const centered = props.contentAlign === "center";

    return html`
      <div class="explanation-card">
        ${title || icon
          ? html`
              <div class="header">
                ${icon ? html`<span class="icon">${icon}</span>` : nothing}
                ${title ? html`<h2 class="title">${title}</h2>` : nothing}
              </div>
            `
          : nothing}

            <div class="content-body ${centered ? "centered" : ""}" @click=${this.handleContentClick}>
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
