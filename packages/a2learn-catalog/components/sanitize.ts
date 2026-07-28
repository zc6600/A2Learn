import createDOMPurify from "dompurify";

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

import { css } from "lit";

export const tooltipStyles = css`
  .a2learn-term-tooltip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: #0d9488 !important;
    font-weight: 700 !important;
    text-decoration: underline dotted #0d9488 !important;
    text-underline-offset: 4px;
    cursor: help;
    padding: 0 4px;
    border-radius: 4px;
    background: rgba(13, 148, 136, 0.08);
    transition: all 0.2s ease;
  }
  .a2learn-term-tooltip:hover,
  .a2learn-term-tooltip:focus,
  .a2learn-term-tooltip:focus-within {
    background: rgba(13, 148, 136, 0.18);
  }
  .a2learn-term-tooltip .term-badge {
    font-size: 11px;
    opacity: 0.8;
  }
  .a2learn-term-tooltip .tooltip-popup {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    bottom: 130%;
    left: 50%;
    transform: translateX(-50%) translateY(6px);
    width: 250px;
    padding: 14px;
    background: #ffffff !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 14px !important;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16) !important;
    z-index: 9999 !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: left;
    white-space: normal;
    font-weight: normal;
    text-decoration: none;
    color: #111827 !important;
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
    border-color: #ffffff transparent transparent transparent;
  }
  .a2learn-term-tooltip:hover .tooltip-popup,
  .a2learn-term-tooltip:focus .tooltip-popup,
  .a2learn-term-tooltip:focus-within .tooltip-popup {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
    transform: translateX(-50%) translateY(0);
  }
  .a2learn-term-tooltip .tooltip-title {
    font-size: 14px;
    font-weight: 800;
    color: #0d9488 !important;
    margin: 0;
  }
  .a2learn-term-tooltip .tooltip-desc {
    font-size: 12.5px;
    line-height: 1.5;
    color: #374151 !important;
    margin: 0;
  }
  .a2learn-term-tooltip .tooltip-explore-btn {
    margin-top: 4px;
    background: #f9fafb !important;
    color: #0d9488 !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.2s ease;
  }
  .a2learn-term-tooltip .tooltip-explore-btn:hover {
    background: #0d9488 !important;
    color: #ffffff !important;
    border-color: #0d9488 !important;
  }
`;

export function parseTermTooltips(htmlInput: string): string {
  if (!htmlInput) return "";
  
  // 1. Transform <dfn title="annotation">term</dfn> into Term Tooltip
  let processed = htmlInput.replace(
    /<dfn(?:\s+title="([^"]+)")?>([\s\S]+?)<\/dfn>/gi,
    (_, title, term) => {
      const annotation = (title || "生僻概念注解").trim();
      const cleanTerm = term.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0" data-term="${cleanTerm}"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><strong class="tooltip-title">${cleanTerm}</strong><p class="tooltip-desc">${annotation}</p><button type="button" class="tooltip-explore-btn" data-term="${cleanTerm}">深入探索此概念 →</button></span></span>`;
    }
  );

  // 2. Transform ~term[annotation]~ into Term Tooltip
  processed = processed.replace(
    /~([^\[]+)\[([^\]]+)\]~/g,
    (_, term, annotation) => {
      const cleanTerm = term.trim();
      const cleanAnnotation = annotation.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0" data-term="${cleanTerm}"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><strong class="tooltip-title">${cleanTerm}</strong><p class="tooltip-desc">${cleanAnnotation}</p><button type="button" class="tooltip-explore-btn" data-term="${cleanTerm}">深入探索此概念 →</button></span></span>`;
    }
  );

  return processed;
}

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  if (typeof window === "undefined") return input;

  const withTooltips = parseTermTooltips(input);

  return getPurifier().sanitize(withTooltips, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    ADD_TAGS: ["span", "dfn", "button"],
    ADD_ATTR: ["data-term", "data-annotation", "tabindex", "type"],
  }) as string;
}
