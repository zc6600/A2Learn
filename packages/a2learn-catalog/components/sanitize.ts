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

export function parseTermTooltips(htmlInput: string): string {
  if (!htmlInput) return "";
  
  // 1. Transform <dfn title="annotation">term</dfn> into Term Tooltip
  let processed = htmlInput.replace(
    /<dfn(?:\s+title="([^"]+)")?>([\s\S]+?)<\/dfn>/gi,
    (_, title, term) => {
      const annotation = (title || "生僻概念注解").trim();
      const cleanTerm = term.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><strong class="tooltip-title">${cleanTerm}</strong><p class="tooltip-desc">${annotation}</p><button type="button" class="tooltip-explore-btn" onclick="this.dispatchEvent(new CustomEvent('a2learn-explore-concept', {detail:{concept:'${cleanTerm}'}, bubbles:true, composed:true}))">深入探索此概念 →</button></span></span>`;
    }
  );

  // 2. Transform ~term[annotation]~ into Term Tooltip
  processed = processed.replace(
    /~([^\[]+)\[([^\]]+)\]~/g,
    (_, term, annotation) => {
      const cleanTerm = term.trim();
      const cleanAnnotation = annotation.trim();
      return `<span class="a2learn-term-tooltip" tabindex="0"><span class="term-text">${cleanTerm}</span><span class="term-badge">💬</span><span class="tooltip-popup"><strong class="tooltip-title">${cleanTerm}</strong><p class="tooltip-desc">${cleanAnnotation}</p><button type="button" class="tooltip-explore-btn" onclick="this.dispatchEvent(new CustomEvent('a2learn-explore-concept', {detail:{concept:'${cleanTerm}'}, bubbles:true, composed:true}))">深入探索此概念 →</button></span></span>`;
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
    ADD_ATTR: ["data-term", "data-annotation", "tabindex", "onclick", "type"],
  }) as string;
}
