import createDOMPurify from "dompurify";
import { css, unsafeCSS } from "lit";
import katex from "katex";
import katexCss from "katex/dist/katex.min.css?inline";

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

function getPurifier() {
  if (purifier) return purifier;
  purifier = createDOMPurify(window);
  return purifier;
}

export const katexStyles = css`${unsafeCSS(katexCss)}`;

export const tooltipStyles = css`
  ${katexStyles}

  .a2learn-term-tooltip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--a2learn-tooltip-accent, #0d9488) !important;
    font-weight: 700 !important;
    text-decoration: var(--a2learn-tooltip-decoration, underline dotted var(--a2learn-tooltip-accent, #0d9488)) !important;
    text-underline-offset: 4px;
    cursor: help;
    padding: var(--a2learn-tooltip-term-padding, 0 4px);
    border-radius: var(--a2learn-tooltip-term-radius, 4px);
    background: var(--a2learn-tooltip-term-background, rgba(13, 148, 136, 0.08));
    transition: all 0.2s ease;
  }
  .a2learn-term-tooltip:hover,
  .a2learn-term-tooltip:focus,
  .a2learn-term-tooltip:focus-within {
    background: var(--a2learn-tooltip-term-hover-background, rgba(13, 148, 136, 0.18));
  }
  .a2learn-term-tooltip .term-badge {
    font-size: 11px;
    opacity: 0.8;
    display: var(--a2learn-tooltip-badge-display, inline);
  }
  .a2learn-term-tooltip .tooltip-popup {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(6px);
    width: var(--a2learn-tooltip-width, 250px);
    padding: 14px;
    background: var(--a2learn-tooltip-surface, #ffffff) !important;
    border: 1px solid var(--a2learn-tooltip-border, #e5e7eb) !important;
    border-radius: var(--a2learn-tooltip-popup-radius, 14px) !important;
    box-shadow: var(--a2learn-tooltip-shadow, 0 12px 32px rgba(15, 23, 42, 0.16)) !important;
    z-index: 9999 !important;
    transition: opacity 0.18s ease, transform 0.18s ease, visibility 0s linear 0.18s;
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    white-space: normal;
    font-weight: normal;
    text-decoration: none;
    color: var(--a2learn-tooltip-text, #111827) !important;
    line-height: 1.5;
  }
  .a2learn-term-tooltip .tooltip-popup::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: var(--a2learn-tooltip-surface, #ffffff) transparent transparent transparent;
  }
  .a2learn-term-tooltip:hover .tooltip-popup,
  .a2learn-term-tooltip:focus .tooltip-popup,
  .a2learn-term-tooltip:focus-within .tooltip-popup {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
    transition-delay: 0s;
  }
  .a2learn-term-tooltip .tooltip-title {
    display: block !important;
    font-size: 14px;
    font-weight: 800;
    color: var(--a2learn-tooltip-accent, #0d9488) !important;
    margin: 0 0 2px 0;
  }
  .a2learn-term-tooltip .tooltip-desc {
    display: block !important;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--a2learn-tooltip-description, #374151) !important;
    margin: 0;
  }
  .a2learn-term-tooltip .tooltip-explore-btn {
    align-self: flex-end;
    min-width: 24px;
    margin-top: 2px;
    background: var(--a2learn-tooltip-button-background, #f9fafb) !important;
    color: var(--a2learn-tooltip-accent, #0d9488) !important;
    border: 1px solid var(--a2learn-tooltip-border, #e5e7eb) !important;
    border-radius: var(--a2learn-tooltip-button-radius, 8px);
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.35;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  .a2learn-term-tooltip .tooltip-explore-btn:hover {
    background: var(--a2learn-tooltip-accent, #0d9488) !important;
    color: #ffffff !important;
    border-color: #0d9488 !important;
  }
`;

/**
 * Renders inline `$...$` / `\(...\)` and block `$$...$$` / `\[...\]` LaTeX math to HTML via KaTeX,
 * as well as un-delimited TeX expressions like `\sqrt{...}`.
 */
export function renderMathInHtml(input: string): string {
  if (!input) return input;
  if (input.indexOf("$") === -1 && input.indexOf("\\") === -1) return input;

  let out = input;

  // 1. Block math: $$...$$ or \[...\]
  out = out.replace(/(?:\$\$|\\\[)([\s\S]+?)(?:\$\$|\\\])/g, (match, expr) => {
    try {
      return katex.renderToString(expr.trim(), {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: true,
      });
    } catch {
      return match;
    }
  });

  // 2. Inline math: $...$ or \(...\)
  out = out.replace(/(?:\$|\\\()([^\s$][^$]*?[^\s$]|[^\s$])(?:\$|\\\))/g, (match, expr) => {
    try {
      return katex.renderToString(expr, {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: false,
      });
    } catch {
      return match;
    }
  });

  // 3. Standalone TeX commands like \sqrt{...}, \frac{...}{...} without $ delimiters
  out = out.replace(/\\(sqrt|frac|text|mathbf|mathrm|mathcal)\{[^}]+\}(\{[^}]+\})?/g, (match) => {
    try {
      return katex.renderToString(match, {
        throwOnError: false,
        trust: false,
        output: "html",
        displayMode: false,
      });
    } catch {
      return match;
    }
  });

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

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  if (typeof window === "undefined") return input;

  const withMath = renderMathInHtml(input);
  const withTooltips = parseTermTooltips(withMath);

  return getPurifier().sanitize(withTooltips, {
    // svg/svgFilters keep KaTeX's rendering intact (some symbols, e.g. wide
    // accents and radicals, render via inline <svg>).
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS,
    ADD_TAGS: ["span", "dfn", "button"],
    ADD_ATTR: ["data-term", "data-annotation", "tabindex", "type", "style"],
  }) as string;
}
