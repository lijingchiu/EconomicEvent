import { FetchError } from "../utils/fetch-with-timeout";

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function htmlToText(value: string): string {
  return decodeHtmlEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function parseHtmlTableRows(html: string): string[][] {
  if (!/<table\b/i.test(html)) throw new FetchError("expected HTML table was not found", false);
  const rows: string[][] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)) {
    const cells = [...row[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)\s*>/gi)].map((cell) => htmlToText(cell[1]));
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) throw new FetchError("HTML table has no rows", false);
  return rows;
}

export function assertHtmlResponse(response: Response, body: string): void {
  if (!response.ok) throw new FetchError(`source returned HTTP ${response.status}`, response.status === 429 || response.status >= 500);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new FetchError(`unexpected content-type ${contentType || "[missing]"}`, false);
  if (!body.trim()) throw new FetchError("empty HTML response", false);
}
