export function normalizeEventName(value: string): string {
  return value.normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[“”„‟]/g, '"')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function baseEventName(value: string): string {
  return normalizeEventName(value)
    .replace(/\s+for\s+(?:the\s+)?(?:first|second|third|fourth|[0-9]{1,2}(?:st|nd|rd|th)?|q[1-4]|january|february|march|april|may|june|july|august|september|october|november|december|annual|and)\b.*$/i, "")
    .replace(/\s+\(.*?\)$/, "")
    .trim();
}
