import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { BlsProvider } from "../../src/providers/bls";
import { BeaProvider } from "../../src/providers/bea";
import { FederalReserveProvider } from "../../src/providers/federal-reserve";
import { EiaProvider } from "../../src/providers/eia";
import { CensusProvider } from "../../src/providers/census";
import { IsmProvider } from "../../src/providers/ism";
import { UmichProvider } from "../../src/providers/umich";
import { mockFetch } from "../helpers";

const env = { DB: {} as D1Database, APP_TIMEZONE: "Asia/Taipei", STORE_MEDIUM_EVENTS: "false" };
const range = { fromUtc: new Date("2026-07-01T00:00:00.000Z"), toUtc: new Date("2026-08-20T00:00:00.000Z") };
const read = (path: string) => readFileSync(path, "utf8");

afterEach(() => { vi.unstubAllGlobals(); });

describe("official provider adapters", () => {
  it("parses BLS HTML and excludes false positives", async () => {
    mockFetch({ "/schedule/2026/": { body: read("test/fixtures/bls/schedule.html") } });
    const result = await new BlsProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["Inflation Rate MoM", "Core Inflation Rate MoM", "Inflation Rate YoY", "Core Inflation Rate YoY", "PPI MoM", "Non Farm Payrolls", "Unemployment Rate"]);
    expect(result.events[0].eventTimeUtc).toBe("2026-07-14T12:30:00.000Z");
  });

  it("prefers the official BLS ICS calendar", async () => {
    mockFetch({
      "bls.ics": {
        contentType: "text/calendar",
        body: "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:bls-cpi-2026-07-14\nSUMMARY:Consumer Price Index for June 2026\nDTSTART:20260714T123000Z\nDTSTAMP:20260701T000000Z\nEND:VEVENT\nEND:VCALENDAR",
      },
    });
    const result = await new BlsProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["Inflation Rate MoM", "Core Inflation Rate MoM", "Inflation Rate YoY", "Core Inflation Rate YoY"]);
    expect(result.events[0].eventTimeUtc).toBe("2026-07-14T12:30:00.000Z");
    expect(result.warnings).toEqual([]);
  });

  it("parses BEA public JSON release dates", async () => {
    mockFetch({ "release_dates.json": { body: read("test/fixtures/bea/release_dates.json"), contentType: "application/json" } });
    const result = await new BeaProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toContain("GDP Growth Rate QoQ Adv");
    expect(result.events.find((event) => event.name === "GDP Growth Rate QoQ Adv")?.providerEventId).toBe("bea-gdp-2026-07-30|gdp-growth-rate-qoq-adv");
  });

  it("parses Federal Reserve FOMC calendar HTML", async () => {
    mockFetch({ "2026-july.htm": { body: read("test/fixtures/federal-reserve/july.html") } });
    const result = await new FederalReserveProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["FOMC Minutes", "FOMC Press Conference", "FOMC Interest Rate Decision", "Beige Book"]);
    expect(result.events[0].eventTimeUtc).toBe("2026-07-08T18:00:00.000Z");
  });

  it("builds EIA weekly events from official schedule rules", async () => {
    mockFetch({
      "schedule.php": { body: read("test/fixtures/eia/wpsr-schedule.html") },
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { body: read("test/fixtures/eia/wpsr-table1.csv"), contentType: "text/csv; charset=utf-8" },
      "schedule.html": { body: read("test/fixtures/eia/wngsr-schedule.html") },
      "wngsr.json": { body: read("test/fixtures/eia/wngsr.json"), contentType: "application/json; charset=utf-8" },
    });
    const result = await new EiaProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(expect.arrayContaining(["Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories", "Natural Gas Storage"]));
    expect(result.events.every((event) => event.eventTimeUtc.endsWith("Z"))).toBe(true);
    const wpsrRelease = result.events.filter((event) => event.eventTimeUtc === "2026-07-15T14:30:00.000Z");
    expect(wpsrRelease.map((event) => event.name)).toEqual(expect.arrayContaining(["Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories"]));
    expect(wpsrRelease.find((event) => event.name === "Crude Oil Inventories")?.actualValue).toBe("726.2");
    expect(wpsrRelease.find((event) => event.name === "Gasoline Inventories")?.previousValue).toBe("212.1");
    const ngsrRelease = result.events.find((event) => event.eventTimeUtc === "2026-07-09T14:30:00.000Z" && event.name === "Natural Gas Storage");
    expect(ngsrRelease?.actualValue).toBe("2,983");
    expect(ngsrRelease?.previousValue).toBe("2,922");
  });

  it("parses Census release components", async () => {
    mockFetch({ "calendar-listview": { body: read("test/fixtures/census/calendar.html") } });
    const result = await new CensusProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["Retail Sales MoM", "Building Permits Prel", "Housing Starts", "Durable Goods Orders MoM"]);
  });

  it("parses ISM's official month table", async () => {
    mockFetch({ "rob-report-calendar": { body: read("test/fixtures/ism/calendar.html") } });
    const result = await new IsmProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["ISM Manufacturing PMI", "ISM Services PMI", "ISM Manufacturing PMI", "ISM Services PMI"]);
    expect(result.events[2].eventTimeUtc).toBe("2026-08-03T14:00:00.000Z");
  });

  it("builds Michigan preliminary and final dates from the official release schedule", async () => {
    mockFetch({ "docid=75443": { body: "%PDF-1.7 official schedule", contentType: "application/pdf" } });
    const result = await new UmichProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["Michigan Consumer Sentiment Prel", "Michigan Consumer Sentiment Final", "Michigan Consumer Sentiment Prel"]);
    expect(result.events[0].eventTimeUtc).toBe("2026-07-17T14:00:00.000Z");
  });

  it("returns structured warnings for HTTP, content-type and empty failures", async () => {
    mockFetch({ "/schedule/2026/": { status: 500, body: "oops", contentType: "text/plain" } });
    const result = await new BlsProvider().fetchEvents(range, env);
    expect(result.events).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.code === "source_fetch_failed")).toBe(true);
  });
});
