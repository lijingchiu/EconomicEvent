import type { ProviderName } from "../types";
import { sha256Hex } from "../utils/crypto";

export async function deterministicEventId(provider: ProviderName, providerEventId: string | undefined, normalizedName: string, eventTimeUtc: string, sourceUrl: string): Promise<string> {
  const identity = providerEventId ? `${provider}|provider-id|${providerEventId}` : `${provider}|${normalizedName}|${eventTimeUtc}|${sourceUrl}`;
  return `${provider}_${(await sha256Hex(identity)).slice(0, 40)}`;
}

export async function rawEventHash(value: unknown): Promise<string> { return sha256Hex(JSON.stringify(value)); }
