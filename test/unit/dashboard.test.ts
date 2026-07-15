import { describe, expect, it } from "vitest";
import { dashboardRoute, faviconRoute } from "../../src/ui/admin-dashboard";

describe("admin dashboard assets", () => {
  it("serves the editorial dashboard with all three display modes", async () => {
    const response = dashboardRoute();
    const html = await response.text();

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('data-theme-choice="light"');
    expect(html).toContain('data-theme-choice="dark"');
    expect(html).toContain('data-theme-choice="system"');
    expect(html).toContain("美國經濟事件");
    expect(html).toContain("--paper:#e7e5df");
    expect(html).toContain('data-view="list"');
    expect(html).toContain('data-view="calendar"');
    expect(html).toContain("data-calendar-event");
    expect(html).toContain("marketSignals");
  });

  it("serves a cacheable SVG application icon", async () => {
    const response = faviconRoute();
    const svg = await response.text();

    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(svg).toContain("<svg");
  });

});
