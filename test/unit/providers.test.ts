import { describe, expect, it, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { BlsProvider } from "../../src/providers/bls";
import { BeaProvider } from "../../src/providers/bea";
import { FederalReserveProvider } from "../../src/providers/federal-reserve";
import { EiaProvider } from "../../src/providers/eia";
import { fetchEiaEventValues } from "../../src/providers/eia";
import { fetchBlsEventValues, fetchIsmEventValues, fetchUmichEventValues } from "../../src/providers/release-values";
import { fetchCensusEventValues, parseCensusDurableRelease, parseCensusRetailRelease } from "../../src/providers/census-values";
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

  it("fetches official BLS JOLTS levels as Actual and Prior", async () => {
    mockFetch({
      "api.bls.gov": {
        contentType: "application/json",
        body: JSON.stringify({
          status: "REQUEST_SUCCEEDED",
          Results: { series: [{ seriesID: "JTS00000000JOL", data: [
            { year: "2026", period: "M06", value: "7594" },
            { year: "2026", period: "M05", value: "7620" },
          ] }] },
        }),
      },
    });
    const values = await fetchBlsEventValues([{ id: "jolts", name: "JOLTs Job Openings", eventTimeUtc: "2026-07-07T14:00:00.000Z" }], env);
    expect(values.get("jolts")).toMatchObject({ actualValue: "7594", previousValue: "7620", valueUnit: "K" });
  });

  it("parses BEA public JSON release dates", async () => {
    mockFetch({ "release_dates.json": { body: read("test/fixtures/bea/release_dates.json"), contentType: "application/json" } });
    const result = await new BeaProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toContain("GDP Growth Rate QoQ Adv");
    expect(result.events.find((event) => event.name === "GDP Growth Rate QoQ Adv")?.providerEventId).toBe("bea-gdp-2026-07-30|gdp-growth-rate-qoq-adv");
  });

  it("parses BEA's current named release date arrays", async () => {
    mockFetch({ "release_dates.json": { contentType: "application/json", body: JSON.stringify({
      "Gross Domestic Product": { release_dates: ["2026-07-30T12:30:00+00:00"] },
      "Personal Income and Outlays": { release_dates: ["2026-07-30T12:30:00+00:00"] },
    }) } });
    const result = await new BeaProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(expect.arrayContaining(["GDP Growth Rate QoQ", "Core PCE Price Index MoM", "Personal Income MoM", "Personal Spending MoM"]));
    expect(result.events.every((event) => event.eventTimeUtc === "2026-07-30T12:30:00.000Z")).toBe(true);
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

  it("fetches official EIA release values for refresh backfill", async () => {
    mockFetch({
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { body: read("test/fixtures/eia/wpsr-table1.csv"), contentType: "text/csv; charset=utf-8" },
      "wngsr.json": { body: read("test/fixtures/eia/wngsr.json"), contentType: "application/json; charset=utf-8" },
    });
    const values = await fetchEiaEventValues([
      { id: "wpsr-legacy", name: "Weekly Petroleum Status Report", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wpsr-crude", name: "Crude Oil Inventories", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wpsr-gasoline", name: "Gasoline Inventories", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wngsr-storage", name: "Natural Gas Storage", eventTimeUtc: "2026-07-09T14:30:00.000Z" },
    ]);
    expect(values.get("wpsr-legacy")?.actualValue).toBe("726.2");
    expect(values.get("wpsr-crude")?.actualValue).toBe("726.2");
    expect(values.get("wpsr-gasoline")?.previousValue).toBe("212.1");
    expect(values.get("wngsr-storage")?.actualValue).toBe("2,983");
  });

  it("uses the latest EIA release as Prior for a future event", async () => {
    mockFetch({
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { body: read("test/fixtures/eia/wpsr-table1.csv"), contentType: "text/csv; charset=utf-8" },
    });
    const values = await fetchEiaEventValues([{ id: "future-crude", name: "Crude Oil Inventories", eventTimeUtc: "2026-07-22T14:30:00.000Z" }], "2026-07-16T00:00:00.000Z");
    expect(values.get("future-crude")).toMatchObject({ actualValue: null, previousValue: "726.2" });
  });

  it("parses Census release components", async () => {
    mockFetch({ "calendar-listview": { body: read("test/fixtures/census/calendar.html") } });
    const result = await new CensusProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["Retail Sales MoM", "Building Permits Prel", "Housing Starts", "Durable Goods Orders MoM"]);
  });

  it("uses the latest Census residential release as Prior for future housing events", async () => {
    mockFetch({ "/construction/nrc/current/": { body: read("test/fixtures/census/residential-current.html") } });
    const values = await fetchCensusEventValues([
      { id: "future-permits", name: "Building Permits Prel", eventTimeUtc: "2026-07-17T12:30:00.000Z" },
      { id: "future-starts", name: "Housing Starts", eventTimeUtc: "2026-07-17T12:30:00.000Z" },
    ], "2026-07-16T00:00:00.000Z");
    expect(values.get("future-permits")).toMatchObject({ actualValue: null, previousValue: "1,413,000", valueUnit: "units" });
    expect(values.get("future-starts")).toMatchObject({ actualValue: null, previousValue: "1,177,000", valueUnit: "units" });
  });

  it("parses Census Retail Sales Actual and Prior after release", async () => {
    const snapshot = parseCensusRetailRelease(read("test/fixtures/census/retail-current.html"));
    expect(snapshot).toMatchObject({ releaseDate: "2026-07-16", actualValue: "0.2", previousValue: "1.0" });
    mockFetch({ "/retail/sales.html": { body: read("test/fixtures/census/retail-current.html") } });
    const values = await fetchCensusEventValues([{ id: "retail", name: "Retail Sales MoM", eventTimeUtc: "2026-07-16T12:30:00.000Z" }], "2026-07-16T13:00:00.000Z");
    expect(values.get("retail")).toMatchObject({ actualValue: "0.2", previousValue: "1.0", valueUnit: "%" });
  });

  it("parses Census Durable Goods Actual and Prior", async () => {
    const snapshot = parseCensusDurableRelease(read("test/fixtures/census/durable-current.html"));
    expect(snapshot).toMatchObject({ releaseDate: "2026-06-25", actualValue: "-4.5", previousValue: "8.5" });
    mockFetch({ "/manufacturing/m3/adv/current/": { body: read("test/fixtures/census/durable-current.html") } });
    const values = await fetchCensusEventValues([{ id: "durable", name: "Durable Goods Orders MoM", eventTimeUtc: "2026-07-27T12:30:00.000Z" }], "2026-07-16T13:00:00.000Z");
    expect(values.get("durable")).toMatchObject({ actualValue: null, previousValue: "-4.5", valueUnit: "%" });
  });

  it("uses the latest Michigan release as Prior for a future preliminary event", async () => {
    mockFetch({ "sca.isr.umich.edu": { body: "<html><h1>Final Results for June 2026</h1><table><tr><td>Index of Consumer Sentiment</td><td>49.5</td><td>44.8</td></tr></table></html>" } });
    const values = await fetchUmichEventValues([{ id: "future-umich", name: "Michigan Consumer Sentiment Prel", eventTimeUtc: "2026-07-17T14:00:00.000Z" }], "2026-07-16T00:00:00.000Z");
    expect(values.get("future-umich")).toMatchObject({ actualValue: null, previousValue: "49.5" });
  });

  it("parses ISM's official month table", async () => {
    mockFetch({ "rob-report-calendar": { body: read("test/fixtures/ism/calendar.html") } });
    const result = await new IsmProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["ISM Manufacturing PMI", "ISM Services PMI", "ISM Manufacturing PMI", "ISM Services PMI"]);
    expect(result.events[2].eventTimeUtc).toBe("2026-08-03T14:00:00.000Z");
  });

  it("uses the verified ISM 2026 schedule when the page returns 404", async () => {
    mockFetch({ "rob-report-calendar": { status: 404, body: "not found", contentType: "text/html" } });
    const result = await new IsmProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(["ISM Manufacturing PMI", "ISM Services PMI", "ISM Manufacturing PMI", "ISM Services PMI"]);
    expect(result.warnings.some((warning) => warning.code === "official_schedule_fallback")).toBe(true);
    expect(result.warnings.some((warning) => warning.code === "source_fetch_failed")).toBe(false);
  });

  it("fetches official ISM PMI Actual and Prior values", async () => {
    mockFetch({
      "/pmi/june/": { body: read("test/fixtures/ism/manufacturing-june.html") },
      "/services/june/": { body: read("test/fixtures/ism/services-june.html") },
    });
    const values = await fetchIsmEventValues([
      { id: "ism-manufacturing", name: "ISM Manufacturing PMI", eventTimeUtc: "2026-07-01T14:00:00.000Z" },
      { id: "ism-services", name: "ISM Services PMI", eventTimeUtc: "2026-07-06T14:00:00.000Z" },
    ]);
    expect(values.get("ism-manufacturing")).toMatchObject({ actualValue: "53.3", previousValue: "54.0", valueUnit: "%" });
    expect(values.get("ism-services")).toMatchObject({ actualValue: "54.0", previousValue: "54.5", valueUnit: "%" });
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
