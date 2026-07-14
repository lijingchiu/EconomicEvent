import { vi } from "vitest";

export function fixture(path: string): string { return path; }

export function mockFetch(routes: Record<string, { status?: number; contentType?: string; body: string }>): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = Object.entries(routes).find(([key]) => url.includes(key))?.[1];
    if (!route) return new Response("not mocked", { status: 404, headers: { "content-type": "text/plain" } });
    return new Response(route.body, { status: route.status ?? 200, headers: { "content-type": route.contentType ?? "text/html; charset=utf-8" } });
  }));
}
