import { fetchDelegatedStatistics } from "./fetch-text";

export const LACNIC_STATS_URL = "https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest";

export async function fetchLacnicStatistics(url = LACNIC_STATS_URL): Promise<string> {
  return fetchDelegatedStatistics(url, "lacnic");
}
