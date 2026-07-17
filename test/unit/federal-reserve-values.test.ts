import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFederalReserveEventValues } from "../../src/providers/federal-reserve-values";
import type { Env } from "../../src/types";

afterEach(() => vi.unstubAllGlobals());

describe("Federal Reserve official values", () => {
  it("uses the official target-range upper limit for Actual and Prior", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response([
      "observation_date,DFEDTARU",
      "2026-06-16,4.50",
      "2026-06-17,4.25",
      "2026-07-17,4.25",
    ].join("\n"), { headers: { "content-type": "text/csv" } })));

    const values = await fetchFederalReserveEventValues([
      { id: "released", name: "FOMC Interest Rate Decision", eventTimeUtc: "2026-06-17T18:00:00.000Z" },
      { id: "future", name: "FOMC Interest Rate Decision", eventTimeUtc: "2026-07-29T18:00:00.000Z" },
    ], {} as Env, "2026-07-17T12:00:00.000Z");

    expect(values.get("released")).toMatchObject({ actualValue: "4.25", previousValue: "4.50", valueUnit: "%" });
    expect(values.get("future")).toMatchObject({ actualValue: null, previousValue: "4.25" });
  });
});
