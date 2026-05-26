import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { InteractiveSandboxApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "./sanitize";

export class A2learnInteractiveSandboxElement extends A2uiLitElement<typeof InteractiveSandboxApi> {
  static styles = css`
    :host {
      display: block;
      margin: var(--a2ui-spacing-l) 0;
    }
    .sandbox-container {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--a2ui-color-border);
      border-radius: var(--a2ui-border-radius);
      background: var(--a2ui-color-surface);
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--a2ui-spacing-s) var(--a2ui-spacing-m);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, black);
      border-bottom: 1px solid var(--a2ui-color-border);
    }
    .title-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--a2ui-color-on-surface);
    }
    .language-badge {
      background: var(--a2ui-color-primary);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: bold;
    }
    .run-btn {
      background: #34a853;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .run-btn:hover:not(:disabled) {
      background: #2d8a46;
    }
    .run-btn:disabled {
      background: #a5d6a7;
      cursor: not-allowed;
    }
    .run-btn::before {
      content: "▶";
      font-size: 10px;
    }
    .workspace {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 250px;
    }
    .editor-pane {
      border-right: 1px solid var(--a2ui-color-border);
      display: flex;
      flex-direction: column;
    }
    .output-pane {
      display: flex;
      flex-direction: column;
      background: color-mix(in oklab, var(--a2ui-color-surface) 98%, var(--a2ui-color-primary));
    }
    .pane-header {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--app-muted);
      border-bottom: 1px solid var(--a2ui-color-border);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, transparent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    textarea.code-input {
      flex: 1;
      border: none;
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.5;
      resize: none;
      background: #1e1e1e;
      color: #d4d4d4;
      outline: none;
      white-space: pre;
      overflow-wrap: normal;
      overflow-x: auto;
    }
    .output-content {
      flex: 1;
      font-family: monospace;
      font-size: 14px;
      overflow: hidden;
      background: white;
    }
    iframe.preview-frame {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    .output-content.error {
      color: #c5221f;
      background: #fce8e6;
      padding: 12px;
      white-space: pre-wrap;
    }
    .output-content.idle {
      color: var(--app-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-style: italic;
      padding: 12px;
    }
    .description {
      padding: var(--a2ui-spacing-m);
      font-size: 14px;
      color: var(--a2ui-color-on-surface);
      border-top: 1px solid var(--a2ui-color-border);
      background: #f8f9fa;
    }
    
    @media (max-width: 768px) {
      .workspace {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
      .editor-pane {
        border-right: none;
        border-bottom: 1px solid var(--a2ui-color-border);
      }
    }
  `;

  @state() private localStatus: "idle" | "running" | "success" | "error" = "idle";
  @state() private localOutput: string = "";

  private localObjectUrl: string | null = null;

  protected createController() {
    return new A2uiController(this, InteractiveSandboxApi);
  }

  connectedCallback() {
    super.connectedCallback();
    this.syncProps();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.revokeLocalObjectUrl();
  }

  private revokeLocalObjectUrl() {
    if (!this.localObjectUrl) return;
    URL.revokeObjectURL(this.localObjectUrl);
    this.localObjectUrl = null;
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    super.updated(changedProperties);
    if (changedProperties.has('controller')) {
      this.syncProps();
    }
  }

  private syncProps() {
    const props = this.controller?.props;
    if (props) {
      const nextOutput = this.resolveString(props.output || "");
      if (this.localObjectUrl && nextOutput !== this.localObjectUrl) {
        this.revokeLocalObjectUrl();
      }
      this.localStatus = props.status || "idle";
      this.localOutput = nextOutput;
      (this as any).requestUpdate();
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

  private handleRunClick() {
    const props = this.controller?.props;
    if (!props) return;
    
    // 获取当前 textarea 中的最新代码
    const textarea = this.shadowRoot?.querySelector('.code-input') as HTMLTextAreaElement;
    const currentCode = textarea ? textarea.value : this.resolveString(props.code);

    const language = props.language || "javascript";

    // runLocally 默认为 true：LLM 可能不设置此字段，但应默认在本地执行
    const shouldRunLocally = props.runLocally !== false;

    if (shouldRunLocally) {
      this.executeLocally(currentCode, language);
    } else if (props.onRunCode) {
      this.context.dispatchAction({
        ...(props.onRunCode as Record<string, unknown>),
        context: { code: currentCode },
      });
    }
  }

  private executeLocally(code: string, language: string) {
    this.localStatus = "running";
    this.localOutput = "Running...";
    (this as any).requestUpdate();
    
    setTimeout(() => {
      try {
        let finalHtml = "";

        if (language === "html") {
          finalHtml = code;
        } else if (language === "javascript") {
          // wrap in html to capture console and execute
          finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: #333; white-space: pre-wrap; }</style>
            </head>
            <body>
              <div id="log"></div>
              <script>
                const logEl = document.getElementById('log');
                const originalLog = console.log;
                console.log = function(...args) {
                  originalLog(...args);
                  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
                  logEl.textContent += msg + '\\n';
                };
                try {
                  ${code}
                } catch(e) {
                  logEl.textContent += '\\nError: ' + e.message;
                  logEl.style.color = '#c5221f';
                }
              </script>
            </body>
            </html>
          `;
        } else if (language === "css") {
          finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>${code}</style>
            </head>
            <body>
              <div class="preview-box">
                <div class="box">Box</div>
                <h1>Header</h1>
                <p>Paragraph text to preview CSS styles.</p>
                <button>Button</button>
              </div>
            </body>
            </html>
          `;
        } else if (language === "python") {
          // Use Pyodide to execute Python code in the browser
          finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: #333; white-space: pre-wrap; }</style>
            </head>
            <body>
              <div id="status">Loading Python environment...</div>
              <div id="log" style="display:none;"></div>
              <script>
                async function main() {
                  const statusEl = document.getElementById('status');
                  const logEl = document.getElementById('log');
                  
                  try {
                    // Initialize Pyodide
                    let pyodide = await loadPyodide();
                    
                    statusEl.style.display = 'none';
                    logEl.style.display = 'block';
                    
                    // Redirect Python's stdout to our DOM element
                    pyodide.setStdout({ batched: (msg) => {
                      logEl.textContent += msg + '\\n';
                    }});
                    
                    pyodide.setStderr({ batched: (msg) => {
                      logEl.textContent += msg + '\\n';
                      logEl.style.color = '#c5221f';
                    }});

                    // Execute the code
                    await pyodide.runPythonAsync(${JSON.stringify(code)});
                    
                    if (logEl.textContent === '') {
                       logEl.textContent = 'Execution completed with no output.';
                       logEl.style.color = '#888';
                       logEl.style.fontStyle = 'italic';
                    }
                  } catch (err) {
                    statusEl.style.display = 'none';
                    logEl.style.display = 'block';
                    logEl.textContent += '\\nError: ' + err.message;
                    logEl.style.color = '#c5221f';
                  }
                }
                main();
              </script>
            </body>
            </html>
          `;
        }

        // We use a data URI or Blob URL to render the iframe content
        this.revokeLocalObjectUrl();
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        this.localObjectUrl = blobUrl;
        
        this.localStatus = "success";
        this.localOutput = blobUrl;
        (this as any).requestUpdate();

      } catch (err: any) {
        this.localStatus = "error";
        this.localOutput = err.toString();
        (this as any).requestUpdate();
      }

      const props = (this as any).controller?.props;
      if (props && props.onStatusChange) {
        (this as any).context.dispatchAction({
          ...(props.onStatusChange as Record<string, unknown>),
          context: { status: this.localStatus, output: this.localOutput },
        });
      }
    }, 100);
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "互动沙盒";
    const description = props.description ? this.resolveString(props.description) : "";
    const code = this.resolveString(props.code);
    const language = props.language || "javascript";
    const output = this.localOutput;
    const status = this.localStatus;
    const isRunning = status === "running";

    return html`
      <div class="sandbox-container">
        <div class="header">
          <div class="title-area">
            <h3 class="title">${title}</h3>
            <span class="language-badge">${language}</span>
          </div>
          <button 
            class="run-btn" 
            @click=${this.handleRunClick} 
            ?disabled=${isRunning}
          >
            ${isRunning ? "Running..." : "Run Code"}
          </button>
        </div>
        
        <div class="workspace">
          <div class="editor-pane">
            <div class="pane-header">Input Code</div>
            <textarea class="code-input" spellcheck="false">${code}</textarea>
          </div>
          
          <div class="output-pane">
            <div class="pane-header">Output Result</div>
            <div class="output-content ${status}">
              ${status === "idle" && !output 
                ? "点击运行按钮查看结果..." 
                : status === "success" && output
                  ? html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${output}"></iframe>`
                  : unsafeHTML(sanitizeHtml(output))}
            </div>
          </div>
        </div>

        ${description ? html`
          <div class="description">
            💡 <strong>提示：</strong>${unsafeHTML(sanitizeHtml(description))}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

if (!customElements.get("a2learn-interactive-sandbox")) {
  customElements.define("a2learn-interactive-sandbox", A2learnInteractiveSandboxElement);
}

export const A2learnInteractiveSandbox = {
  ...InteractiveSandboxApi,
  tagName: "a2learn-interactive-sandbox",
};
