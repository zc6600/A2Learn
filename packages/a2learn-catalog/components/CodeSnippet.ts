import componentStyles from "../styles/components/CodeSnippet.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { CodeSnippetApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class A2learnCodeSnippetElement extends A2uiLitElement<typeof CodeSnippetApi> {
  static styles = unsafeCSS(componentStyles);

  @state() private isCopied = false;

  protected createController() {
    return new A2uiController(this, CodeSnippetApi);
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

  private handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.isCopied = true;
      (this as any).requestUpdate();
      setTimeout(() => {
        this.isCopied = false;
        (this as any).requestUpdate();
      }, 2000);
    });
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const rawCode = this.resolveString(props.code || props.content || props.snippet) || "";
    const language = props.language ? this.resolveString(props.language) : (props.lang ? this.resolveString(props.lang) : "plaintext");
    const title = props.title ? this.resolveString(props.title) : "";
    const highlightLines = props.highlightLines || [];

    // Split code into lines for basic rendering
    const lines = rawCode.split('\n');
    // If the last line is empty (due to trailing newline), don't render it
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    return html`
      <div class="snippet-container">
        <div class="header">
          <div class="mac-dots">
            <div class="dot red"></div>
            <div class="dot yellow"></div>
            <div class="dot green"></div>
          </div>
          
          <div class="title-area">
            ${title ? html`<span class="file-name">${title}</span>` : nothing}
            <span class="language-badge">${language}</span>
          </div>
          
          <button class="copy-btn ${this.isCopied ? 'copied' : ''}" @click=${() => this.handleCopy(rawCode)}>
            ${this.isCopied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        
        <pre class="code-content"><code>${lines.map((line, idx) => {
          const lineNumber = idx + 1;
          const isHighlighted = highlightLines.includes(lineNumber);
          return html`<span class="line ${isHighlighted ? 'highlight' : ''}"><span class="line-number">${lineNumber}</span>${line || ' '}</span>`;
        })}</code></pre>
      </div>
    `;
  }
}

if (!customElements.get("a2learn-code-snippet")) {
  customElements.define("a2learn-code-snippet", A2learnCodeSnippetElement as any);
}

export const A2learnCodeSnippet = {
  ...CodeSnippetApi,
  tagName: "a2learn-code-snippet",
};
