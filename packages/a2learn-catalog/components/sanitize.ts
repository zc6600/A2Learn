const DISALLOWED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
]);

export function sanitizeHtml(input: string): string {
  if (!input) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return input;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");

  for (const tag of DISALLOWED_TAGS) {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  }

  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      }
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        el.removeAttribute(attr.name);
      }
    }
  });

  return doc.body.innerHTML;
}
