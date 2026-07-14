import type { AppConfig, Env, ProviderFetchResult, ProviderName } from "../types";
import { BlsProvider } from "./bls";
import { BeaProvider } from "./bea";
import { FederalReserveProvider } from "./federal-reserve";
import { EiaProvider } from "./eia";
import { CensusProvider } from "./census";
import { IsmProvider } from "./ism";
import { UmichProvider } from "./umich";

export interface EconomicCalendarProvider {
  readonly name: ProviderName;
  readonly sourceUrl: string;
  fetchEvents(range: { fromUtc: Date; toUtc: Date }, env: Env, config?: AppConfig): Promise<ProviderFetchResult>;
}

export function createProviders(): EconomicCalendarProvider[] { return [new BlsProvider(), new BeaProvider(), new FederalReserveProvider(), new EiaProvider(), new CensusProvider(), new IsmProvider(), new UmichProvider()]; }
