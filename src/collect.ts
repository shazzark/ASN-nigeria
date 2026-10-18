import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCountryNetworks } from "./parsers/country-table";
import { filesMatch, publishFiles } from "./output/publish";
import { renderFiles } from "./output/render";
import { normalizeNetworks } from "./validation/networks";

export async function collectFromHtml(html: string, fetchedAt = new Date().toISOString(), root = process.cwd()): Promise<number> {
  const networks = normalizeNetworks(parseCountryNetworks(html));
  const files = renderFiles(networks, fetchedAt);
  const dataFiles = new Map([...files].filter(([path]) => path !== "data/metadata.json"));
  if (await filesMatch(dataFiles, root)) {
    try {
      const metadata = JSON.parse(await readFile(resolve(root, "data/metadata.json"), "utf8")) as unknown;
      if (isMetadataFor(metadata, networks.length)) return networks.length;
    } catch {
      // Missing or malformed metadata is repaired along with the data files.
    }
  }
  await publishFiles(files, root);
  return networks.length;
}

function isMetadataFor(value: unknown, count: number): boolean {
  if (typeof value !== "object" || value === null) return false;
  const metadata = value as Record<string, unknown>;
  return metadata.sourceUrl === "https://bgp.he.net/country/NG"
    && metadata.countryCode === "NG"
    && metadata.count === count
    && typeof metadata.fetchedAt === "string"
    && !Number.isNaN(Date.parse(metadata.fetchedAt));
}
