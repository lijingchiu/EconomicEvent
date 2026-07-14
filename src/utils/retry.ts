export type RetryPolicy = { attempts?: number; baseDelayMs?: number; maxDelayMs?: number };

export async function retry<T>(operation: (attempt: number) => Promise<T>, shouldRetry: (error: unknown) => boolean, policy: RetryPolicy = {}): Promise<T> {
  const attempts = policy.attempts ?? 3;
  const base = policy.baseDelayMs ?? 250;
  const max = policy.maxDelayMs ?? 5_000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      const jitter = Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, Math.min(max, base * (2 ** (attempt - 1))) + jitter));
    }
  }
  throw lastError;
}
