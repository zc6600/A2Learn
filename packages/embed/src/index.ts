export type ViewerSourceOffline = {
  mode: "offline";
  messagesUrl: string;
  themeVars?: Record<string, string>;
};

export type ViewerSourceOnline = {
  mode: "online";
  apiBaseUrl: string;
  resourcePath?: string;
  headers?: Record<string, string>;
  themeVars?: Record<string, string>;
};

export type ViewerSource = ViewerSourceOffline | ViewerSourceOnline;

export type EmbedEvent =
  | { type: "ready" }
  | { type: "resize"; height: number }
  | { type: "error"; error: unknown };

export type CreateEmbedOptions = {
  container: HTMLElement;
  viewerUrl: string;
  source: ViewerSource;
  iframeClassName?: string;
  iframeStyle?: Partial<CSSStyleDeclaration>;
  onEvent?: (event: EmbedEvent) => void;
};

type ReadyMessage = { type: "a2learn:ready" };
type ResizeMessage = { type: "a2learn:resize"; height: number };
type InitMessage = { type: "a2learn:init"; source: ViewerSource };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeThemeVars(input: unknown): Record<string, string> | undefined {
  if (!isPlainObject(input)) {
    return undefined;
  }
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    if (!key.startsWith("--")) {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    entries.push([key, value]);
  }
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, "");
}

function buildEmbedUrl(viewerUrl: string): string {
  const base = normalizeBaseUrl(viewerUrl);
  const url = new URL(base);
  url.searchParams.set("embed", "1");
  return url.toString();
}

export function createA2LearnEmbed(opts: CreateEmbedOptions): {
  iframe: HTMLIFrameElement;
  destroy: () => void;
  reload: () => void;
} {
  const iframe = document.createElement("iframe");
  iframe.src = buildEmbedUrl(opts.viewerUrl);
  iframe.loading = "lazy";
  iframe.referrerPolicy = "no-referrer";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups");
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.height = "520px";
  if (opts.iframeClassName) {
    iframe.className = opts.iframeClassName;
  }
  if (opts.iframeStyle) {
    Object.assign(iframe.style, opts.iframeStyle);
  }

  opts.container.innerHTML = "";
  opts.container.appendChild(iframe);

  const targetOrigin = new URL(iframe.src).origin;
  let destroyed = false;
  let sentInit = false;

  const sendInit = () => {
    if (destroyed || sentInit) {
      return;
    }
    const win = iframe.contentWindow;
    if (!win) {
      return;
    }
    const msg: InitMessage = { type: "a2learn:init", source: opts.source };
    win.postMessage(msg, targetOrigin);
    sentInit = true;
  };

  const onMessage = (event: MessageEvent) => {
    if (destroyed) {
      return;
    }
    if (event.source !== iframe.contentWindow) {
      return;
    }
    if (event.origin !== targetOrigin) {
      return;
    }
    const data = event.data;
    if (!isPlainObject(data) || typeof data.type !== "string") {
      return;
    }
    if (data.type === "a2learn:ready") {
      opts.onEvent?.({ type: "ready" });
      sendInit();
      return;
    }
    if (data.type === "a2learn:resize" && typeof (data as ResizeMessage).height === "number") {
      const height = Math.max(80, Math.round((data as ResizeMessage).height));
      iframe.style.height = `${height}px`;
      opts.onEvent?.({ type: "resize", height });
    }
  };

  const onLoad = () => {
    try {
      setTimeout(() => sendInit(), 0);
    } catch (err) {
      opts.onEvent?.({ type: "error", error: err });
    }
  };

  window.addEventListener("message", onMessage);
  iframe.addEventListener("load", onLoad);

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    window.removeEventListener("message", onMessage);
    iframe.removeEventListener("load", onLoad);
    iframe.remove();
  };

  const reload = () => {
    sentInit = false;
    iframe.src = buildEmbedUrl(opts.viewerUrl);
  };

  return { iframe, destroy, reload };
}

export class A2LearnEmbedElement extends HTMLElement {
  static get observedAttributes() {
    return [
      "viewer-url",
      "mode",
      "messages-url",
      "api-base-url",
      "resource-path",
      "theme-vars",
    ];
  }

  private controller: { destroy: () => void } | null = null;
  private rootEl: HTMLElement | null = null;
  headers?: Record<string, string>;
  themeVars?: Record<string, string>;

  connectedCallback() {
    const shadow = this.shadowRoot || this.attachShadow({ mode: "open" });
    shadow.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.style.display = "block";
    wrapper.style.width = "100%";
    shadow.appendChild(wrapper);
    this.rootEl = wrapper;
    this.mount();
  }

  disconnectedCallback() {
    this.controller?.destroy();
    this.controller = null;
  }

  attributeChangedCallback() {
    if (!this.isConnected) {
      return;
    }
    this.mount();
  }

  private mount() {
    const container = this.rootEl;
    if (!container) {
      return;
    }
    this.controller?.destroy();

    const viewerUrl = (this.getAttribute("viewer-url") || "").trim();
    if (!viewerUrl) {
      container.textContent = "Missing viewer-url.";
      return;
    }

    const mode = (this.getAttribute("mode") || "offline").trim() === "online" ? "online" : "offline";

    const themeVarsFromAttr = normalizeThemeVars(
      safeJsonParse((this.getAttribute("theme-vars") || "").trim()),
    );
    const themeVars = normalizeThemeVars(this.themeVars) || themeVarsFromAttr;

    let source: ViewerSource;
    if (mode === "online") {
      const apiBaseUrl = (this.getAttribute("api-base-url") || "").trim();
      const resourcePath = (this.getAttribute("resource-path") || "").trim() || undefined;
      if (!apiBaseUrl) {
        container.textContent = "Missing api-base-url.";
        return;
      }
      source = {
        mode: "online",
        apiBaseUrl,
        resourcePath,
        headers: this.headers,
        themeVars,
      };
    } else {
      const messagesUrl = (this.getAttribute("messages-url") || "").trim();
      if (!messagesUrl) {
        container.textContent = "Missing messages-url.";
        return;
      }
      source = { mode: "offline", messagesUrl, themeVars };
    }

    this.controller = createA2LearnEmbed({
      container,
      viewerUrl,
      source,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "a2learn-embed": A2LearnEmbedElement;
  }
}

if (!customElements.get("a2learn-embed")) {
  customElements.define("a2learn-embed", A2LearnEmbedElement);
}
