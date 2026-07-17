import { describe, expect, it } from "vitest";
import { foldIcsLine } from "../../src/routes/public-api";

describe("iCalendar output", () => {
  it("folds long UTF-8 content at 75 octets", () => {
    const folded = foldIcsLine(`SUMMARY:${"美國經濟事件".repeat(12)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true);
    expect(lines.every((line) => new TextEncoder().encode(line).byteLength <= 75)).toBe(true);
  });
});
