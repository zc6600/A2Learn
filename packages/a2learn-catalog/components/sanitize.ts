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

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  if (typeof window === "undefined") return input;

  return getPurifier().sanitize(input, {
    USE_PROFILES: { html: true },
    FORBID_TAGS,
    FORBID_ATTR: ["style"],
  }) as string;
}
