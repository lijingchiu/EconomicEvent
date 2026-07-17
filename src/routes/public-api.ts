import type { Env } from "../types";
import { getEvent, listEvents } from "../repositories/events";
import { listEventValueHistory } from "../repositories/value-history";
import { json } from "../utils/auth";

function dateParam(value: string | null, fallback: Date): string {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function icsDate(value: string): string {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: unknown): string {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const character of line) {
    const bytes = encoder.encode(character).byteLength;
    if (current && currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += character;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.map((part, index) => index ? ` ${part}` : part).join("\r\n");
}

async function calendarResponse(env: Env, url: URL): Promise<Response> {
  const now = new Date();
  const fromUtc = dateParam(url.searchParams.get("from"), new Date(now.getTime() - 86_400_000));
  const toUtc = dateParam(url.searchParams.get("to"), new Date(now.getTime() + 90 * 86_400_000));
  const events = await listEvents(env.DB, { fromUtc, toUtc, limit: 200 });
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Macro Pulse//EconomicEvent//ZH-TW", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Macro Pulse 美國經濟事件", "X-WR-TIMEZONE:UTC"];
  for (const event of events) {
    const start = new Date(String(event.eventTimeUtc));
    const end = new Date(start.getTime() + 30 * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsText(event.id)}@macro-pulse`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(start.toISOString())}`,
      `DTEND:${icsDate(end.toISOString())}`,
      `SUMMARY:${icsText(event.name)}`,
      `DESCRIPTION:${icsText(`${event.description ?? "Official U.S. economic release"}\nActual: ${event.actualValue ?? "pending"}\nPrior: ${event.previousValue ?? "pending"}`)}`,
      `URL:${icsText(event.valueSourceUrl ?? event.sourceUrl)}`,
      `CATEGORIES:${icsText(event.category)},${icsText(event.impact)}`,
      `STATUS:${event.lifecycleStatus === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(`${lines.map(foldIcsLine).join("\r\n")}\r\n`, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": "attachment; filename=macro-pulse-events.ics", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
}

export async function publicApiRoute(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const url = new URL(request.url);
  if (path === "/api/events.ics") return calendarResponse(env, url);
  if (path === "/api/events") {
    const now = new Date();
    const events = await listEvents(env.DB, {
      fromUtc: dateParam(url.searchParams.get("from"), new Date(now.getTime() - 86_400_000)),
      toUtc: dateParam(url.searchParams.get("to"), new Date(now.getTime() + 30 * 86_400_000)),
      provider: url.searchParams.get("provider") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      impact: url.searchParams.get("impact") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 100),
    });
    return json({ generatedAt: now.toISOString(), events }, 200, { "cache-control": "public, max-age=30, stale-while-revalidate=60" });
  }
  const match = /^\/api\/events\/([^/]+)$/.exec(path);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const event = await getEvent(env.DB, id);
    if (!event) return json({ error: "event_not_found" }, 404);
    return json({ event, history: await listEventValueHistory(env.DB, id) }, 200, { "cache-control": "public, max-age=30, stale-while-revalidate=60" });
  }
  return json({ error: "not_found" }, 404);
}
