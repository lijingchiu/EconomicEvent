import type { ProviderWarning } from "../types";

export class InvalidEventTimeError extends Error { constructor(message: string) { super(message); this.name = "InvalidEventTimeError"; } }

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsFromDate(value: string): Parts {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!match) throw new InvalidEventTimeError(`unsupported date-time: ${value}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4]), minute: Number(match[5]), second: Number(match[6] ?? 0) };
}

function localParts(instant: Date, timeZone: string): Parts {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second };
}

function sameParts(a: Parts, b: Parts): boolean { return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute && a.second === b.second; }

function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = localParts(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

function zonedTimeToUtc(parts: Parts, timeZone: string): Date {
  const naive = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let result = new Date(naive - offsetMinutes(new Date(naive), timeZone) * 60_000);
  result = new Date(naive - offsetMinutes(result, timeZone) * 60_000);
  if (!sameParts(localParts(result, timeZone), parts)) throw new InvalidEventTimeError(`invalid or ambiguous local time ${JSON.stringify(parts)} in ${timeZone}`);
  return result;
}

export function parseOfficialDateTime(value: string, sourceTimeZone?: string): Date {
  const trimmed = value.trim();
  if (/\dT\d.*(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed)) {
    const result = new Date(trimmed);
    if (Number.isNaN(result.getTime())) throw new InvalidEventTimeError(`invalid ISO date-time: ${value}`);
    return result;
  }
  if (!sourceTimeZone) throw new InvalidEventTimeError(`timezone required for local date-time: ${value}`);
  return zonedTimeToUtc(partsFromDate(trimmed), sourceTimeZone);
}

export function convertToUtc(value: string, sourceTimeZone?: string): string { return parseOfficialDateTime(value, sourceTimeZone).toISOString(); }

export function formatInTimezone(instant: Date | string, timeZone: string): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new InvalidEventTimeError("cannot format invalid date");
  const fields = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const map = Object.fromEntries(fields.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute} ${timeZone}`;
}

export function validateEventTime(value: string): ProviderWarning | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || !value.endsWith("Z")) return { code: "invalid_event_time", message: "event time must be a valid UTC ISO string", details: { value } };
  return null;
}

export function calculateReminderTime(eventTimeUtc: string, reminderMinutes: number): string { return new Date(new Date(eventTimeUtc).getTime() - reminderMinutes * 60_000).toISOString(); }
