import type { Env } from "./types";
import { healthRoute } from "./routes/health";
import { adminRoute } from "./routes/admin";
import { json } from "./utils/auth";
import { runScheduled } from "./scheduled";
import { dashboardRoute, faviconRoute } from "./ui/admin-dashboard";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico")) return faviconRoute();
    if (request.method === "GET" && url.pathname === "/health") return healthRoute(env);
    if (request.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/dashboard")) return dashboardRoute();
    if (url.pathname.startsWith("/admin/")) return adminRoute(request, env, url.pathname);
    return json({ error: "not_found" }, 404);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(controller.cron, env, new Date(controller.scheduledTime)));
  },
};
