export type ResourceType = "asn" | "ipv4" | "ipv6";
export type AllocationStatus = "allocated" | "assigned";

export interface DelegatedRecord {
  registry: "afrinic";
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
  name: null;
  holderId: string;
  date: string;
  status: AllocationStatus;
}

export interface AddressRecord {
  cidr: string;
  holderId: string;
  date: string;
  status: AllocationStatus;
}

export interface DelegatedSnapshot {
  serial: string;
  declaredRecordCount: number;
  records: DelegatedRecord[];
}

export interface DatasetMetadata {
  sourceUrl: string;
  sourceSerial: string;
  countryCode: "NG";
  meaning: string;
  fetchedAt: string;
  counts: { asns: number; ipv4: number; ipv6: number };
}
