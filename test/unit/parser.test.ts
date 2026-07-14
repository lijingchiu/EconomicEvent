import { describe, expect, it } from "vitest";
import { parseHtmlTableRows } from "../../src/parsers/html";
import { parseIcs } from "../../src/parsers/ics";
import { parseXmlItems } from "../../src/parsers/xml";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("safe source parsers", () => {
  it("parses BLS HTML rows and strips scripts", () => {
    const html = read("test/fixtures/bls/schedule.html").replace("<body>", "<body><script>window.bad=true</script>");
    expect(parseHtmlTableRows(html)).toHaveLength(5);
  });
  it("parses ICS with UTC DTSTART", () => {
    const ics = "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:x\nSUMMARY:CPI\nDTSTART:20260714T123000Z\nDTSTAMP:20260701T000000Z\nEND:VEVENT\nEND:VCALENDAR";
    expect(parseIcs(ics)[0].eventTimeUtc).toBe("2026-07-14T12:30:00.000Z");
  });
  it("rejects ICS date-only events and malformed XML", () => {
    expect(() => parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:CPI\nDTSTART;VALUE=DATE:20260714\nEND:VEVENT\nEND:VCALENDAR")).toThrow();
    expect(() => parseXmlItems("<bad>")).toThrow();
    expect(parseXmlItems("<?xml version=\"1.0\"?><rss><channel><item><title>CPI</title><link>https://example.test/cpi</link></item></channel></rss>")[0].title).toBe("CPI");
  });
});
