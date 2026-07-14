import { redactSecrets, sanitizeUrl, serializeError } from "./redaction";
import type { Env } from "../types";

export function log(level: "info" | "warn" | "error", operation: string, fields: Record<string, unknown> = {}, env?: Env): void {
  const secrets = env ? [env.DISCORD_WEBHOOK_URL, env.ADMIN_TOKEN, env.BLS_API_KEY, env.BEA_API_KEY, env.EIA_API_KEY].filter((value): value is string => Boolean(value)) : [];
  const sanitizedFields = redactSecrets(fields, secrets) as Record<string, unknown>;
  if (typeof sanitizedFields.sourceUrl === "string") sanitizedFields.sourceUrl = sanitizeUrl(sanitizedFields.sourceUrl);
  console.log(JSON.stringify({ level, operation, ...sanitizedFields, timestamp: new Date().toISOString() }));
}

export function logError(operation: string, error: unknown, fields: Record<string, unknown> = {}, env?: Env): void {
  log("error", operation, { ...fields, error: serializeError(error, [env?.DISCORD_WEBHOOK_URL, env?.ADMIN_TOKEN].filter((value): value is string => Boolean(value))) }, env);
}
