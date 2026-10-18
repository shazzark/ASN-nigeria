import type { AddressRecord, AsnRecord, DelegatedRecord } from "../types/resource";
import { ipv4RangeToCidrs, ipv6PrefixToCidr, sortCidrs } from "./ip";

export interface ValidatedResources { asns: AsnRecord[]; ipv4: AddressRecord[]; ipv6: AddressRecord[] }

export function validateResources(records: readonly DelegatedRecord[]): ValidatedResources {
  const asns = new Map<number, AsnRecord>();
  const ipv4 = new Map<string, AddressRecord>();
  const ipv6 = new Map<string, AddressRecord>();
  for (const record of records) {
    if (record.countryCode !== "NG" || (record.status !== "allocated" && record.status !== "assigned")) continue;
    if (!/^\d{8}$/.test(record.date)) throw new Error(`Invalid allocation date: ${record.date}`);
    if (record.type === "asn") {
      if (!/^\d+$/.test(record.start) || !/^\d+$/.test(record.value)) throw new Error("Invalid ASN allocation range");
      const start = BigInt(record.start);
      const count = BigInt(record.value);
      const end = start + count;
      if (count < 1n || start < 1n || end > 4_294_967_296n) throw new Error(`ASN allocation out of range: ${record.start} + ${record.value}`);
      for (let asn = start; asn < end; asn++) {
        const value: AsnRecord = { asn: Number(asn), name: null, holderId: record.holderId, date: record.date, status: record.status };
        const existing = asns.get(value.asn);
        if (existing && (existing.holderId !== value.holderId || existing.status !== value.status || existing.date !== value.date)) throw new Error(`Conflicting AFRINIC records for AS${value.asn}`);
        asns.set(value.asn, value);
      }
    } else {
      const prefixes = record.type === "ipv4" ? ipv4RangeToCidrs(record.start, record.value) : [ipv6PrefixToCidr(record.start, record.value)];
      const target = record.type === "ipv4" ? ipv4 : ipv6;
      for (const cidr of prefixes) {
        const value: AddressRecord = { cidr, holderId: record.holderId, date: record.date, status: record.status };
        const existing = target.get(cidr);
        if (existing && (existing.holderId !== value.holderId || existing.status !== value.status || existing.date !== value.date)) throw new Error(`Conflicting AFRINIC records for ${cidr}`);
        target.set(cidr, value);
      }
    }
  }
  if (!asns.size && !ipv4.size && !ipv6.size) throw new Error("No valid Nigerian AFRINIC resources found");
  const sorted = (map: Map<string, AddressRecord>) => sortCidrs([...map.keys()]).map((cidr) => map.get(cidr)!);
  return { asns: [...asns.values()].sort((left, right) => left.asn - right.asn), ipv4: sorted(ipv4), ipv6: sorted(ipv6) };
}
