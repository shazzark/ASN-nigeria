import { fetchDelegatedStatistics } from "./fetch-text";

export const RIPE_NCC_STATS_URL = "https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest";

export async function fetchRipeNccStatistics(url = RIPE_NCC_STATS_URL): Promise<string> {
  return fetchDelegatedStatistics(url, "ripencc");
}
