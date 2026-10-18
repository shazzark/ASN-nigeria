import type { DatasetMetadata, NetworkRecord } from "../types/network";

export function renderFiles(networks: readonly NetworkRecord[], fetchedAt: string): Map<string, string> {
  const metadata: DatasetMetadata = { sourceUrl: "https://bgp.he.net/country/NG", countryCode: "NG", count: networks.length, fetchedAt };
  return new Map([
    ["data/ASN.Nigeria.list", `${networks.map(({ asn }) => `IP-ASN,${asn}`).join("\n")}\n`],
    ["data/asns.txt", `${networks.map(({ asn }) => asn).join("\n")}\n`],
    ["data/networks.json", `${JSON.stringify(networks, null, 2)}\n`],
    ["data/metadata.json", `${JSON.stringify(metadata, null, 2)}\n`],
  ]);
}
