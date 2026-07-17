import { describe, expect, it } from "vitest";
import { buildBeaEventValues } from "../../src/providers/bea-values";

describe("BEA release values", () => {
  it("maps GDP, core PCE, personal income and spending to official release periods", () => {
    const events = [
      { id: "gdp", name: "GDP Growth Rate QoQ Adv", eventTimeUtc: "2026-07-30T12:30:00.000Z" },
      { id: "pce", name: "Core PCE Price Index MoM", eventTimeUtc: "2026-07-31T12:30:00.000Z" },
      { id: "income", name: "Personal Income MoM", eventTimeUtc: "2026-07-31T12:30:00.000Z" },
      { id: "spending", name: "Personal Spending MoM", eventTimeUtc: "2026-07-31T12:30:00.000Z" },
    ];
    const tables = new Map<string, Array<Record<string, string>>>([
      ["T10101", [
        { LineNumber: "1", TimePeriod: "2026Q1", DataValue: "2.0" },
        { LineNumber: "1", TimePeriod: "2026Q2", DataValue: "3.1" },
      ]],
      ["T20307", [
        { LineNumber: "25", TimePeriod: "2026M05", DataValue: "0.2" },
        { LineNumber: "25", TimePeriod: "2026M06", DataValue: "0.3" },
      ]],
      ["T20600", [
        { LineNumber: "1", TimePeriod: "2026M04", DataValue: "100.0" },
        { LineNumber: "1", TimePeriod: "2026M05", DataValue: "101.0" },
        { LineNumber: "1", TimePeriod: "2026M06", DataValue: "102.01" },
        { LineNumber: "29", TimePeriod: "2026M04", DataValue: "200.0" },
        { LineNumber: "29", TimePeriod: "2026M05", DataValue: "202.0" },
        { LineNumber: "29", TimePeriod: "2026M06", DataValue: "204.02" },
      ]],
    ]);
    const values = buildBeaEventValues(events, tables, "2026-07-31T13:00:00.000Z");
    expect(values.get("gdp")).toMatchObject({ actualValue: "3.1", previousValue: "2.0", releasePeriod: "2026Q2" });
    expect(values.get("pce")).toMatchObject({ actualValue: "0.3", previousValue: "0.2", releasePeriod: "2026M06" });
    expect(values.get("income")).toMatchObject({ actualValue: "1.0", previousValue: "1.0" });
    expect(values.get("spending")).toMatchObject({ actualValue: "1.0", previousValue: "1.0" });
  });
});
