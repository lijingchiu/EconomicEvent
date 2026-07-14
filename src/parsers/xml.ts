import { FetchError } from "../utils/fetch-with-timeout";
import { decodeHtmlEntities, htmlToText } from "./html";

export type XmlItem = { title: string; link?: string; guid?: string; pubDate?: string; description?: string };

export function parseXmlItems(xml: string): XmlItem[] {
  if (!/^\s*<\?xml|^\s*<rss|^\s*<feed/i.test(xml)) throw new FetchError("unsupported or malformed XML document", false);
  const items = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].map((match) => match[1]);
  return items.map((item) => {
    const value = (tag: string) => { const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(item); return match ? htmlToText(decodeHtmlEntities(match[1])) : undefined; };
    const link = /<link\b[^>]*href=["']([^"']+)["'][^>]*>/i.exec(item)?.[1] ?? value("link");
    const title = value("title");
    if (!title) throw new FetchError("XML item is missing title", false);
    return { title, link, guid: value("guid") ?? value("id"), pubDate: value("pubDate") ?? value("published") ?? value("updated"), description: value("description") ?? value("summary") };
  });
}
