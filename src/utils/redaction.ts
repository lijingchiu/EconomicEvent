const SECRET_KEYS = /^(authorization|cookie|set-cookie|x-api-key|api[_-]?key|token|secret|password)$/i;

export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_KEYS.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

export function redactSecrets(value: unknown, secrets: string[] = []): unknown {
  if (typeof value === "string") {
    return secrets.reduce((result, secret) => secret ? result.split(secret).join("[REDACTED]") : result, value);
  }
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, secrets));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEYS.test(key) ? "[REDACTED]" : redactSecrets(item, secrets),
    ]));
  }
  return value;
}

export function serializeError(error: unknown, secrets: string[] = []): Record<string, unknown> {
  const raw = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };
  return redactSecrets(raw, secrets) as Record<string, unknown>;
}
