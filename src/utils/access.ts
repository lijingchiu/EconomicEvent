import type { Env } from "../types";

type AccessClaims = { aud?: string | string[]; exp?: number; email?: string; sub?: string };
type Jwk = JsonWebKey & { kid?: string };

const certCache = new Map<string, { expiresAt: number; keys: Jwk[] }>();

function base64UrlBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value))) as T;
}

function accessOrigin(domain: string): string {
  const value = domain.trim().replace(/\/$/, "");
  return value.startsWith("https://") ? value : `https://${value}`;
}

async function accessKeys(domain: string): Promise<Jwk[]> {
  const origin = accessOrigin(domain);
  const cached = certCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await fetch(`${origin}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Cloudflare Access certs HTTP ${response.status}`);
  const payload = await response.json() as { keys?: Jwk[]; public_certs?: Jwk[] };
  const keys = payload.keys ?? payload.public_certs ?? [];
  if (!keys.length) throw new Error("Cloudflare Access returned no signing keys");
  certCache.set(origin, { keys, expiresAt: Date.now() + 60 * 60_000 });
  return keys;
}

export async function verifyCloudflareAccess(request: Request, env: Env): Promise<AccessClaims | null> {
  const domain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const expectedAudience = env.CF_ACCESS_AUD?.trim();
  if (!domain || !expectedAudience) return null;
  const token = request.headers.get("cf-access-jwt-assertion")?.trim();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = decodeJson<{ alg?: string; kid?: string }>(parts[0]);
    const claims = decodeJson<AccessClaims>(parts[1]);
    if (header.alg !== "RS256" || !header.kid || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
    const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!audiences.includes(expectedAudience)) return null;
    const jwk = (await accessKeys(domain)).find((key) => key.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlBytes(parts[2]);
    const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature.buffer as ArrayBuffer, data);
    return verified ? claims : null;
  } catch {
    return null;
  }
}
