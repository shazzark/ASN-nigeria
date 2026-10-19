export type ResourceType = "asn" | "ipv4" | "ipv6";
export type AllocationStatus = "allocated" | "assigned";
export type RegistryName = "afrinic" | "apnic" | "arin" | "lacnic" | "ripencc";

export interface ResourceClaim {
  registry: RegistryName;
  holderId: string;
  date: string;
  status: AllocationStatus;
}

export interface RegistrySource {
  registry: RegistryName;
  sourceUrl: string;
  sourceSerial: string;
  records: number;
  selectedNgRecords: number;
  documentationUrl: string;
  termsUrl: string;
  termsStatus: string;
  attribution: string;
}

export interface DelegatedRecord {
  registry: RegistryName;
  countryCode: string;
  type: ResourceType;
  start: string;
  value: string;
  date: string;
  status: string;
  holderId: string;
}

export interface AsnRecord {
  asn: number;
  name: string | null;
  nameSource: null | {
    provider: "DB-IP IP to ASN Lite";
    releaseMonth: string;
    selectedBy: "most-frequent; lexical tie-break";
    candidates: Array<{ name: string; records: number }>;
  };
  claims: ResourceClaim[];
}

export interface AddressRecord {
  cidr: string;
  claims: ResourceClaim[];
}

export interface DelegatedSnapshot {
  registry: RegistryName;
  serial: string;
  declaredRecordCount: number;
  records: DelegatedRecord[];
}

export interface DatasetMetadata {
  sources: RegistrySource[];
  countryCode: "NG";
  meaning: string;
  fetchedAt: string;
  counts: { asns: number; ipv4: number; ipv6: number };
  crossRegistryDuplicates: { asns: number; prefixes: number };
  crossRegistryConflicts: Array<{ resource: string; registries: RegistryName[]; fields: string[] }>;
  crossRegistryOverlaps: Array<{ first: string; second: string; registries: RegistryName[] }>;
}
