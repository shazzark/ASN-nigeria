export const SOURCE_URL = "https://bgp.he.net/country/NG";
const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchCountryPage(url = SOURCE_URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "asn-nigeria/1.0 (+https://github.com/shazzark/asn-nigeria)" },
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status} ${response.statusText}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error(`Unexpected source content type: ${contentType || "missing"}`);
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Source request timed out after ${REQUEST_TIMEOUT_MS} ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
