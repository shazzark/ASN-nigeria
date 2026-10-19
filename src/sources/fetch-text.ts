import https from "node:https";
import type { IncomingMessage } from "node:http";
import type { RegistryName } from "../types/resource";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 30_000;
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const USER_AGENT = "asn-nigeria/2.0 (+https://github.com/shazzark/asn-nigeria)";

interface SourceResponse {
  status: number;
  statusText: string;
  contentType: string | null;
  retryAfter: string | null;
  text: string;
}

type RequestSource = (url: string, signal: AbortSignal) => Promise<SourceResponse>;

class SourceProtocolError extends Error {}

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
  if (Array.isArray(errors)) nested.push(...errors.slice(0, 3).map((item: unknown) => errorMessage(item, depth + 1)));
  return [own, ...nested].filter(Boolean).join(" <- ");
}

function readResponseText(response: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let byteLength = 0;
    response.setEncoding("utf8");
    response.on("data", (chunk: string) => {
      byteLength += Buffer.byteLength(chunk);
      if (byteLength > MAX_RESPONSE_BYTES) {
        response.destroy(new Error(`Source response exceeded ${MAX_RESPONSE_BYTES} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(chunks.join("")));
    response.on("error", reject);
  });
}

function openHttpsResponse(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      family: 4,
      signal,
      headers: { "User-Agent": USER_AGENT },
    }, resolve);
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error(`HTTPS request timed out after ${REQUEST_TIMEOUT_MS} ms`)));
    request.once("error", reject);
  });
}

async function requestSource(url: string, signal: AbortSignal): Promise<SourceResponse> {
  let currentUrl = new URL(url);
  if (currentUrl.protocol !== "https:") throw new SourceProtocolError(`Refusing non-HTTPS source URL: ${currentUrl.protocol}`);
  if (currentUrl.username || currentUrl.password) throw new SourceProtocolError("Refusing source URL containing credentials");
  const sourceOrigin = currentUrl.origin;
  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await openHttpsResponse(currentUrl, signal);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;

    if ([301, 302, 303, 307, 308].includes(status)) {
      response.destroy();
      if (typeof location !== "string") throw new SourceProtocolError(`Source returned HTTP ${status} without a redirect location`);
      if (redirectCount >= MAX_REDIRECTS) throw new SourceProtocolError(`Source exceeded the ${MAX_REDIRECTS}-redirect limit`);
      currentUrl = new URL(location, currentUrl);
      if (currentUrl.protocol !== "https:") throw new SourceProtocolError(`Refusing non-HTTPS redirect: ${currentUrl.protocol}`);
      if (currentUrl.username || currentUrl.password) throw new SourceProtocolError("Refusing redirect URL containing credentials");
      if (currentUrl.origin !== sourceOrigin) throw new SourceProtocolError(`Refusing cross-origin source redirect to ${currentUrl.origin}`);
      continue;
    }

    const text = await readResponseText(response);
    return {
      status,
      statusText: response.statusMessage ?? "",
      contentType: typeof response.headers["content-type"] === "string" ? response.headers["content-type"] : null,
      retryAfter: typeof response.headers["retry-after"] === "string" ? response.headers["retry-after"] : null,
      text,
    };
  }
}

export async function fetchDelegatedStatistics(
  url: string,
  registry: RegistryName,
  request: RequestSource = requestSource,
): Promise<string> {
  let lastError: unknown;
  let backoffMs = 500;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let delayBeforeRetryMs = backoffMs;
    try {
      const response = await request(url, controller.signal);
      if (response.status < 200 || response.status >= 300) {
        const error = new Error(`${registry} returned HTTP ${response.status} ${response.statusText}`);
        if (response.status !== 408 && response.status !== 429 && response.status < 500) throw error;
        lastError = error;
        delayBeforeRetryMs = retryAfterMs(response.retryAfter) ?? backoffMs;
      } else {
        if (response.contentType && !/^text\/plain(?:\s*;|$)/i.test(response.contentType) && !/^application\/octet-stream(?:\s*;|$)/i.test(response.contentType)) {
          throw new Error(`Unexpected ${registry} content type: ${response.contentType}`);
        }
        return response.text;
      }
    } catch (error) {
      if (error instanceof SourceProtocolError) throw error;
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
