import { describe, expect, it } from "vitest";
import { taskStaleAfterMinutes } from "../../src/repositories/scheduled-tasks";

describe("scheduled task health windows", () => {
  it("uses a cadence-aware stale threshold", () => {
    expect(taskStaleAfterMinutes("notifications")).toBe(5);
    expect(taskStaleAfterMinutes("provider_sync")).toBe(390);
    expect(taskStaleAfterMinutes("database_cleanup")).toBe(26 * 60);
    expect(taskStaleAfterMinutes("unknown_task")).toBe(15);
  });
});
