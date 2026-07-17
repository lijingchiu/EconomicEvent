import { redactSecrets, sanitizeUrl, serializeError } from "./redaction";
import type { Env } from "../types";

function environmentSecrets(env?: Env): string[] {
  if (!env) return [];
  return [
    env.DISCORD_WEBHOOK_URL, env.ADMIN_TOKEN, env.BLS_API_KEY, env.BEA_API_KEY, env.EIA_API_KEY,
    env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, env.SLACK_WEBHOOK_URL,
    env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_USER_ID,
    env.EMAIL_API_URL, env.EMAIL_API_KEY, env.EMAIL_FROM, env.EMAIL_TO,
    env.WEB_PUSH_GATEWAY_URL, env.WEB_PUSH_API_KEY,
  ].filter((value): value is string => Boolean(value));
}

export function log(level: "info" | "warn" | "error", operation: string, fields: Record<string, unknown> = {}, env?: Env): void {
  const secrets = environmentSecrets(env);
  const sanitizedFields = redactSecrets(fields, secrets) as Record<string, unknown>;
  if (typeof sanitizedFields.sourceUrl === "string") sanitizedFields.sourceUrl = sanitizeUrl(sanitizedFields.sourceUrl);
  console.log(JSON.stringify({ level, operation, ...sanitizedFields, timestamp: new Date().toISOString() }));
}

export function logError(operation: string, error: unknown, fields: Record<string, unknown> = {}, env?: Env): void {
  log("error", operation, { ...fields, error: serializeError(error, environmentSecrets(env)) }, env);
}
