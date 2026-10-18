import type { AddressRecord, DatasetMetadata, RegistrySource } from "../types/resource";
import type { ValidatedResources } from "../validation/resources";

function lines(values: readonly string[]): string { return `${values.join("\n")}\n`; }
function rules(type: "IP-CIDR" | "IP-CIDR6", records: readonly AddressRecord[]): string[] {
  return records.map(({ cidr }) => `${type},${cidr}`);
}

export function renderFiles(resources: ValidatedResources, sources: RegistrySource[], fetchedAt: string): Map<string, string> {
  const ipv4 = resources.ipv4.map(({ cidr }) => cidr);
  const ipv6 = resources.ipv6.map(({ cidr }) => cidr);
  const asns = resources.asns.map(({ asn }) => asn);
  const surgeV4 = rules("IP-CIDR", resources.ipv4);
  const surgeV6 = rules("IP-CIDR6", resources.ipv6);
  const surgeAsn = asns.map((asn) => `IP-ASN,${asn}`);
  const qxV4 = resources.ipv4.map(({ cidr }) => `ip-cidr, ${cidr}, direct`);
  const qxV6 = resources.ipv6.map(({ cidr }) => `ip6-cidr, ${cidr}, direct`);
  const qxAsn = asns.map((asn) => `ip-asn, ${asn}, direct`);
  const metadata: DatasetMetadata = {
    sources,
    countryCode: "NG",
    meaning: "AFRINIC and RIPE NCC registry allocations and assignments to resource holders with country code NG; these records are not observed BGP routes and do not identify physical IP location.",
    fetchedAt,
    counts: { asns: asns.length, ipv4: ipv4.length, ipv6: ipv6.length },
    crossRegistryDuplicates: resources.crossRegistryDuplicates,
    crossRegistryConflicts: resources.crossRegistryConflicts,
    crossRegistryOverlaps: resources.crossRegistryOverlaps,
  };
  return new Map([
    ["data/ASN.Nigeria.list", lines(surgeAsn)],
    ["data/asns.txt", lines(asns.map(String))],
    ["data/IPv4.Nigeria.list", lines(ipv4)],
    ["data/IPv6.Nigeria.list", lines(ipv6)],
    ["data/IP.Nigeria.list", lines([...ipv4, ...ipv6])],
    ["data/networks.json", `${JSON.stringify(resources.asns, null, 2)}\n`],
    ["data/resources.json", `${JSON.stringify({ ipv4: resources.ipv4, ipv6: resources.ipv6 }, null, 2)}\n`],
    ["data/metadata.json", `${JSON.stringify(metadata, null, 2)}\n`],
    ["data/surge/ASN.Nigeria.list", lines(surgeAsn)],
    ["data/surge/IPv4.Nigeria.list", lines(surgeV4)],
    ["data/surge/IPv6.Nigeria.list", lines(surgeV6)],
    ["data/surge/IP.Nigeria.list", lines([...surgeV4, ...surgeV6])],
    ["data/quantumult-x/ASN.Nigeria.list", lines(qxAsn)],
    ["data/quantumult-x/IPv4.Nigeria.list", lines(qxV4)],
    ["data/quantumult-x/IPv6.Nigeria.list", lines(qxV6)],
    ["data/quantumult-x/IP.Nigeria.list", lines([...qxV4, ...qxV6])],
  ]);
}
