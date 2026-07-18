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
    expect(html).toContain("i18n['上次同步']='Last sync'");
    expect(html).toContain("textContent=tr('即將公布')");
    expect(html).toContain("Supported quantitative events automatically sync Actual / Prior");
    expect(html).toContain('id="control-center"');
    expect(html).toContain('id="event-detail"');
    expect(html).toContain('class="drawer-ledger"');
    expect(html).toContain('<h1>關鍵發布監測<span>Official Data Desk</span></h1>');
    expect(html).not.toContain('<h1>美國經濟事件');
    expect(html.match(/<button[^>]+data-action="sync"/g)).toHaveLength(1);
    expect(html.indexOf('id="stat-events"')).toBeGreaterThan(html.indexOf('id="control-center"'));
    expect(html).not.toContain('class="ledger"');
    expect(html).toContain("prefers-reduced-motion:reduce");
    expect(html).toContain("/auth/session");
    expect(html).not.toContain("sessionStorage.setItem(tokenKey");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    expect(scripts.length).toBeGreaterThan(0);
    expect(() => scripts.forEach((script) => new Function(script))).not.toThrow();

    const qualitativePattern = html.match(/var qualitative=function\(event\)\{return \/(.*?)\/i\.test/);
    expect(qualitativePattern).not.toBeNull();
    const isQualitative = new RegExp(qualitativePattern?.[1] ?? "", "i");
    expect(isQualitative.test("FOMC Press Conference")).toBe(true);
    expect(isQualitative.test("Retail Sales MoM")).toBe(false);
  });
});
