import { html, css, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { InteractiveSandboxApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";

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
      background: #1e1e1e;
    }
    .pane-header {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--app-muted, #888);
      border-bottom: 1px solid var(--a2ui-color-border);
      background: color-mix(in oklab, var(--a2ui-color-surface) 95%, transparent);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .output-pane-header {
      display: flex;
      background: #2d2d2d;
      border-bottom: 1px solid #3c3c3c;
      padding: 0 8px;
    }
    .tab-btn {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 600;
      color: #aaa;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.2s;
    }
    .tab-btn.active {
      color: var(--a2ui-color-primary, #667eea);
      border-bottom-color: var(--a2ui-color-primary, #667eea);
    }
    .tab-btn:hover {
      color: white;
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
    .output-content.javascript,
    .output-content.python {
      background: #1e1e1e;
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
    .output-content-idle {
      color: #888;
      display: flex;
      align-items: center;
      justify-content: center;
      font-style: italic;
      padding: 12px;
      height: 100%;
      background: #1e1e1e;
    }
    .console-log {
      flex: 1;
      margin: 0;
      padding: 12px;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.5;
      overflow: auto;
      white-space: pre-wrap;
    }
    .console-log.error {
      color: #f44336;
      background: #2d1e1e;
    }
    .testcases-list {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: #252526;
      height: 100%;
      overflow-y: auto;
    }
    .testcase-item {
      padding: 10px 14px;
      border-radius: 6px;
      background: #1e1e1e;
      border: 1px solid #3c3c3c;
      font-size: 13px;
      color: #d4d4d4;
    }
    .testcase-item.passed {
      border-left: 4px solid #34a853;
      background: #1e2a20;
    }
    .testcase-item.failed {
      border-left: 4px solid #ea4335;
      background: #2d1e1e;
    }
    .testcase-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .testcase-badge {
      font-size: 9px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .testcase-badge.pending {
      background: #3c3c3c;
      color: #aaa;
    }
    .testcase-badge.passed {
      background: #137333;
      color: #e6f4ea;
    }
    .testcase-badge.failed {
      background: #c5221f;
      color: #fce8e6;
    }
    .testcase-input {
      font-family: monospace;
      font-weight: 500;
      color: #9cdcfe;
    }
    .testcase-error {
      margin-top: 6px;
      font-family: monospace;
      color: #f44336;
      white-space: pre-wrap;
      font-size: 12px;
    }
    .testcase-actual {
      margin-top: 4px;
      font-family: monospace;
      color: #4fc1ff;
      font-size: 12px;
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
  @state() private localCode: string = "";
  @state() private testCaseResults: Array<{ status: 'pending' | 'passed' | 'failed', actual?: string, error?: string }> = [];
  @state() private activeTab: 'console' | 'testcases' = 'console';

  private lastPropsCode = "";
  private lastPropsTestCasesJson = "";
  private iframeUrl = "";
  private localObjectUrl: string | null = null;

  protected createController() {
    return new A2uiController(this, InteractiveSandboxApi);
  }

  connectedCallback() {
    super.connectedCallback();
    this.syncProps();
    window.addEventListener("message", this.handleIframeMessage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.revokeLocalObjectUrl();
    window.removeEventListener("message", this.handleIframeMessage);
  }

  private handleIframeMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== "object" || !("type" in data)) return;

    if (data.type === "console") {
      this.localOutput += data.message + "\n";
      (this as any).requestUpdate();
    } else if (data.type === "testcase") {
      const results = [...this.testCaseResults];
      results[data.index] = {
        status: data.status,
        actual: data.actual,
        error: data.error
      };
      this.testCaseResults = results;
      (this as any).requestUpdate();
    } else if (data.type === "finish") {
      const props = (this as any).controller?.props;
      const testCases = props?.testCases || [];
      
      if (data.status === "error") {
        this.localStatus = "error";
      } else if (testCases.length > 0) {
        const allPassed = this.testCaseResults.length === testCases.length &&
                          this.testCaseResults.every(r => r && r.status === 'passed');
        this.localStatus = allPassed ? 'success' : 'error';
      } else {
        this.localStatus = "success";
      }
      
      (this as any).requestUpdate();

      if (props && props.onStatusChange) {
        (this as any).context.dispatchAction({
          ...(props.onStatusChange as Record<string, unknown>),
          context: { status: this.localStatus, output: this.localOutput },
        });
      }
    }
  };

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
      const nextCode = this.resolveString(props.code || "");
      let codeChanged = false;
      if (this.lastPropsCode !== nextCode) {
        this.localCode = nextCode;
        this.lastPropsCode = nextCode;
        codeChanged = true;
      }
      
      const nextOutput = this.resolveString(props.output || "");
      if (this.localObjectUrl && nextOutput !== this.localObjectUrl) {
        this.revokeLocalObjectUrl();
      }
      
      // Prevent stale parent states from overriding our local active running state
      if (codeChanged || this.localStatus !== "running" || props.status === "success" || props.status === "error") {
        this.localStatus = props.status || "idle";
        this.localOutput = nextOutput;
      }
      
      const testCases = props.testCases || [];
      const testCasesChanged = this.lastPropsTestCasesJson !== JSON.stringify(testCases);
      if (testCasesChanged) {
        this.testCaseResults = testCases.map(() => ({ status: 'pending' }));
        this.lastPropsTestCasesJson = JSON.stringify(testCases);
        if (testCases.length > 0) {
          this.activeTab = 'testcases';
        }
      }
      
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

  private handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.localCode = textarea.value;
  }

  private handleRunClick() {
    const props = this.controller?.props;
    if (!props) return;
    
    const textarea = this.shadowRoot?.querySelector('.code-input') as HTMLTextAreaElement;
    const currentCode = textarea ? textarea.value : this.localCode;

    const language = props.language || "javascript";
    const shouldRunLocally = props.runLocally !== false;

    const testCases = props.testCases || [];
    if (testCases.length > 0) {
      this.testCaseResults = testCases.map(() => ({ status: 'pending' }));
      this.activeTab = 'testcases';
    }

    if (shouldRunLocally) {
      this.executeLocally(currentCode, language);
    } else if (props.onRunCode) {
      this.localStatus = "running";
      this.localOutput = "Running...";
      (this as any).requestUpdate();
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
        const props = this.controller?.props;
        const testCases = props?.testCases || [];

        if (language === "html") {
          finalHtml = code;
        } else if (language === "javascript") {
          finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: #333; white-space: pre-wrap; }</style>
            </head>
            <body>
              <div id="log"></div>
              <script>
                const testCases = ${JSON.stringify(testCases.map(tc => ({
                  input: this.resolveString(tc.input),
                  expectedOutput: this.resolveString(tc.expectedOutput)
                })))};

                const consoleMethods = ['log', 'error', 'warn', 'info'];
                consoleMethods.forEach(method => {
                  const original = console[method];
                  console[method] = function(...args) {
                    if (original) original.apply(console, args);
                    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
                    window.parent.postMessage({ type: 'console', method, message: msg }, '*');
                  };
                });

                window.onerror = function(message, source, lineno, colno, error) {
                  window.parent.postMessage({ type: 'console', method: 'error', message: 'Runtime Error: ' + message }, '*');
                  window.parent.postMessage({ type: 'finish', status: 'error', message }, '*');
                  return true;
                };
                window.onunhandledrejection = function(event) {
                  const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Unhandled rejection';
                  window.parent.postMessage({ type: 'console', method: 'error', message: 'Unhandled Rejection: ' + reason }, '*');
                  window.parent.postMessage({ type: 'finish', status: 'error', message: reason }, '*');
                };

                async function main() {
                  try {
                    ${code.replace(/<\/script>/ig, '<\\/script>')}
                    
                    if (testCases && testCases.length > 0) {
                      for (let i = 0; i < testCases.length; i++) {
                        const tc = testCases[i];
                        try {
                          let result = eval(tc.input);
                          if (result && typeof result.then === 'function') {
                            result = await result;
                          }
                          const actualStr = typeof result === 'object' ? JSON.stringify(result) : String(result);
                          const expectedStr = tc.expectedOutput;
                          
                          let isMatch = actualStr.trim() === expectedStr.trim();
                          if (!isMatch) {
                            try {
                              const evaluatedExpected = eval(expectedStr);
                              const evalExpectedStr = typeof evaluatedExpected === 'object' ? JSON.stringify(evaluatedExpected) : String(evaluatedExpected);
                              isMatch = actualStr.trim() === evalExpectedStr.trim();
                            } catch(_) {}
                          }
                          
                          if (isMatch) {
                            window.parent.postMessage({ type: 'testcase', index: i, status: 'passed', actual: actualStr }, '*');
                          } else {
                            window.parent.postMessage({ type: 'testcase', index: i, status: 'failed', actual: actualStr, error: 'Expected ' + expectedStr + ' but got ' + actualStr }, '*');
                          }
                        } catch(e) {
                          window.parent.postMessage({ type: 'testcase', index: i, status: 'failed', actual: '', error: e.message }, '*');
                        }
                      }
                    }
                    
                    window.parent.postMessage({ type: 'finish', status: 'success' }, '*');
                  } catch(e) {
                    window.parent.postMessage({ type: 'console', method: 'error', message: 'Error: ' + e.message }, '*');
                    window.parent.postMessage({ type: 'finish', status: 'error', message: e.message }, '*');
                  }
                }
                main();
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
          finalHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: #333; white-space: pre-wrap; }</style>
            </head>
            <body>
              <div id="status">Loading Python environment...</div>
              <script>
                const testCases = ${JSON.stringify(testCases.map(tc => ({
                  input: this.resolveString(tc.input),
                  expectedOutput: this.resolveString(tc.expectedOutput)
                })))};

                async function runPythonTests(pyodide) {
                  if (!testCases || testCases.length === 0) return;
                  for (let i = 0; i < testCases.length; i++) {
                    const tc = testCases[i];
                    try {
                      const result = await pyodide.runPythonAsync("str(" + tc.input + ")");
                      const actualStr = String(result);
                      const expectedStr = tc.expectedOutput;
                      if (actualStr.trim() === expectedStr.trim()) {
                        window.parent.postMessage({ type: 'testcase', index: i, status: 'passed', actual: actualStr }, '*');
                      } else {
                        window.parent.postMessage({ type: 'testcase', index: i, status: 'failed', actual: actualStr, error: 'Expected ' + expectedStr + ' but got ' + actualStr }, '*');
                      }
                    } catch (err) {
                      window.parent.postMessage({ type: 'testcase', index: i, status: 'failed', actual: '', error: err.message }, '*');
                    }
                  }
                }

                async function main() {
                  const statusEl = document.getElementById('status');
                  try {
                    window.parent.postMessage({ type: 'console', method: 'info', message: 'Loading Pyodide...' }, '*');
                    let pyodide = await loadPyodide();
                    
                    window.parent.postMessage({ type: 'console', method: 'info', message: 'Python loaded. Executing code...' }, '*');
                    statusEl.style.display = 'none';
                    
                    pyodide.setStdout({ batched: (msg) => {
                      window.parent.postMessage({ type: 'console', method: 'log', message: msg }, '*');
                    }});
                    
                    pyodide.setStderr({ batched: (msg) => {
                      window.parent.postMessage({ type: 'console', method: 'error', message: msg }, '*');
                    }});

                    await pyodide.runPythonAsync(${JSON.stringify(code).replace(/<\/script>/ig, '<\\/script>')});
                    await runPythonTests(pyodide);
                    window.parent.postMessage({ type: 'finish', status: 'success' }, '*');
                  } catch (err) {
                    window.parent.postMessage({ type: 'console', method: 'error', message: 'Python Error: ' + err.message }, '*');
                    window.parent.postMessage({ type: 'finish', status: 'error', message: err.message }, '*');
                  }
                }
                main();
              </script>
            </body>
            </html>
          `;
        }

        this.revokeLocalObjectUrl();
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        this.localObjectUrl = blobUrl;
        this.iframeUrl = blobUrl;
        
        if (language === "html" || language === "css") {
          this.localStatus = "success";
          this.localOutput = blobUrl;
          (this as any).requestUpdate();
          
          if (props && props.onStatusChange) {
            (this as any).context.dispatchAction({
              ...(props.onStatusChange as Record<string, unknown>),
              context: { status: this.localStatus, output: this.localOutput },
            });
          }
        } else {
          this.localStatus = "running";
          this.localOutput = "";
          (this as any).requestUpdate();
        }

      } catch (err: any) {
        this.localStatus = "error";
        this.localOutput = err.toString();
        (this as any).requestUpdate();
      }
    }, 100);
  }

  private renderOutput(output: string, status: string, language: string) {
    if (output.startsWith("blob:") || output.startsWith("data:")) {
      if (language === "html" || language === "css") {
        return html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${output}"></iframe>`;
      } else {
        return html`
          <iframe style="display: none;" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${output}"></iframe>
          <pre class="console-log">${this.escapeHtml(this.localOutput || "Running...")}</pre>
        `;
      }
    }
    
    if (this.isHtml(output)) {
      return html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${output}"></iframe>`;
    }
    
    return html`<pre class="console-log ${status}">${this.escapeHtml(output)}</pre>`;
  }

  private isHtml(str: string): boolean {
    const trimmed = str.trim();
    return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || /<[a-z][\s\S]*>/i.test(trimmed);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : "互动沙盒";
    const description = props.description ? this.resolveString(props.description) : "";
    const code = this.localCode;
    const language = props.language || "javascript";
    const output = this.localOutput;
    const status = this.localStatus;
    const isRunning = status === "running";
    
    const testCases = props.testCases || [];
    const hasTestCases = testCases.length > 0;

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
            <textarea 
              class="code-input" 
              spellcheck="false"
              .value=${code}
              @input=${this.handleInput}
            ></textarea>
          </div>
          
          <div class="output-pane">
            ${hasTestCases ? html`
              <div class="output-pane-header">
                <button class="tab-btn ${this.activeTab === 'console' ? 'active' : ''}" @click=${() => this.activeTab = 'console'}>Console Log</button>
                <button class="tab-btn ${this.activeTab === 'testcases' ? 'active' : ''}" @click=${() => this.activeTab = 'testcases'}>Test Cases</button>
              </div>
            ` : html`<div class="pane-header">Output Result</div>`}
            
            <div class="output-content ${status} ${language}">
              ${this.activeTab === 'console' || !hasTestCases ? html`
                ${status === "idle" && !output 
                  ? html`<div class="output-content-idle">点击运行按钮查看结果...</div>`
                  : this.renderOutput(output, status, language)}
              ` : html`
                <div class="testcases-list">
                  ${testCases.map((tc, index) => {
                    const res = this.testCaseResults[index] || { status: 'pending' };
                    return html`
                      <div class="testcase-item ${res.status}">
                        <div class="testcase-info">
                          <span class="testcase-badge ${res.status}">${res.status}</span>
                          <code class="testcase-input">${this.resolveString(tc.input)}</code>
                        </div>
                        ${res.status === 'failed' && res.error ? html`<div class="testcase-error">${res.error}</div>` : nothing}
                        ${res.status === 'passed' && res.actual ? html`<div class="testcase-actual">Output: ${res.actual}</div>` : nothing}
                      </div>
                    `;
                  })}
                </div>
              `}
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
