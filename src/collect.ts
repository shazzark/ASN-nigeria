import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseDelegatedStatistics } from "./parsers/delegated-stats";
import { fetchAfrinicStatistics, AFRINIC_STATS_URL } from "./sources/afrinic";
import { fetchApnicStatistics, APNIC_STATS_URL } from "./sources/apnic";
import { changedFiles, filesMatch, publishFiles } from "./output/publish";
import { renderFiles } from "./output/render";
import { validateResources } from "./validation/resources";
import type { RegistryName, RegistrySource } from "./types/resource";
import type { DbipRelease } from "./sources/dbip";
import { fetchDbipRelease } from "./sources/dbip";
import { parseCsv, parseDbipAsnCsv, parseDbipCountryCsv } from "./parsers/dbip";
import { validateCountryIp } from "./validation/country-ip";
import { renderCountryIpFiles } from "./output/render-country-ip";
import type { CountryIpDataset } from "./types/country-ip";

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
  {
    registry: "apnic",
    fetch: fetchApnicStatistics,
    sourceUrl: APNIC_STATS_URL,
    documentationUrl: "https://ftp.apnic.net/stats/apnic/README-EXTENDED.TXT",
    termsUrl: "https://ftp.apnic.net/stats/apnic/README-EXTENDED.TXT",
    termsStatus: "APNIC's official extended-statistics README says the files are freely available for download and use, subject to a no-liability condition. The report is not an authoritative statement of present resource use or physical location.",
    attribution: "Source: APNIC extended allocation and assignment statistics. See the linked APNIC README and its no-liability condition.",
  },
] as const;

export async function collectDelegatedData(
  sourceTexts?: Partial<Record<RegistryName, string>>,
  fetchedAt = new Date().toISOString(),
  root = process.cwd(),
): Promise<number> {
  const { resources, sources } = await prepareAllocations(sourceTexts);
  const files = renderFiles(resources, sources, fetchedAt);
  await publishIfChanged(files, ["data/metadata.json"], root);
  return resources.asns.length;
}

interface PreparedAllocations {
  resources: ReturnType<typeof validateResources>;
  sources: RegistrySource[];
}

async function prepareAllocations(sourceTexts: Partial<Record<RegistryName, string>> | undefined): Promise<PreparedAllocations> {
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
      selectedNgRecords: snapshot.records.length,
      documentationUrl: source.documentationUrl,
      termsUrl: source.termsUrl,
      termsStatus: source.termsStatus,
      attribution: source.attribution,
    };
  });
  return { resources, sources: registrySources };
}

export interface CountryIpFixture {
  countryCsv: string;
  asnCsv: string;
  countryRelease: DbipRelease;
  asnRelease: DbipRelease;
}

export interface CompleteCollectionOptions {
  sourceTexts?: Partial<Record<RegistryName, string>>;
  countryIp?: CountryIpFixture;
  fetchedAt?: string;
  root?: string;
}

async function fetchCountryIpDataset(): Promise<CountryIpFixture> {
  const [country, asn] = await Promise.all([fetchDbipRelease("country"), fetchDbipRelease("asn")]);
  if (country.release.releaseMonth !== asn.release.releaseMonth) {
    throw new Error(`DB-IP release mismatch: country ${country.release.releaseMonth}, ASN ${asn.release.releaseMonth}`);
  }
  return {
    countryCsv: country.text,
    asnCsv: asn.text,
    countryRelease: country.release,
    asnRelease: asn.release,
  };
}

function prepareCountryIp(fixture: CountryIpFixture): CountryIpDataset {
  if (fixture.countryRelease.kind !== "country" || fixture.asnRelease.kind !== "asn") throw new Error("DB-IP source provenance has mismatched dataset types");
  if (fixture.countryRelease.releaseMonth !== fixture.asnRelease.releaseMonth) throw new Error("DB-IP country and ASN datasets are from different monthly releases");
  if (fixture.countryRelease.expectedRows !== parseCsv(fixture.countryCsv, "DB-IP country").length
    || fixture.asnRelease.expectedRows !== parseCsv(fixture.asnCsv, "DB-IP ASN").length) {
    throw new Error("DB-IP source record count does not match release provenance");
  }
  const countryRanges = parseDbipCountryCsv(fixture.countryCsv);
  const asnRanges = parseDbipAsnCsv(fixture.asnCsv);
  const validated = validateCountryIp(countryRanges, asnRanges);
  return {
    ...validated,
    countryRangesCount: fixture.countryRelease.expectedRows,
    asnRangesCount: fixture.asnRelease.expectedRows,
    releaseMonth: fixture.countryRelease.releaseMonth,
    sourceCountry: fixture.countryRelease,
    sourceAsn: fixture.asnRelease,
  };
}

function enrichRegistryNames(resources: PreparedAllocations["resources"], fixture: CountryIpFixture): void {
  const counts = new Map<number, Map<string, number>>();
  for (const range of parseDbipAsnCsv(fixture.asnCsv)) {
    const names = counts.get(range.asn) ?? new Map<string, number>();
    for (const organization of range.organizations) {
      names.set(organization, (names.get(organization) ?? 0) + 1);
    }
    counts.set(range.asn, names);
  }
  for (const record of resources.asns) {
    const candidates = [...(counts.get(record.asn) ?? [])]
      .map(([name, records]) => ({ name, records }))
      .sort((left, right) => right.records - left.records || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
    const selected = candidates[0];
    if (!selected) continue;
    record.name = selected.name;
    record.nameSource = {
      provider: "DB-IP IP to ASN Lite",
      releaseMonth: fixture.asnRelease.releaseMonth,
      selectedBy: "most-frequent; lexical tie-break",
      candidates,
    };
  }
}

export async function collectCompleteData(options: CompleteCollectionOptions = {}): Promise<{ allocationAsns: number; countryAsns: number }> {
  const fetchedAt = options.fetchedAt ?? new Date().toISOString();
  const root = options.root ?? process.cwd();
  const [allocations, countryFixture] = await Promise.all([
    prepareAllocations(options.sourceTexts),
    options.countryIp ? Promise.resolve(options.countryIp) : fetchCountryIpDataset(),
  ]);
  const countryIp = prepareCountryIp(countryFixture);
  enrichRegistryNames(allocations.resources, countryFixture);
  const allocationFiles = renderFiles(allocations.resources, allocations.sources, fetchedAt);
  const countryIpFiles = renderCountryIpFiles(countryIp, allocations.resources.asns.map(({ asn }) => asn), fetchedAt);
  const files = new Map([...allocationFiles, ...countryIpFiles]);
  await publishIfChanged(files, ["data/metadata.json", "data/country-ip/metadata.json"], root);
  return { allocationAsns: allocations.resources.asns.length, countryAsns: countryIp.asns.length };
}

async function publishIfChanged(files: Map<string, string>, metadataPaths: readonly string[], root: string): Promise<void> {
  const metadata = new Set(metadataPaths);
  const dataFiles = new Map([...files].filter(([path]) => !metadata.has(path)));
  if (await filesMatch(dataFiles, root)) {
    let metadataUnchanged = true;
    for (const path of metadataPaths) {
      const expected = files.get(path);
      if (expected === undefined || !(await metadataMatches(expected, root, path))) { metadataUnchanged = false; break; }
    }
    if (metadataUnchanged) return;
  }
  await publishFiles(await changedFiles(files, root), root);
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
