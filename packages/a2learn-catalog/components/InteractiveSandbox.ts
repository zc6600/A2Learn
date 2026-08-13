import componentStyles from "../styles/components/InteractiveSandbox.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { customElement, state } from "lit/decorators.js";
import { A2uiLitElement, A2uiController } from "@a2ui/lit/v0_9";
import { InteractiveSandboxApi } from "../api";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { sanitizeHtml } from "../utils/sanitize";
import { uiText } from "../utils/i18n";

export class A2learnInteractiveSandboxElement extends A2uiLitElement<typeof InteractiveSandboxApi> {
  static styles = unsafeCSS(componentStyles);

  @state() private localStatus: "idle" | "running" | "success" | "error" = "idle";
  @state() private localOutput: string = "";
  @state() private localCode: string = "";
  @state() private copied: boolean = false;
  @state() private testCaseResults: Array<{ status: 'pending' | 'passed' | 'failed', actual?: string, error?: string }> = [];
  @state() private activeTab: 'console' | 'testcases' = 'console';

  private lastPropsCode = "";
  private lastPropsTestCasesJson = "";
  private lastPropsStatus: string | undefined = undefined;
  private lastPropsOutput = "";
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

  willUpdate(changedProperties: Map<PropertyKey, unknown>) {
    super.willUpdate(changedProperties);
    this.syncProps();
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
      const nextStatus = props.status as string | undefined;

      // Only discard a locally-created blob when the *code itself* changes
      // (i.e. this component instance got reused for a different snippet).
      // syncProps() re-runs on every requestUpdate — including the ones
      // executeLocally() and handleIframeMessage() trigger while a run is in
      // flight — so comparing against props.output (which these static
      // examples never set) would revoke the blob before the iframe even
      // finished loading it.
      if (codeChanged && this.localObjectUrl) {
        this.revokeLocalObjectUrl();
      }

      // Only resync local status/output from props when those prop values
      // actually changed (a genuine new message from the backend/agent) —
      // not on every re-render. syncProps() also runs on the requestUpdate()
      // calls fired by our own local run (executeLocally / handleIframeMessage),
      // and static examples never populate props.status/props.output at all,
      // so comparing against "currently running" (the old check) meant the
      // instant a local run finished and flipped to success/error, the very
      // next render snapped it straight back to the (blank) props state.
      const statusChanged = this.lastPropsStatus !== nextStatus;
      const outputChanged = this.lastPropsOutput !== nextOutput;
      if (codeChanged || statusChanged || outputChanged) {
        this.lastPropsStatus = nextStatus;
        this.lastPropsOutput = nextOutput;
        this.localStatus = nextStatus || "idle";
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

  private handleEditorScroll(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    const gutter = this.shadowRoot?.querySelector(".line-numbers") as HTMLElement | null;
    if (gutter) {
      gutter.scrollTop = textarea.scrollTop;
    }
  }

  private computeLineNumbers(code: string): string {
    const count = Math.max(code.split("\n").length, 1);
    return Array.from({ length: count }, (_, i) => i + 1).join("\n");
  }

  private languageBadgeStyle(language: string): string {
    const palette: Record<string, [string, string]> = {
      javascript: ["#f7df1e", "#3b3b00"],
      python: ["#3776ab", "#ffffff"],
      html: ["#e34c26", "#ffffff"],
      css: ["#264de4", "#ffffff"],
    };
    const [bg, fg] = palette[language] || ["var(--a2ui-color-primary)", "var(--a2ui-color-on-primary, #ffffff)"];
    return `--badge-bg: ${bg}; --badge-fg: ${fg};`;
  }

  private async handleCopyClick() {
    try {
      await navigator.clipboard.writeText(this.localCode);
      this.copied = true;
      (this as any).requestUpdate();
      setTimeout(() => {
        this.copied = false;
        (this as any).requestUpdate();
      }, 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently.
    }
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
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: inherit; white-space: pre-wrap; }</style>
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
              <style>body { font-family: monospace; padding: 12px; margin: 0; color: inherit; white-space: pre-wrap; }</style>
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
        // Explicit charset is required: without it the browser guesses an
        // encoding for the blob: document and typically misreads UTF-8
        // Chinese text as Latin-1, producing garbled output.
        const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        // localObjectUrl always holds the iframe's src: for html/css it's the
        // visible live preview, for js/python it's a hidden runner iframe that
        // posts console/testcase/finish messages back via window.postMessage.
        this.localObjectUrl = blobUrl;

        if (language === "html" || language === "css") {
          this.localStatus = "success";
          this.localOutput = "";
          (this as any).requestUpdate();

          if (props && props.onStatusChange) {
            (this as any).context.dispatchAction({
              ...(props.onStatusChange as Record<string, unknown>),
              context: { status: this.localStatus, output: blobUrl },
            });
          }
        } else {
          // js/python: the hidden iframe (rendered from localObjectUrl in
          // renderOutput) executes the code; localOutput is a separate text
          // accumulator that handleIframeMessage appends console lines to.
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
    // Local execution: localObjectUrl is the blob URL created in
    // executeLocally(). It's the source of truth for the iframe regardless
    // of what's in `output`, which for js/python is plain console text.
    const frameSrc = this.localObjectUrl;
    if (frameSrc) {
      if (language === "html" || language === "css") {
        return html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${frameSrc}"></iframe>`;
      }
      // Lit's ${} binding here creates a text node (safe by construction),
      // so the text is never parsed as HTML — no manual escaping needed.
      // Escaping it ourselves would turn e.g. "'" into the literal 6
      // characters "&#039;" on screen, since textContent doesn't decode
      // entities back out.
      return html`
        <iframe style="display: none;" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${frameSrc}"></iframe>
        <pre class="console-log ${status}">${output || "Running..."}</pre>
      `;
    }

    // Remote/agent-driven execution (runLocally: false): the backend reports
    // `output` directly, which may itself be a data:/blob: URL or raw HTML.
    if (output.startsWith("blob:") || output.startsWith("data:")) {
      return html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" src="${output}"></iframe>`;
    }

    if (this.isHtml(output)) {
      return html`<iframe class="preview-frame" sandbox="allow-scripts" referrerpolicy="no-referrer" srcdoc="${output}"></iframe>`;
    }

    return html`<pre class="console-log ${status}">${output}</pre>`;
  }

  private isHtml(str: string): boolean {
    const trimmed = str.trim();
    return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || /<[a-z][\s\S]*>/i.test(trimmed);
  }

  render() {
    const props = (this as any).controller?.props;
    if (!props) return nothing;

    const title = props.title ? this.resolveString(props.title) : uiText("互动沙盒", "Interactive Sandbox");
    const description = props.description ? this.resolveString(props.description) : "";
    const code = this.localCode;
    const language = props.language || "javascript";
    const output = this.localOutput;
    const status = this.localStatus;
    const isRunning = status === "running";
    
    const testCases = props.testCases || [];
    const hasTestCases = testCases.length > 0;

    const lineNumbers = this.computeLineNumbers(code);

    return html`
      <div class="sandbox-container">
        <div class="header">
          <div class="title-area">
            <h3 class="title">${title}</h3>
            <span class="language-badge" style=${this.languageBadgeStyle(language)}>${language}</span>
          </div>
          <button
            class="run-btn ${isRunning ? "running" : ""}"
            @click=${this.handleRunClick}
            ?disabled=${isRunning}
          >
            ${isRunning ? "Running..." : "Run Code"}
          </button>
        </div>

        <div class="workspace">
          <div class="editor-pane">
            <div class="pane-header">
              <span>Input Code</span>
              <button class="copy-btn ${this.copied ? "copied" : ""}" @click=${this.handleCopyClick} title=${uiText("复制代码", "Copy code")}>
                ${this.copied
                  ? html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${uiText("已复制", "Copied")}`
                  : html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>${uiText("复制", "Copy")}`}
              </button>
            </div>
            <div class="code-editor code-font">
              <div class="line-numbers">${lineNumbers}</div>
              <textarea
                class="code-input"
                spellcheck="false"
                .value=${code}
                @input=${this.handleInput}
                @scroll=${this.handleEditorScroll}
              ></textarea>
            </div>
          </div>

          <div class="output-pane">
            ${hasTestCases ? html`
              <div class="output-pane-header">
                <button class="tab-btn ${this.activeTab === 'console' ? 'active' : ''}" @click=${() => this.activeTab = 'console'}>Console Log</button>
                <button class="tab-btn ${this.activeTab === 'testcases' ? 'active' : ''}" @click=${() => this.activeTab = 'testcases'}>Test Cases</button>
              </div>
            ` : html`<div class="pane-header"><span>Output Result</span></div>`}

            <div class="output-content ${status} ${language}">
              ${this.activeTab === 'console' || !hasTestCases ? html`
                ${status === "idle" && !output
                  ? html`<div class="output-content-idle">${uiText("点击运行按钮查看结果...", "Click Run to see the result...")}</div>`
                  : this.renderOutput(output, status, language)}
              ` : html`
                <div class="testcases-list">
                  ${testCases.map((tc, index) => {
                    const res = this.testCaseResults[index] || { status: 'pending' };
                    const icon = res.status === 'passed' ? '✓' : res.status === 'failed' ? '✗' : '•';
                    return html`
                      <div class="testcase-item ${res.status}">
                        <div class="testcase-info">
                          <span class="testcase-badge ${res.status}">${icon} ${res.status}</span>
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
            💡 <strong>${uiText("提示：", "Note:")}</strong>${unsafeHTML(sanitizeHtml(description))}
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
