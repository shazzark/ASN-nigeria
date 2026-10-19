import { fetchDelegatedStatistics } from "./fetch-text";

export const APNIC_STATS_URL = "https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest";

export async function fetchApnicStatistics(url = APNIC_STATS_URL): Promise<string> {
  return fetchDelegatedStatistics(url, "apnic");
}
