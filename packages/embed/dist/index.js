// src/index.ts
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function normalizeThemeVars(input) {
  if (!isPlainObject(input)) {
    return void 0;
  }
  const entries = [];
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
    return void 0;
  }
  return Object.fromEntries(entries);
}
function normalizeBaseUrl(input) {
  return input.replace(/\/+$/, "");
}
function buildEmbedUrl(viewerUrl) {
  const base = normalizeBaseUrl(viewerUrl);
  const url = new URL(base);
  url.searchParams.set("embed", "1");
  return url.toString();
}
function createA2LearnEmbed(opts) {
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
    const msg = { type: "a2learn:init", source: opts.source };
    win.postMessage(msg, targetOrigin);
    sentInit = true;
  };
  const onMessage = (event) => {
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
    if (data.type === "a2learn:resize" && typeof data.height === "number") {
      const height = Math.max(80, Math.round(data.height));
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
var A2LearnEmbedElement = class extends HTMLElement {
  constructor() {
    super(...arguments);
    this.controller = null;
    this.rootEl = null;
  }
  static get observedAttributes() {
    return [
      "viewer-url",
      "mode",
      "messages-url",
      "api-base-url",
      "resource-path",
      "resource-text",
      "theme-vars"
    ];
  }
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
  mount() {
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
      safeJsonParse((this.getAttribute("theme-vars") || "").trim())
    );
    const themeVars = normalizeThemeVars(this.themeVars) || themeVarsFromAttr;
    let source;
    if (mode === "online") {
      const apiBaseUrl = (this.getAttribute("api-base-url") || "").trim();
      const resourcePath = (this.getAttribute("resource-path") || "").trim() || void 0;
      const resourceText = (this.getAttribute("resource-text") || "").trim() || void 0;
      const language = (this.getAttribute("language") || "").trim();
      if (!apiBaseUrl) {
        container.textContent = "Missing api-base-url.";
        return;
      }
      source = {
        mode: "online",
        apiBaseUrl,
        resourcePath,
        resourceText,
        language: language === "en" || language === "zh" ? language : void 0,
        headers: this.headers,
        themeVars
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
      source
    });
  }
};
if (!customElements.get("a2learn-embed")) {
  customElements.define("a2learn-embed", A2LearnEmbedElement);
}
export {
  A2LearnEmbedElement,
  createA2LearnEmbed
};
