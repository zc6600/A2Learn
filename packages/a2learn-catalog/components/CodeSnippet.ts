import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { CodeSnippetApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

export class A2learnCodeSnippetElement extends A2uiLitElement<typeof CodeSnippetApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
      font-family: var(--a2ui-font-family);
    }
    .snippet-container {
      background: #1e1e1e;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      border: 1px solid #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #2d2d2d;
      border-bottom: 1px solid #444;
    }
    .mac-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot.red { background: #ff5f56; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #27c93f; }
    
    .title-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-name {
      color: #ccc;
      font-size: 13px;
      font-family: monospace;
    }
    .language-badge {
      color: #4fc1ff;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      border: 1px solid #4fc1ff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .copy-btn {
      background: transparent;
      border: none;
      color: #888;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      transition: color 0.2s;
    }
    .copy-btn:hover {
      color: #fff;
    }
    .copy-btn.copied {
      color: #4fc1ff;
    }
    .code-content {
      padding: 16px;
      margin: 0;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      line-height: 1.5;
      color: #d4d4d4;
      white-space: pre;
    }
    /* Simple line highlighting */
    .line {
      display: block;
      padding: 0 16px;
      margin: 0 -16px;
      border-left: 3px solid transparent;
    }
    .line.highlight {
      background: rgba(255, 255, 255, 0.1);
      border-left-color: #4fc1ff;
    }
    .line-number {
      display: inline-block;
      width: 24px;
      color: #858585;
      text-align: right;
      margin-right: 16px;
      user-select: none;
    }
  `;

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

    const rawCode = this.resolveString(props.code) || "";
    const language = props.language ? this.resolveString(props.language) : "plaintext";
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
