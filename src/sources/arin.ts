import { fetchDelegatedStatistics } from "./fetch-text";

export const ARIN_STATS_URL = "https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest";

export async function fetchArinStatistics(url = ARIN_STATS_URL): Promise<string> {
  return fetchDelegatedStatistics(url, "arin");
}
