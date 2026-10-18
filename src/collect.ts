import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDelegatedStatistics } from "./parsers/delegated-stats";
import { fetchAfrinicStatistics, AFRINIC_STATS_URL } from "./sources/afrinic";
import { fetchRipeNccStatistics, RIPE_NCC_STATS_URL } from "./sources/ripe-ncc";
import { changedFiles, filesMatch, publishFiles } from "./output/publish";
import { renderFiles } from "./output/render";
import { validateResources } from "./validation/resources";
import type { RegistryName, RegistrySource } from "./types/resource";

const SOURCES = [
  {
    registry: "afrinic",
    fetch: fetchAfrinicStatistics,
    sourceUrl: AFRINIC_STATS_URL,
    documentationUrl: "https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt",
    termsUrl: "https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt",
    termsStatus: "AFRINIC permits download and use subject to a no-liability condition; redistribution of derived public lists is not expressly addressed.",
  },
  {
    registry: "ripencc",
    fetch: fetchRipeNccStatistics,
    sourceUrl: RIPE_NCC_STATS_URL,
    documentationUrl: "https://ftp.ripe.net/pub/stats/ripencc/_README-ripe-stats.txt",
    termsUrl: "https://www.ripe.net/about-us/legal/copyright-statement/",
    termsStatus: "RIPE NCC copyright terms restrict third-party reuse of covered materials; applicability to the FTP statistics file and transformed public lists is unresolved.",
  },
] as const;

export async function collectDelegatedData(
  sourceTexts?: Partial<Record<RegistryName, string>>,
  fetchedAt = new Date().toISOString(),
  root = process.cwd(),
): Promise<number> {
  const snapshots = await Promise.all(SOURCES.map(async (source) => {
    const text = sourceTexts?.[source.registry] ?? await source.fetch();
    return parseDelegatedStatistics(text, source.registry);
  }));
  const records = snapshots.flatMap((snapshot) => snapshot.records);
  const resources = validateResources(records);
  const registrySources: RegistrySource[] = snapshots.map((snapshot) => {
    const source = SOURCES.find((candidate) => candidate.registry === snapshot.registry)!;
    return {
      registry: source.registry,
      sourceUrl: source.sourceUrl,
      sourceSerial: snapshot.serial,
      records: snapshot.declaredRecordCount,
      documentationUrl: source.documentationUrl,
      termsUrl: source.termsUrl,
      termsStatus: source.termsStatus,
    };
  });
  const files = renderFiles(resources, registrySources, fetchedAt);
  const dataFiles = new Map([...files].filter(([path]) => path !== "data/metadata.json"));
  if (await filesMatch(dataFiles, root) && await metadataMatches(files.get("data/metadata.json")!, root)) return resources.asns.length;
  await publishFiles(await changedFiles(files, root), root);
  return resources.asns.length;
}

async function metadataMatches(expectedText: string, root: string): Promise<boolean> {
  try {
    const expected = JSON.parse(expectedText) as Record<string, unknown>;
    const actual = JSON.parse(await readFile(resolve(root, "data/metadata.json"), "utf8")) as Record<string, unknown>;
    if (typeof actual.fetchedAt !== "string" || Number.isNaN(Date.parse(actual.fetchedAt))) return false;
    delete actual.fetchedAt;
    delete expected.fetchedAt;
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return false;
  }
}
