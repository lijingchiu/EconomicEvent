import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../src/types";

vi.mock("../../src/services/notification-checker", () => ({ checkDueNotifications: vi.fn() }));
vi.mock("../../src/services/value-refresh", () => ({ refreshDueEventValues: vi.fn() }));
vi.mock("../../src/services/provider-sync", () => ({ syncProviders: vi.fn(), cleanupDatabase: vi.fn() }));
vi.mock("../../src/services/provider-health-alert", () => ({ sendProviderHealthAlerts: vi.fn() }));
vi.mock("../../src/utils/logger", () => ({ log: vi.fn(), logError: vi.fn() }));

import { checkDueNotifications } from "../../src/services/notification-checker";
import { refreshDueEventValues } from "../../src/services/value-refresh";
import { runScheduled } from "../../src/scheduled";

describe("scheduled runner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("still refreshes values when notification checking fails", async () => {
    vi.mocked(checkDueNotifications).mockRejectedValueOnce(new Error("delivery query failed"));
    vi.mocked(refreshDueEventValues).mockResolvedValueOnce({ checkedEvents: 1, attemptedSources: 1, updatedEvents: 1, unavailableEvents: 0, failedEvents: 0, errors: [] });

    await expect(runScheduled("* * * * *", {} as Env, new Date("2026-07-16T12:31:00Z"))).rejects.toThrow("1 task(s) failed");
    expect(refreshDueEventValues).toHaveBeenCalledOnce();
  });
});
