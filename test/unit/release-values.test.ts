import { describe, expect, it } from "vitest";
import { buildBlsEventValues, parseUmichEventValue, type ReleaseValueEvent } from "../../src/providers/release-values";

const fetchedAt = "2026-07-14T12:30:05.000Z";

function event(id: string, name: string, eventTimeUtc = "2026-07-14T12:30:00.000Z"): ReleaseValueEvent {
  return { id, name, eventTimeUtc };
}

function series(seriesID: string, values: Array<[string, string, string]>): { seriesID: string; data: Array<{ year: string; period: string; value: string }> } {
  return { seriesID, data: values.map(([year, period, value]) => ({ year, period, value })) };
}

describe("official release values", () => {
  it("calculates BLS Actual and revised Prior values for each supported metric", () => {
    const events = [
      event("cpi-mom", "Inflation Rate MoM"),
      event("core-cpi-mom", "Core Inflation Rate MoM"),
      event("cpi-yoy", "Inflation Rate YoY"),
      event("core-cpi-yoy", "Core Inflation Rate YoY"),
      event("ppi", "PPI MoM"),
      event("nfp", "Non Farm Payrolls"),
      event("unemployment", "Unemployment Rate"),
    ];
    const response = {
      status: "REQUEST_SUCCEEDED",
      Results: { series: [
        series("CUSR0000SA0", [["2026", "M06", "332.568"], ["2026", "M05", "333.979"], ["2026", "M04", "332.407"]]),
        series("CUSR0000SA0L1E", [["2026", "M06", "336.065"], ["2026", "M05", "336.121"], ["2026", "M04", "335.423"]]),
        series("CUUR0000SA0", [["2026", "M06", "333.952"], ["2026", "M05", "335.123"], ["2025", "M06", "322.561"], ["2025", "M05", "321.465"]]),
        series("CUUR0000SA0L1E", [["2026", "M06", "336.882"], ["2026", "M05", "336.846"], ["2025", "M06", "328.364"], ["2025", "M05", "327.509"]]),
        series("WPSFD4", [["2026", "M06", "158.200"], ["2026", "M05", "157.659"], ["2026", "M04", "156.011"]]),
        series("CES0000000001", [["2026", "M06", "158984"], ["2026", "M05", "158927"], ["2026", "M04", "158798"]]),
        series("LNS14000000", [["2026", "M06", "4.2"], ["2026", "M05", "4.3"]]),
      ] },
    };

    const values = buildBlsEventValues(events, response, fetchedAt);
    expect(values.get("cpi-mom")).toMatchObject({ actualValue: "-0.4", previousValue: "0.5", valueUnit: "%" });
    expect(values.get("core-cpi-mom")).toMatchObject({ actualValue: "0.0", previousValue: "0.2" });
    expect(values.get("cpi-yoy")).toMatchObject({ actualValue: "3.5", previousValue: "4.2" });
    expect(values.get("core-cpi-yoy")).toMatchObject({ actualValue: "2.6", previousValue: "2.9" });
    expect(values.get("ppi")).toMatchObject({ actualValue: "0.3", previousValue: "1.1" });
    expect(values.get("nfp")).toMatchObject({ actualValue: "57", previousValue: "129", valueUnit: "K" });
    expect(values.get("unemployment")).toMatchObject({ actualValue: "4.2", previousValue: "4.3" });
  });

  it("does not write stale BLS data from an earlier period", () => {
    const values = buildBlsEventValues(
      [event("cpi", "Inflation Rate MoM")],
      { status: "REQUEST_SUCCEEDED", Results: { series: [series("CUSR0000SA0", [["2026", "M05", "333.979"], ["2026", "M04", "332.407"]])] } },
      fetchedAt,
    );
    expect(values.size).toBe(0);
  });

  it("accepts Michigan values only when the phase and release month match", () => {
    const html = `<h1>Preliminary Results for July 2026</h1><table><tr><td></td><td>Jul</td><td>Jun</td></tr><tr><td>Index of Consumer Sentiment</td><td>52.1</td><td>49.5</td></tr></table>`;
    expect(parseUmichEventValue(event("umich-prel", "Michigan Consumer Sentiment Prel", "2026-07-17T14:00:00.000Z"), html, fetchedAt)).toMatchObject({ actualValue: "52.1", previousValue: "49.5", valueUnit: null });
    expect(parseUmichEventValue(event("umich-final", "Michigan Consumer Sentiment Final", "2026-07-31T14:00:00.000Z"), html, fetchedAt)).toBeNull();
  });
});
