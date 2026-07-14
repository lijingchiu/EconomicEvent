import { parseOfficialDateTime } from "../domain/time";
import { FetchError } from "../utils/fetch-with-timeout";

export type IcsEvent = { uid?: string; summary: string; description?: string; sourceUpdatedAt?: string; eventTimeUtc: string; timeZone?: string };

function unfold(input: string): string[] { return input.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }

function parseDate(value: string, parameters: string): { eventTimeUtc: string; timeZone?: string } {
  if (/^\d{8}$/.test(value) || /VALUE=DATE/i.test(parameters)) throw new FetchError("ICS event does not contain a release time", false);
  const timeZone = /TZID=([^;:]+)/i.exec(parameters)?.[1];
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(value);
  if (!match) throw new FetchError(`invalid ICS date-time ${value}`, false);
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[7] ? "Z" : ""}`;
  return { eventTimeUtc: parseOfficialDateTime(iso, match[7] ? undefined : timeZone).toISOString(), timeZone };
}

export function parseIcs(input: string): IcsEvent[] {
  if (!/^\s*BEGIN:VCALENDAR/i.test(input)) throw new FetchError("malformed ICS: missing VCALENDAR", false);
  const events = [...input.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi)].map((match) => match[1]);
  if (!events.length) throw new FetchError("ICS contains no VEVENT", false);
  return events.map((body) => {
    const fields = new Map<string, { value: string; parameters: string }>();
    for (const line of unfold(body)) { const separator = line.indexOf(":"); if (separator < 0) continue; const left = line.slice(0, separator); const value = line.slice(separator + 1); const [name, ...parameters] = left.split(";"); fields.set(name.toUpperCase(), { value, parameters: parameters.join(";") }); }
    const summary = fields.get("SUMMARY")?.value;
    const start = fields.get("DTSTART");
    if (!summary || !start) throw new FetchError("ICS VEVENT missing SUMMARY or DTSTART", false);
    const parsed = parseDate(start.value, start.parameters);
    return { uid: fields.get("UID")?.value, summary, description: fields.get("DESCRIPTION")?.value, sourceUpdatedAt: fields.get("DTSTAMP")?.value, ...parsed };
  });
}
