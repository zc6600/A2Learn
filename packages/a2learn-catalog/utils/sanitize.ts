import createDOMPurify from "dompurify";
import { css, unsafeCSS } from "lit";
import tooltipCss from "../styles/tooltip.css?inline";
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

export const tooltipStyles = css`${unsafeCSS(katexCss)}${unsafeCSS(tooltipCss)}`;

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
