import createDOMPurify from "dompurify";
import { css, unsafeCSS } from "lit";
import MarkdownIt from "markdown-it";
import katex from "katex";
import katexCss from "katex/dist/katex.min.css?inline";
import tooltipCss from "../styles/tooltip.css?inline";
import markdownCss from "../styles/markdown.css?inline";

const FORBID_TAGS = [
  "base",
  "embed",
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "style",
];

let purifier: ReturnType<typeof createDOMPurify> | null = null;
let tooltipLayerBound = false;

/**
 * A tooltip rendered inside a component shadow root cannot rise above an
 * ancestor that clips overflow (rounded cards, code blocks, presentation
 * canvases). Render its visible copy in a document-level layer instead.
 */
function bindTermTooltipLayer() {
  if (tooltipLayerBound || typeof document === "undefined") return;
  tooltipLayerBound = true;

  const layer = document.createElement("div");
  layer.id = "a2learn-term-tooltip-layer";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-live", "polite");
  document.body.append(layer);

  let active: HTMLElement | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const hide = () => {
    active = null;
    layer.replaceChildren();
    layer.hidden = true;
  };
  const scheduleHide = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(hide, 100);
  };
  const cancelHide = () => clearTimeout(closeTimer);
  const findTooltip = (event: Event) => event.composedPath().find(
    (node): node is HTMLElement => node instanceof HTMLElement && node.classList.contains("a2learn-term-tooltip"),
  );

  const show = (trigger: HTMLElement) => {
    const popup = trigger.querySelector<HTMLElement>(".tooltip-popup");
    if (!popup) return;
    cancelHide();
    active = trigger;
    layer.innerHTML = popup.innerHTML;
    layer.hidden = false;

    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(280, window.innerWidth - margin * 2);
    layer.style.width = `${width}px`;
    const layerHeight = layer.getBoundingClientRect().height;
    const placeBelow = rect.top < layerHeight + margin;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, margin), window.innerWidth - width - margin);
    const top = placeBelow ? rect.bottom + 10 : rect.top - layerHeight - 10;
    layer.dataset.placement = placeBelow ? "below" : "above";
    layer.style.left = `${left}px`;
    layer.style.top = `${Math.max(margin, top)}px`;
  };

  const showFromHover = (event: Event) => {
    const trigger = findTooltip(event);
    if (trigger) show(trigger);
  };
  // `pointerover` covers modern browsers; `mouseover` and capture-phase
  // enter events make hover reliable when content lives in a shadow root or
  // is rendered by a browser that retargets pointer events differently.
  document.addEventListener("pointerover", showFromHover, true);
  document.addEventListener("mouseover", showFromHover, true);
  document.addEventListener("pointerenter", showFromHover, true);
  document.addEventListener("mouseenter", showFromHover, true);
  document.addEventListener("focusin", (event) => {
    const trigger = findTooltip(event);
    if (trigger) show(trigger);
  }, true);
  document.addEventListener("pointerout", (event) => {
    const trigger = findTooltip(event);
    if (trigger && trigger === active) scheduleHide();
  }, true);
  document.addEventListener("focusout", (event) => {
    const trigger = findTooltip(event);
    if (trigger && trigger === active) scheduleHide();
  }, true);
  window.addEventListener("scroll", () => active && show(active), true);
  window.addEventListener("resize", () => active && show(active));
  layer.addEventListener("pointerenter", cancelHide);
  layer.addEventListener("pointerleave", scheduleHide);
  layer.hidden = true;
}

function getPurifier() {
  if (purifier) return purifier;
  purifier = createDOMPurify(window);
  return purifier;
}

export const katexStyles = css`${unsafeCSS(katexCss)}`;
export const markdownStyles = css`${unsafeCSS(markdownCss)}`;
export const tooltipStyles = css`${unsafeCSS(katexCss)}${unsafeCSS(markdownCss)}${unsafeCSS(tooltipCss)}`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const md = new MarkdownIt({
  html: true,
  breaks: true,
  // Bare identifiers such as `students.id` are valid database fields, but
  // linkify treats `.id` as a top-level domain and turns them into broken
  // external links. Explicit Markdown links remain fully supported.
  linkify: false,
  typographer: false,
});

// Custom code fence renderer with language label and copy button
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : "";
  const lang = info ? info.split(/\s+/)[0] : "text";
  const escapedCode = escapeHtml(token.content);
  return `<div class="a2learn-code-block code-block"><div class="code-block-header"><span class="code-block-lang">${escapeHtml(lang)}</span><button type="button" class="code-copy-btn" aria-label="Copy code">复制</button></div><pre><code class="language-${escapeHtml(lang)}">${escapedCode}</code></pre></div>`;
};

// Global click handler for copy buttons inside shadow DOM and regular DOM
if (typeof document !== "undefined") {
  bindTermTooltipLayer();
  document.addEventListener("click", async (event) => {
    const path = event.composedPath();
    const btn = path.find(
      (node) => node instanceof HTMLElement && node.classList.contains("code-copy-btn")
    ) as HTMLButtonElement | undefined;
    if (!btn) return;

    const block = btn.closest(".code-block, .a2learn-code-block");
    const codeEl = block?.querySelector("code, pre");
    const textToCopy = codeEl?.textContent || "";
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      const original = btn.textContent;
      btn.textContent = "已复制";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = original || "复制";
        btn.classList.remove("copied");
      }, 1500);
    } catch {
      // Ignore clipboard write failures in restricted contexts
    }
  }, true);
}

/**
 * Extracts inline `$...$` / `\(...\)` and block `$$...$$` / `\[...\]` LaTeX math to KaTeX placeholders
 * so markdown-it does not misinterpret LaTeX syntax like underscores `_` or asterisks `*`.
 */
function extractMath(input: string): { text: string; mathMap: Map<string, string> } {
  const mathMap = new Map<string, string>();
  if (!input || (input.indexOf("$") === -1 && input.indexOf("\\") === -1)) {
    return { text: input, mathMap };
  }

  let idx = 0;

  // 1. Block math: $$...$$ or \[...\]
  let text = input.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (_, expr) => {
    const key = `\x1aKATEX_BLOCK_${idx++}\x1a`;
    try {
      const rendered = katex.renderToString(expr.trim(), {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: true,
      });
      mathMap.set(key, rendered);
    } catch {
      mathMap.set(key, expr);
    }
    return `\n\n${key}\n\n`;
  });

  // 2. Inline math: $...$ or \(...\)
  text = text.replace(/(?:\$|\\\()([^\s$][^$]*?[^\s$]|[^\s$])(?:\$|\\\))/g, (_, expr) => {
    const key = `\x1aKATEX_INLINE_${idx++}\x1a`;
    try {
      const rendered = katex.renderToString(expr, {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: false,
      });
      mathMap.set(key, rendered);
    } catch {
      mathMap.set(key, expr);
    }
    return key;
  });

  // 3. Standalone TeX commands like \sqrt{...}, \frac{...}{...} without $ delimiters
  text = text.replace(/\\(sqrt|frac|text|mathbf|mathrm|mathcal)\{[^}]+\}(\{[^}]+\})?/g, (match) => {
    const key = `\x1aKATEX_INLINE_${idx++}\x1a`;
    try {
      const rendered = katex.renderToString(match, {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: false,
      });
      mathMap.set(key, rendered);
    } catch {
      mathMap.set(key, match);
    }
    return key;
  });

  return { text, mathMap };
}

function restoreMath(htmlStr: string, mathMap: Map<string, string>): string {
  if (mathMap.size === 0) return htmlStr;
  let out = htmlStr;
  for (const [key, value] of mathMap.entries()) {
    out = out.split(key).join(value);
  }
  return out;
}

export function parseTermTooltips(htmlInput: string): string {
  if (!htmlInput) return "";
  const english = typeof document !== "undefined" && document.documentElement.lang.startsWith("en");
  const askLabel = english ? "Ask" : "问";
  const askDescription = english ? "Ask the learning assistant" : "向学习助手追问";
  
  // 1. Transform <dfn title="annotation">term</dfn> into Term Tooltip
  let processed = htmlInput.replace(
    /<dfn(?:\s+title="([^"]+)")?>([\s\S]+?)<\/dfn>/gi,
    (_, title, term) => {
      const annotation = (title || "生僻概念注解").trim();
      const cleanTerm = term.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0" data-term="${cleanTerm}"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><span class="tooltip-title">${cleanTerm}</span><span class="tooltip-desc">${annotation}</span><button type="button" class="tooltip-explore-btn" data-term="${cleanTerm}" aria-label="${askDescription}" title="${askDescription}">${askLabel}</button></span></span>`;
    }
  );

  // 2. Transform ~term[annotation]~ into Term Tooltip
  processed = processed.replace(
    /~([^\[]+)\[([^\]]+)\]~/g,
    (_, term, annotation) => {
      const cleanTerm = term.trim();
      const cleanAnnotation = annotation.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0" data-term="${cleanTerm}"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><span class="tooltip-title">${cleanTerm}</span><span class="tooltip-desc">${cleanAnnotation}</span><button type="button" class="tooltip-explore-btn" data-term="${cleanTerm}" aria-label="${askDescription}" title="${askDescription}">${askLabel}</button></span></span>`;
    }
  );

  return processed;
}

/**
 * Compiles Markdown, KaTeX math expressions, and terminology tooltips into sanitized HTML.
 */
export function sanitizeHtml(input: string, options?: { inline?: boolean }): string {
  if (!input) return "";
  if (typeof window === "undefined") return input;

  // Generation occasionally leaves a line containing only the closing braces
  // of an abandoned JSON/template fragment (for example `}}}}},`). It is not
  // course content and markdown renders it as a distracting paragraph. Do not
  // touch fenced code blocks: braces inside an actual code example are valid.
  const cleanedInput = input.split(/(```[\s\S]*?```)/g).map((part, index) => {
    if (index % 2 === 1) return part;
    return part.replace(/^\s*(?:[}\]]){3,}\s*,?\s*$/gm, "");
  }).join("");

  // 1. Extract Math expressions to placeholders
  const { text, mathMap } = extractMath(cleanedInput);

  // 2. Compile Markdown to HTML
  const renderedMd = options?.inline ? md.renderInline(text) : md.render(text);

  // 3. Restore KaTeX Math
  const withMath = restoreMath(renderedMd, mathMap);

  // 4. Parse Term Tooltips
  const withTooltips = parseTermTooltips(withMath);

  // 5. Sanitize with DOMPurify
  return getPurifier().sanitize(withTooltips, {
    // svg/svgFilters/mathMl keep KaTeX's rendering intact
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    FORBID_TAGS,
    ADD_TAGS: [
      "span", "dfn", "button", "table", "thead", "tbody", "tr", "th", "td",
      "pre", "code", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6",
      "hr", "del", "img", "details", "summary", "kbd", "sup", "sub"
    ],
    ADD_ATTR: [
      "data-term", "data-annotation", "tabindex", "type", "style",
      "class", "src", "alt", "title", "href", "target", "rel", "aria-label"
    ],
  }) as string;
}

export const renderMarkdown = sanitizeHtml;
