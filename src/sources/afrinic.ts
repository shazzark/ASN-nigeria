export const AFRINIC_STATS_URL = "https://ftp.afrinic.net/stats/afrinic/delegated-afrinic-extended-latest";
const REQUEST_TIMEOUT_MS = 30_000;

export async function fetchAfrinicStatistics(url = AFRINIC_STATS_URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "asn-nigeria/2.0 (+https://github.com/shazzark/asn-nigeria)" },
    });
    if (!response.ok) throw new Error(`AFRINIC returned HTTP ${response.status} ${response.statusText}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
      throw new Error(`Unexpected AFRINIC content type: ${contentType}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`AFRINIC request timed out after ${REQUEST_TIMEOUT_MS} ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
