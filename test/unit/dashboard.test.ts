import { describe, expect, it } from "vitest";
import { dashboardRoute } from "../../src/ui/admin-dashboard";

describe("dashboard language switcher", () => {
  it("renders bilingual controls and persisted language handling", async () => {
    const html = await dashboardRoute().text();
    expect(html).toContain('data-language="zh-Hant"');
    expect(html).toContain('data-language="en"');
    expect(html).toContain("macro-pulse-language");
    expect(html).toContain("info.definitionEn");
    expect(html).toContain("setLanguage");
  });
});
