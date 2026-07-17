import type { Env } from "./types";
import { healthRoute, readinessRoute } from "./routes/health";
import { adminRoute } from "./routes/admin";
import { json } from "./utils/auth";
import { runScheduled } from "./scheduled";
import { dashboardRoute, faviconRoute, paperTextureRoute } from "./ui/admin-dashboard";
import { authRoute } from "./routes/auth";
import { publicApiRoute } from "./routes/public-api";
import { manifestRoute, serviceWorkerRoute } from "./routes/pwa";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico")) return faviconRoute();
    if (request.method === "GET" && url.pathname === "/paper-texture.svg") return paperTextureRoute();
    if (request.method === "GET" && url.pathname === "/manifest.webmanifest") return manifestRoute();
    if (request.method === "GET" && url.pathname === "/service-worker.js") return serviceWorkerRoute();
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/health")) return healthRoute(env);
    if (request.method === "GET" && (url.pathname === "/ready" || url.pathname === "/api/ready")) return readinessRoute(env);
    if (request.method === "GET" && (url.pathname === "/admin" || url.pathname === "/admin/" || url.pathname === "/dashboard")) return dashboardRoute();
    if (url.pathname.startsWith("/auth/")) return authRoute(request, env, url.pathname);
    if (url.pathname.startsWith("/api/")) return publicApiRoute(request, env, url.pathname);
    if (url.pathname.startsWith("/admin/")) return adminRoute(request, env, url.pathname);
    return json({ error: "not_found" }, 404);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(controller.cron, env, new Date(controller.scheduledTime)));
  },
};
