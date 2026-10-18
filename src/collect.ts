import { parseDelegatedStatistics } from "./parsers/delegated-stats";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchAfrinicStatistics } from "./sources/afrinic";
import { filesMatch, publishFiles } from "./output/publish";
import { renderFiles } from "./output/render";
import { validateResources } from "./validation/resources";

export async function collectAfrinicData(text?: string, fetchedAt = new Date().toISOString(), root = process.cwd()): Promise<number> {
  const source = text ?? await fetchAfrinicStatistics();
  const snapshot = parseDelegatedStatistics(source);
  const resources = validateResources(snapshot.records);
  const files = renderFiles(resources, snapshot.serial, fetchedAt);
  const dataFiles = new Map([...files].filter(([path]) => path !== "data/metadata.json"));
  if (await filesMatch(dataFiles, root) && await metadataMatches(files.get("data/metadata.json")!, root)) return resources.asns.length;
  await publishFiles(files, root);
  return resources.asns.length;
}

async function metadataMatches(expectedText: string, root: string): Promise<boolean> {
  try {
    const expected = JSON.parse(expectedText) as Record<string, unknown>;
    const actual = JSON.parse(await readFile(resolve(root, "data/metadata.json"), "utf8")) as Record<string, unknown>;
    if (typeof actual.fetchedAt !== "string" || Number.isNaN(Date.parse(actual.fetchedAt))) return false;
    delete actual.fetchedAt;
    delete expected.fetchedAt;
    delete actual.sourceSerial;
    delete expected.sourceSerial;
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return false;
  }
}
