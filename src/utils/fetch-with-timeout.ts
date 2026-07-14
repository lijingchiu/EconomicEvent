export class FetchError extends Error {
  constructor(message: string, public readonly retryable = true) {
    super(message);
    this.name = "FetchError";
  }
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return response;
  } catch (error) {
    if (controller.signal.aborted) throw new FetchError(`request timed out after ${timeoutMs}ms`, true);
    throw new FetchError(error instanceof Error ? error.message : "network request failed", true);
  } finally {
    clearTimeout(timer);
  }
}

export async function readBodyWithLimit(response: Response, maxBytes = 1_500_000): Promise<string> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new FetchError("response body exceeds configured limit", false);
  const reader = response.body?.getReader();
  if (!reader) return response.text();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new FetchError("response body exceeds configured limit", false);
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}
