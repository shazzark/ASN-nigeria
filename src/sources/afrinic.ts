import { fetchDelegatedStatistics } from "./fetch-text";

export const AFRINIC_STATS_URL = "https://ftp.afrinic.net/stats/afrinic/delegated-afrinic-extended-latest";

export async function fetchAfrinicStatistics(url = AFRINIC_STATS_URL): Promise<string> {
  return fetchDelegatedStatistics(url, "afrinic");
}
