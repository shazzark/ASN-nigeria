import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDelegatedStatistics } from "./parsers/delegated-stats";
import { fetchAfrinicStatistics, AFRINIC_STATS_URL } from "./sources/afrinic";
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
    termsStatus: "The source notice says files are freely available for download and use subject to a no-liability condition. It does not expressly address transformed public lists; publishing them here is the project's interpretation, not official confirmation.",
    attribution: "Source: AFRINIC extended delegated statistics. See the linked statistics README; AFRINIC disclaims liability for loss or damage from use of report information.",
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
      attribution: source.attribution,
    };
  });
  const files = renderFiles(resources, registrySources, fetchedAt);
  const metadataPath = "data/metadata.json";
  const dataFiles = new Map([...files].filter(([path]) => path !== metadataPath));
  if (await filesMatch(dataFiles, root) && await metadataMatches(files.get(metadataPath)!, root, metadataPath)) return resources.asns.length;
  await publishFiles(await changedFiles(files, root), root);
  return resources.asns.length;
}

async function metadataMatches(expectedText: string, root: string, path: string): Promise<boolean> {
  try {
    const expected = JSON.parse(expectedText) as Record<string, unknown>;
    const actual = JSON.parse(await readFile(resolve(root, path), "utf8")) as Record<string, unknown>;
    if (typeof actual.fetchedAt !== "string" || Number.isNaN(Date.parse(actual.fetchedAt))) return false;
    delete actual.fetchedAt;
    delete expected.fetchedAt;
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return false;
  }
}
