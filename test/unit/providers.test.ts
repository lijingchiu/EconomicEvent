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

  it("expands BLS quarterly releases into quantitative metrics", async () => {
    mockFetch({
      "bls.ics": {
        contentType: "text/calendar",
        body: [
          "BEGIN:VCALENDAR", "VERSION:2.0",
          "BEGIN:VEVENT", "UID:bls-eci-2026-q2", "SUMMARY:Employment Cost Index for Second Quarter 2026", "DTSTART:20260731T123000Z", "END:VEVENT",
          "BEGIN:VEVENT", "UID:bls-prod-2026-q2-p", "SUMMARY:Productivity and Costs (P) for Second Quarter 2026", "DTSTART:20260806T123000Z", "END:VEVENT",
          "BEGIN:VEVENT", "UID:bls-prod-2026-q2-r", "SUMMARY:Productivity and Costs (R) for Second Quarter 2026", "DTSTART:20260903T123000Z", "END:VEVENT",
          "END:VCALENDAR",
        ].join("\n"),
      },
    });
    const result = await new BlsProvider().fetchEvents({ fromUtc: new Date("2026-07-01T00:00:00.000Z"), toUtc: new Date("2026-09-10T00:00:00.000Z") }, env);
    expect(result.events.map((event) => event.name)).toEqual([
      "Employment Cost Index QoQ",
      "Nonfarm Productivity QoQ Prel",
      "Unit Labor Costs QoQ Prel",
      "Nonfarm Productivity QoQ Revised",
      "Unit Labor Costs QoQ Revised",
    ]);
    expect(result.events.every((event) => event.impact === "high")).toBe(true);
    expect(result.events.every((event) => event.description?.includes("Quarter 2026"))).toBe(true);
  });

  it("fetches official BLS JOLTS levels as Actual and Prior", async () => {
    mockFetch({
      "api.bls.gov": {
        contentType: "application/json",
        body: JSON.stringify({
          status: "REQUEST_SUCCEEDED",
          Results: { series: [{ seriesID: "JTS000000000000000JOL", data: [
            { year: "2026", period: "M05", value: "7594" },
            { year: "2026", period: "M04", value: "7585" },
          ] }] },
        }),
      },
    });
    const values = await fetchBlsEventValues([{ id: "jolts", name: "JOLTs Job Openings", eventTimeUtc: "2026-07-07T14:00:00.000Z" }], env);
    expect(values.get("jolts")).toMatchObject({ actualValue: "7594", previousValue: "7585", valueUnit: "K", releasePeriod: "2026-M05" });
  });

  it("matches each BLS event to its own release period across years", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({
      status: "REQUEST_SUCCEEDED",
      Results: { series: [{ seriesID: "CUSR0000SA0", data: [
        { year: "2025", period: "M12", value: "105" },
        { year: "2025", period: "M11", value: "100" },
        { year: "2025", period: "M10", value: "98" },
        { year: "2027", period: "M01", value: "115.5" },
        { year: "2026", period: "M12", value: "105" },
        { year: "2026", period: "M11", value: "100" },
      ] }] },
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const values = await fetchBlsEventValues([
      { id: "dec-2025", name: "Inflation Rate MoM", eventTimeUtc: "2026-01-13T13:30:00.000Z" },
      { id: "jan-2027", name: "Inflation Rate MoM", eventTimeUtc: "2027-02-10T13:30:00.000Z" },
    ], env, "2027-03-01T00:00:00.000Z");

    expect(values.get("dec-2025")).toMatchObject({ actualValue: "5.0", previousValue: "2.0", releasePeriod: "2025-M12" });
    expect(values.get("jan-2027")).toMatchObject({ actualValue: "10.0", previousValue: "5.0", releasePeriod: "2027-M01" });
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(requestBody).toMatchObject({ startyear: "2023", endyear: "2027" });
  });

  it("uses official BLS quarterly rates for ECI, productivity, and labor costs", async () => {
    mockFetch({
      "api.bls.gov": {
        contentType: "application/json",
        body: JSON.stringify({
          status: "REQUEST_SUCCEEDED",
          Results: { series: [
            { seriesID: "CIS1010000000000Q", data: [
              { year: "2026", period: "Q01", value: "0.9" },
              { year: "2025", period: "Q04", value: "0.7" },
            ] },
            { seriesID: "PRS85006092", data: [
              { year: "2026", period: "Q01", value: "0.3" },
              { year: "2025", period: "Q04", value: "1.6" },
            ] },
            { seriesID: "PRS85006112", data: [
              { year: "2026", period: "Q01", value: "1.8" },
              { year: "2025", period: "Q04", value: "2.1" },
            ] },
          ] },
        }),
      },
    });
    const values = await fetchBlsEventValues([
      { id: "eci", name: "Employment Cost Index QoQ", description: "Employment Cost Index for First Quarter 2026", eventTimeUtc: "2026-04-30T12:30:00.000Z" },
      { id: "prod-revised", name: "Nonfarm Productivity QoQ Revised", description: "Productivity and Costs (R) for First Quarter 2026", eventTimeUtc: "2026-06-04T12:30:00.000Z" },
      { id: "ulc-future", name: "Unit Labor Costs QoQ Prel", description: "Productivity and Costs (P) for Second Quarter 2026", eventTimeUtc: "2026-08-06T12:30:00.000Z" },
      { id: "prod-fallback", name: "Nonfarm Productivity QoQ Prel", eventTimeUtc: "2026-08-06T12:30:00.000Z" },
    ], env, "2026-06-05T00:00:00.000Z");
    expect(values.get("eci")).toMatchObject({ actualValue: "0.9", previousValue: "0.7", valueUnit: "%", releasePeriod: "2026-Q01" });
    expect(values.get("prod-revised")).toMatchObject({ actualValue: "0.3", previousValue: "1.6", valueUnit: "%", releasePeriod: "2026-Q01" });
    expect(values.get("ulc-future")).toMatchObject({ actualValue: null, previousValue: "1.8", valueUnit: "%", releasePeriod: "2026-Q02" });
    expect(values.get("prod-fallback")).toMatchObject({ actualValue: null, previousValue: "0.3", valueUnit: "%", releasePeriod: "2026-Q02" });
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
      "pet_stoc_wstk_dcu_nus_w": { body: read("test/fixtures/eia/wpsr-stock-history.html") },
      "schedule.html": { body: read("test/fixtures/eia/wngsr-schedule.html") },
      "wngsr.json": { body: read("test/fixtures/eia/wngsr.json"), contentType: "application/json; charset=utf-8" },
      "ng_stor_wkly_s1_w": { body: read("test/fixtures/eia/wngsr-stock-history.html") },
    });
    const result = await new EiaProvider().fetchEvents(range, env);
    expect(result.events.map((event) => event.name)).toEqual(expect.arrayContaining(["Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories", "Natural Gas Storage"]));
    expect(result.events.every((event) => event.eventTimeUtc.endsWith("Z"))).toBe(true);
    const wpsrRelease = result.events.filter((event) => event.eventTimeUtc === "2026-07-15T14:30:00.000Z");
    expect(wpsrRelease.map((event) => event.name)).toEqual(expect.arrayContaining(["Crude Oil Inventories", "Gasoline Inventories", "Distillate Inventories"]));
    expect(wpsrRelease.find((event) => event.name === "Crude Oil Inventories")?.actualValue).toBe("-1.693");
    expect(wpsrRelease.find((event) => event.name === "Crude Oil Inventories")?.previousValue).toBe("2.998");
    expect(wpsrRelease.find((event) => event.name === "Gasoline Inventories")?.previousValue).toBe("-1.904");
    const ngsrRelease = result.events.find((event) => event.eventTimeUtc === "2026-07-09T14:30:00.000Z" && event.name === "Natural Gas Storage");
    expect(ngsrRelease?.actualValue).toBe("61");
    expect(ngsrRelease?.previousValue).toBe("87");
  });

  it("fetches official EIA release values for refresh backfill", async () => {
    mockFetch({
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { body: read("test/fixtures/eia/wpsr-table1.csv"), contentType: "text/csv; charset=utf-8" },
      "pet_stoc_wstk_dcu_nus_w": { body: read("test/fixtures/eia/wpsr-stock-history.html") },
      "wngsr.json": { body: read("test/fixtures/eia/wngsr.json"), contentType: "application/json; charset=utf-8" },
      "ng_stor_wkly_s1_w": { body: read("test/fixtures/eia/wngsr-stock-history.html") },
    });
    const values = await fetchEiaEventValues([
      { id: "wpsr-legacy", name: "Weekly Petroleum Status Report", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wpsr-crude", name: "Crude Oil Inventories", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wpsr-gasoline", name: "Gasoline Inventories", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "wngsr-storage", name: "Natural Gas Storage", eventTimeUtc: "2026-07-09T14:30:00.000Z" },
    ]);
    expect(values.get("wpsr-legacy")?.actualValue).toBe("-1.693");
    expect(values.get("wpsr-crude")?.actualValue).toBe("-1.693");
    expect(values.get("wpsr-gasoline")?.previousValue).toBe("-1.904");
    expect(values.get("wngsr-storage")?.actualValue).toBe("61");
  });

  it("uses the latest EIA release as Prior for a future event", async () => {
    mockFetch({
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { body: read("test/fixtures/eia/wpsr-table1.csv"), contentType: "text/csv; charset=utf-8" },
      "pet_stoc_wstk_dcu_nus_w": { body: read("test/fixtures/eia/wpsr-stock-history.html") },
    });
    const values = await fetchEiaEventValues([{ id: "future-crude", name: "Crude Oil Inventories", eventTimeUtc: "2026-07-22T14:30:00.000Z" }], "2026-07-16T00:00:00.000Z");
    expect(values.get("future-crude")).toMatchObject({ actualValue: null, previousValue: "-1.693" });
  });

  it("derives EIA WPSR Actual and Prior from the official history when CSV access is rejected", async () => {
    mockFetch({
      "/petroleum/supply/weekly/": { body: read("test/fixtures/eia/wpsr-report.html") },
      "table1.csv": { status: 403, body: "forbidden", contentType: "text/plain" },
      "pet_stoc_wstk_dcu_nus_w": { body: read("test/fixtures/eia/wpsr-stock-history.html") },
    });
    const values = await fetchEiaEventValues([
      { id: "fallback-crude", name: "Crude Oil Inventories", eventTimeUtc: "2026-07-15T14:30:00.000Z" },
      { id: "fallback-future", name: "Gasoline Inventories", eventTimeUtc: "2026-07-22T14:30:00.000Z" },
    ]);
    expect(values.get("fallback-crude")).toMatchObject({ actualValue: "-1.692", previousValue: "2.998", valueUnit: "million barrels" });
    expect(values.get("fallback-future")).toMatchObject({ actualValue: null, previousValue: "-1.533", valueUnit: "million barrels" });
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
