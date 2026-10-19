import type { AddressRecord, DatasetMetadata, RegistrySource } from "../types/resource";
import type { ValidatedResources } from "../validation/resources";

function lines(values: readonly string[], comment?: string): string { return `${comment ? `# ${comment}\n` : ""}${values.join("\n")}\n`; }
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
  const registryNames: Record<RegistrySource["registry"], string> = {
    afrinic: "AFRINIC", apnic: "APNIC", arin: "ARIN", lacnic: "LACNIC", ripencc: "RIPE NCC",
  };
  const names = sources.map(({ registry }) => registryNames[registry]);
  const sourceList = names.length < 2 ? names[0] ?? "registry" : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const sourceComment = `Source: ${sourceList} NG-coded registry records; see metadata.json.`;
  const metadata: DatasetMetadata = {
    sources,
    countryCode: "NG",
    meaning: `${sourceList} registry allocations and assignments recorded with country code NG; these records are not observed BGP routes and do not identify physical IP location.`,
    fetchedAt,
    counts: { asns: asns.length, ipv4: ipv4.length, ipv6: ipv6.length },
    crossRegistryDuplicates: resources.crossRegistryDuplicates,
    crossRegistryConflicts: resources.crossRegistryConflicts,
    crossRegistryOverlaps: resources.crossRegistryOverlaps,
  };
  const output = (path: string) => `data/${path}`;
  return new Map([
    [output("ASN.Nigeria.list"), lines(surgeAsn, sourceComment)],
    [output("asns.txt"), lines(asns.map(String))],
    [output("IPv4.Nigeria.list"), lines(ipv4)],
    [output("IPv6.Nigeria.list"), lines(ipv6)],
    [output("IP.Nigeria.list"), lines([...ipv4, ...ipv6])],
    [output("networks.json"), `${JSON.stringify(resources.asns, null, 2)}\n`],
    [output("resources.json"), `${JSON.stringify({ ipv4: resources.ipv4, ipv6: resources.ipv6 }, null, 2)}\n`],
    [output("metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`],
    [output("surge/ASN.Nigeria.list"), lines(surgeAsn, sourceComment)],
    [output("surge/IPv4.Nigeria.list"), lines(surgeV4, sourceComment)],
    [output("surge/IPv6.Nigeria.list"), lines(surgeV6, sourceComment)],
    [output("surge/IP.Nigeria.list"), lines([...surgeV4, ...surgeV6], sourceComment)],
    [output("quantumult-x/ASN.Nigeria.list"), lines(qxAsn, sourceComment)],
    [output("quantumult-x/IPv4.Nigeria.list"), lines(qxV4, sourceComment)],
    [output("quantumult-x/IPv6.Nigeria.list"), lines(qxV6, sourceComment)],
    [output("quantumult-x/IP.Nigeria.list"), lines([...qxV4, ...qxV6], sourceComment)],
  ]);
}
