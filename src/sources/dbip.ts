import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { fetchSourceBuffer } from "./fetch-text";

const RELEASE_PAGE_URLS = {
  country: "https://db-ip.com/db/download/ip-to-country-lite",
  asn: "https://db-ip.com/db/download/ip-to-asn-lite",
} as const;
const MAX_COMPRESSED_BYTES = 16 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export interface DbipRelease {
  kind: "country" | "asn";
  releaseMonth: string;
  expectedRows: number;
  sha1: string;
  pageUrl: string;
  downloadUrl: string;
}

export interface DbipCsv {
  release: DbipRelease;
  text: string;
}

export function parseDbipReleasePage(html: string, kind: "country" | "asn"): DbipRelease {
  const card = html.match(/<dl class="card-body">([\s\S]*?)<\/dl>/i)?.[1];
  if (!card) throw new Error(`DB-IP ${kind} release page has no CSV metadata table`);
  const value = (field: string): string => {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = card.match(new RegExp(`<dt>${escaped}<\\/dt>\\s*<dd(?:\\s+class="[^"]*")?>([^<]+)<\\/dd>`, "i"))?.[1]?.trim();
    if (!found) throw new Error(`DB-IP ${kind} release page is missing ${field}`);
    return found;
  };
  if (value("Format") !== "CSV") throw new Error(`DB-IP ${kind} release page does not list CSV first`);
  const releaseText = value("Release");
  const match = releaseText.match(/^([A-Z][a-z]+) (\d{4})$/);
  const monthIndex = match ? MONTHS.indexOf(match[1]!) : -1;
  if (monthIndex < 0) throw new Error(`DB-IP ${kind} release has an unexpected date: ${releaseText}`);
  const releaseMonth = `${match![2]}-${String(monthIndex + 1).padStart(2, "0")}`;
  const expectedRowsText = value("Number of records").replaceAll(",", "");
  const expectedRows = Number(expectedRowsText);
  if (!/^\d+$/.test(expectedRowsText) || !Number.isSafeInteger(expectedRows) || expectedRows < 1) throw new Error(`DB-IP ${kind} release has an invalid record count`);
  const sha1 = value("SHA1SUM").toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(sha1)) throw new Error(`DB-IP ${kind} release has an invalid SHA-1 checksum`);
  const artifact = kind === "asn" ? "asn" : "country";
  return {
    kind,
    releaseMonth,
    expectedRows,
    sha1,
    pageUrl: RELEASE_PAGE_URLS[kind],
    downloadUrl: `https://download.db-ip.com/free/dbip-${artifact}-lite-${releaseMonth}.csv.gz`,
  };
}

export async function fetchDbipRelease(kind: "country" | "asn"): Promise<DbipCsv> {
  const page = await fetchSourceBuffer(RELEASE_PAGE_URLS[kind], `DB-IP ${kind} release page`, 2 * 1024 * 1024, [/^text\/html(?:\s*;|$)/i]);
  const release = parseDbipReleasePage(page.toString("utf8"), kind);
  const compressed = await fetchSourceBuffer(release.downloadUrl, `DB-IP ${kind} Lite download`, MAX_COMPRESSED_BYTES, [
    /^application\/octet-stream(?:\s*;|$)/i,
    /^application\/(?:x-)?gzip(?:\s*;|$)/i,
    /^text\/csv(?:\s*;|$)/i,
  ]);
  let expanded: Buffer;
  try { expanded = gunzipSync(compressed, { maxOutputLength: MAX_EXPANDED_BYTES }); }
  catch (error) { throw new Error(`DB-IP ${kind} download is not a valid bounded gzip file`, { cause: error }); }
  const actualSha1 = createHash("sha1").update(expanded).digest("hex");
  if (actualSha1 !== release.sha1) throw new Error(`DB-IP ${kind} CSV checksum mismatch for ${release.releaseMonth}`);
  const text = expanded.toString("utf8");
  if (text.includes("\uFFFD")) throw new Error(`DB-IP ${kind} CSV is not valid UTF-8`);
  return { release, text };
}
