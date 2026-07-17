import type { Env } from "../types";
import { secureEqual } from "./crypto";
import { verifyCloudflareAccess } from "./access";

const SESSION_COOKIE = "macro_pulse_session";
const encoder = new TextEncoder();

function encodeBase64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(normalized);
}

async function sessionSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encodeBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
}

function cookieValue(request: Request, name: string): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return parts.join("=");
  }
  return null;
}

async function hasValidSession(request: Request, env: Env): Promise<boolean> {
  const secret = env.ADMIN_TOKEN?.trim();
  const session = cookieValue(request, SESSION_COOKIE);
  if (!secret || !session) return false;
  const separator = session.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = session.slice(0, separator);
  const signature = session.slice(separator + 1);
  if (!await secureEqual(signature, await sessionSignature(payload, secret))) return false;
  try {
    const data = JSON.parse(decodeBase64Url(payload)) as { expiresAt?: number };
    return Number(data.expiresAt ?? 0) > Date.now();
  } catch {
    return false;
  }
}

export async function createAdminSessionCookie(env: Env, now = Date.now()): Promise<string> {
  const secret = env.ADMIN_TOKEN?.trim();
  if (!secret) throw new Error("ADMIN_TOKEN is not configured");
  const maxAge = 8 * 60 * 60;
  const payload = encodeBase64Url(JSON.stringify({ version: 1, expiresAt: now + maxAge * 1000 }));
  const signature = await sessionSignature(payload, secret);
  return `${SESSION_COOKIE}=${payload}.${signature}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearAdminSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function verifyAdminToken(token: string, env: Env): Promise<boolean> {
  const expected = env.ADMIN_TOKEN?.trim();
  return Boolean(expected && token && await secureEqual(token, expected));
}

export async function isAdminRequest(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (match && await verifyAdminToken(match[1], env)) return true;
  if (await hasValidSession(request, env)) return true;
  return Boolean(await verifyCloudflareAccess(request, env));
}

export async function requireAdmin(request: Request, env: Env): Promise<Response | null> {
  if (await isAdminRequest(request, env)) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
    }
    return null;
  }
  return json({ error: "unauthorized" }, 401);
}

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
