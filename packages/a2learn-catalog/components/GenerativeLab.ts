import componentStyles from "../styles/components/GenerativeLab.css?inline";
import { html, nothing, unsafeCSS } from "lit";
import { A2uiController, A2uiLitElement } from "@a2ui/lit/v0_9";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { GenerativeLabApi } from "../api";
import { sanitizeHtml } from "../utils/sanitize";

const DEFAULT_MIN_HEIGHT = 320;
const DEFAULT_MAX_HEIGHT = 900;
const MAX_EVENT_BYTES = 16_000;

function serializeForInlineScript(value: unknown): string {
  // JSON.stringify alone does not make a value safe in an HTML <script>
  // context: a literal </script> would still terminate the element.
  return JSON.stringify(value ?? {})
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

type LabMessage = {
  channel: "a2learn-generative-lab/v1";
  nonce: string;
  type: "ready" | "resize" | "event";
  height?: unknown;
  name?: unknown;
  payload?: unknown;
};

/** A general browser-component host isolated from the A2Learn page. */
export class A2learnGenerativeLabElement extends A2uiLitElement<typeof GenerativeLabApi> {
  static styles = unsafeCSS(componentStyles);

  private nonce = this.createNonce();
  private frame: HTMLIFrameElement | null = null;
  private frameHeight = DEFAULT_MIN_HEIGHT;
  private currentSource = "";
  private currentSignature = "";

  protected createController() {
    return new A2uiController(this, GenerativeLabApi);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("message", this.receiveMessage);
  }

  disconnectedCallback() {
    window.removeEventListener("message", this.receiveMessage);
    this.frame = null;
    super.disconnectedCallback();
  }

  private createNonce(): string {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint32Array(4);
    globalThis.crypto?.getRandomValues?.(bytes);
    return Array.from(bytes, (value) => value.toString(36)).join("-") || `${Date.now()}-${Math.random()}`;
  }

  private resolveString(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "literalString" in (value as Record<string, unknown>)) {
      const literal = (value as { literalString?: unknown }).literalString;
      return typeof literal === "string" ? literal : "";
    }
    return "";
  }

  private clampHeight(value: unknown, minHeight: number, maxHeight: number): number {
    const height = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : minHeight;
    return Math.max(minHeight, Math.min(maxHeight, height));
  }

  private receiveMessage = (event: MessageEvent<unknown>) => {
    // The lab has an opaque origin, so source + per-mount nonce authenticate
    // its limited channel back into the A2Learn host.
    // The lab may emit during its first script before iframe's load handler
    // runs, so recover the just-rendered frame lazily as well.
    const frame = this.frame ?? this.renderRoot.querySelector<HTMLIFrameElement>(".lab-frame");
    if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
    this.frame = frame;
    const data = event.data as Partial<LabMessage> | null;
    if (!data || data.channel !== "a2learn-generative-lab/v1" || data.nonce !== this.nonce) return;
    const props = this.controller?.props;
    if (!props) return;
    const minHeight = this.clampHeight(props.minHeight, 160, 1200);
    const maxHeight = Math.max(minHeight, this.clampHeight(props.maxHeight, minHeight, 1400));
    if (data.type === "resize") {
      this.frameHeight = this.clampHeight(data.height, minHeight, maxHeight);
      this.requestUpdate();
      return;
    }
    if (data.type !== "event" || typeof data.name !== "string" || !data.name || data.name.length > 80) return;
    try {
      if (JSON.stringify(data.payload ?? null).length > MAX_EVENT_BYTES) return;
    } catch {
      return;
    }
    if (props.onEvent) {
      this.context.dispatchAction({
        ...(props.onEvent as Record<string, unknown>),
        context: { eventName: data.name, payload: data.payload ?? null },
      });
    }
  };

  private buildSource(htmlSource: string, cssSource: string, javascriptSource: string, initialProps: unknown): string {
    const safeJavascript = javascriptSource.replace(/<\/script/gi, "<\\/script");
    const serializedHtml = serializeForInlineScript(htmlSource);
    const serializedCss = serializeForInlineScript(cssSource);
    const serializedProps = serializeForInlineScript(initialProps);
    return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src * data: blob:; script-src 'unsafe-inline' https: http: data: blob:; style-src 'unsafe-inline' https: http:; img-src * data: blob:; connect-src *; media-src * data: blob:; font-src * data: blob:; worker-src blob: https: http:; frame-src *; object-src *; base-uri 'none'">
<meta name="referrer" content="no-referrer">
<style>html,body,#app{margin:0;min-height:100%;box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}</style>
</head><body><main id="app"></main>
<script>
(() => {
  const channel = "a2learn-generative-lab/v1";
  const nonce = ${JSON.stringify(this.nonce)};
  const send = (type, payload = {}) => parent.postMessage({ channel, nonce, type, ...payload }, "*");
  window.a2learn = Object.freeze({
    props: Object.freeze(${serializedProps}),
    emit: (name, payload) => send("event", { name, payload }),
    setHeight: (height) => send("resize", { height }),
  });
  document.getElementById("app").innerHTML = ${serializedHtml};
  const style = document.createElement("style");
  style.textContent = ${serializedCss};
  document.head.append(style);
  send("ready");
})();
</script>
<script type="module">${safeJavascript}</script>
</body></html>`;
  }

  render() {
    const props = this.controller?.props;
    if (!props) return nothing;
    const title = this.resolveString(props.title);
    const description = this.resolveString(props.description);
    const minHeight = this.clampHeight(props.minHeight, 160, 1200);
    const maxHeight = Math.max(minHeight, this.clampHeight(props.maxHeight, minHeight, 1400));
    const htmlSource = this.resolveString(props.html);
    const cssSource = this.resolveString(props.css);
    const javascriptSource = this.resolveString(props.javascript);
    const signature = JSON.stringify([htmlSource, cssSource, javascriptSource, props.initialProps ?? {}]);
    if (signature !== this.currentSignature) {
      this.nonce = this.createNonce();
      this.currentSignature = signature;
      this.currentSource = this.buildSource(htmlSource, cssSource, javascriptSource, props.initialProps);
      this.frameHeight = minHeight;
    }
    const frameHeight = this.clampHeight(this.frameHeight, minHeight, maxHeight);
    return html`
      <section class="lab">
        <header class="lab-header">
          <p class="lab-kicker">Interactive lab</p>
          <h3>${title}</h3>
          ${description ? html`<div class="lab-description">${unsafeHTML(sanitizeHtml(description))}</div>` : nothing}
        </header>
        <iframe
          class="lab-frame"
          title=${title || "Interactive learning lab"}
          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          referrerpolicy="no-referrer"
          style=${`height:${frameHeight}px`}
          srcdoc=${this.currentSource}
          @load=${(event: Event) => { this.frame = event.currentTarget as HTMLIFrameElement; }}
        ></iframe>
      </section>
    `;
  }
}

if (!customElements.get("a2learn-generative-lab")) {
  customElements.define("a2learn-generative-lab", A2learnGenerativeLabElement);
}

export const A2learnGenerativeLab = {
  ...GenerativeLabApi,
  tagName: "a2learn-generative-lab",
};
