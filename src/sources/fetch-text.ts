import type { RegistryName } from "../types/resource";

const REQUEST_TIMEOUT_MS = 30_000;

export async function fetchDelegatedStatistics(url: string, registry: RegistryName): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "asn-nigeria/2.0 (+https://github.com/shazzark/asn-nigeria)" },
    });
    if (!response.ok) throw new Error(`${registry} returned HTTP ${response.status} ${response.statusText}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/text\//i.test(contentType) && !/octet-stream/i.test(contentType)) {
      throw new Error(`Unexpected ${registry} content type: ${contentType}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`${registry} request timed out after ${REQUEST_TIMEOUT_MS} ms`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
