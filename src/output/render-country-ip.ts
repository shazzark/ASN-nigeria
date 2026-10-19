import type { CountryIpMetadata, CountryIpDataset } from "../types/country-ip";

const DBIP_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const DBIP_ATTRIBUTION = "DB-IP.com IP to Country Lite and IP to ASN Lite; CC BY 4.0. Filtered to NG, inclusive ranges converted to minimal CIDR blocks, and reformatted for proxy clients.";
const DBIP_TERMS_STATUS = "The official Lite download pages license the free datasets under CC BY 4.0 and require attribution. DB-IP terms state paid-database redistribution restrictions do not apply to these free CC BY 4.0 downloads; this output includes attribution and a change notice.";

function lines(values: readonly string[], comment?: string): string { return `${comment ? `# ${comment}\n` : ""}${values.join("\n")}\n`; }

export function renderCountryIpFiles(
  dataset: CountryIpDataset,
  allocationAsns: readonly number[],
  fetchedAt: string,
): Map<string, string> {
  const asns = dataset.asns.map(({ asn }) => asn);
  const asnOverlap = asns.filter((asn) => allocationAsns.includes(asn));
  const metadata: CountryIpMetadata = {
    countryCode: "NG",
    meaning: "DB-IP Lite's country-geolocation classification of IP ranges as NG. Coverage is limited to its Lite dataset and does not mean registry allocation, current BGP announcement, or physical location is guaranteed.",
    fetchedAt,
    releaseMonth: dataset.releaseMonth,
    records: {
      sourceCountryRows: dataset.countryRangesCount,
      sourceAsnRows: dataset.asnRangesCount,
      ipv4Ranges: dataset.ipv4Ranges.length,
      ipv6Ranges: dataset.ipv6Ranges.length,
      ipv4Cidrs: dataset.ipv4.length,
      ipv6Cidrs: dataset.ipv6.length,
      associatedAsns: asns.length,
    },
    asnClassification: "An ASN is listed when DB-IP ASN Lite maps at least one address overlapping a DB-IP country-Lite NG range to that ASN. This is an address-to-ASN association, not an RIR country assignment.",
    asnOrganizationNames: "DB-IP ASN Lite organization labels are retained as published. They do not establish Nigerian registration; empty labels stay null. All labels for each associated ASN are preserved in resources.json.",
    asnAssociationOverlapsWithRegistryAllocations: asnOverlap,
    sources: {
      country: { ...dataset.sourceCountry, termsUrl: DBIP_LICENSE_URL, termsStatus: DBIP_TERMS_STATUS, attribution: DBIP_ATTRIBUTION },
      asn: { ...dataset.sourceAsn, termsUrl: DBIP_LICENSE_URL, termsStatus: DBIP_TERMS_STATUS, attribution: DBIP_ATTRIBUTION },
    },
  };
  const root = "data/country-ip/";
  const v4 = dataset.ipv4;
  const v6 = dataset.ipv6;
  const surgeV4 = v4.map((cidr) => `IP-CIDR,${cidr}`);
  const surgeV6 = v6.map((cidr) => `IP-CIDR6,${cidr}`);
  const surgeAsn = asns.map((asn) => `IP-ASN,${asn}`);
  const qxV4 = v4.map((cidr) => `ip-cidr, ${cidr}, direct`);
  const qxV6 = v6.map((cidr) => `ip6-cidr, ${cidr}, direct`);
  const qxAsn = asns.map((asn) => `ip-asn, ${asn}, direct`);
  return new Map([
    [`${root}ASN.Nigeria.list`, lines(surgeAsn, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}asns.txt`, lines(asns.map(String))],
    [`${root}IPv4.Nigeria.list`, lines(v4)],
    [`${root}IPv6.Nigeria.list`, lines(v6)],
    [`${root}IP.Nigeria.list`, lines([...v4, ...v6])],
    [`${root}resources.json`, `${JSON.stringify({ ipv4: dataset.ipv4Ranges, ipv6: dataset.ipv6Ranges, asns: dataset.asns }, null, 2)}\n`],
    [`${root}metadata.json`, `${JSON.stringify(metadata, null, 2)}\n`],
    [`${root}surge/ASN.Nigeria.list`, lines(surgeAsn, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}surge/IPv4.Nigeria.list`, lines(surgeV4, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}surge/IPv6.Nigeria.list`, lines(surgeV6, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}surge/IP.Nigeria.list`, lines([...surgeV4, ...surgeV6], "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}quantumult-x/ASN.Nigeria.list`, lines(qxAsn, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}quantumult-x/IPv4.Nigeria.list`, lines(qxV4, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}quantumult-x/IPv6.Nigeria.list`, lines(qxV6, "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
    [`${root}quantumult-x/IP.Nigeria.list`, lines([...qxV4, ...qxV6], "Source: DB-IP Lite NG geolocation classification; see metadata.json.")],
  ]);
}
