import type { RegistryName } from "../types/resource";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 30_000;

function retryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const requestedMs = Number.isFinite(seconds) && seconds >= 0
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  return Number.isFinite(requestedMs) && requestedMs >= 0
    ? Math.min(requestedMs, MAX_RETRY_AFTER_MS)
    : undefined;
}

function errorMessage(error: unknown, depth = 0): string {
  if (depth > 4) return "cause depth limit reached";
  if (!(error instanceof Error)) return String(error);

  const fields = ["code", "errno", "syscall", "hostname", "address", "port"] as const;
  const detail = fields.flatMap((field) => {
    const value = Reflect.get(error, field);
    return typeof value === "string" || typeof value === "number" ? [`${field}=${value}`] : [];
  }).join(" ");
  const own = [error.name, error.message, detail].filter(Boolean).join(" ");
  const nested: string[] = [];
  if (error.cause !== undefined) nested.push(errorMessage(error.cause, depth + 1));

  const errors = Reflect.get(error, "errors");
  if (Array.isArray(errors)) {
    nested.push(...errors.slice(0, 3).map((item: unknown) => errorMessage(item, depth + 1)));
  }
  return [own, ...nested].filter(Boolean).join(" <- ");
}

export async function fetchDelegatedStatistics(url: string, registry: RegistryName): Promise<string> {
  let lastError: unknown;
  let backoffMs = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let delayBeforeRetryMs = backoffMs;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "asn-nigeria/2.0 (+https://github.com/shazzark/asn-nigeria)" },
      });

      if (!response.ok) {
        const error = new Error(`${registry} returned HTTP ${response.status} ${response.statusText}`);
        if (response.status !== 408 && response.status !== 429 && response.status < 500) {
          await response.body?.cancel().catch(() => undefined);
          throw error;
        }
        lastError = error;
        const serverDelay = retryAfterMs(response.headers.get("retry-after"));
        delayBeforeRetryMs = serverDelay ?? backoffMs;
        await response.body?.cancel().catch(() => undefined);
      } else {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType && !/^text\/plain(?:\s*;|$)/i.test(contentType) && !/^application\/octet-stream(?:\s*;|$)/i.test(contentType)) {
          await response.body?.cancel().catch(() => undefined);
          throw new Error(`Unexpected ${registry} content type: ${contentType}`);
        }
        return await response.text();
      }
    } catch (error) {
      if (error instanceof Error && (error.message.startsWith(`${registry} returned HTTP `) || error.message.startsWith(`Unexpected ${registry} content type:`))) {
        throw error;
      }
      lastError = error instanceof Error && error.name === "AbortError"
        ? new Error(`request timed out after ${REQUEST_TIMEOUT_MS} ms`)
        : error;
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayBeforeRetryMs));
      backoffMs = Math.min(backoffMs * 2, MAX_RETRY_AFTER_MS);
    }
  }

  throw new Error(`${registry} request failed after ${MAX_ATTEMPTS} attempts: ${errorMessage(lastError)}`);
}
