import type { AddressRecord, AsnRecord, DelegatedRecord, RegistryName, ResourceClaim } from "../types/resource";
import { ipv4RangeToCidrs, ipv6PrefixToCidr, parseIpv4, parseIpv6, sortCidrs } from "./ip";

export interface ValidatedResources {
  asns: AsnRecord[];
  ipv4: AddressRecord[];
  ipv6: AddressRecord[];
  crossRegistryDuplicates: { asns: number; prefixes: number };
  crossRegistryConflicts: Array<{ resource: string; registries: RegistryName[]; fields: string[] }>;
  crossRegistryOverlaps: Array<{ first: string; second: string; registries: RegistryName[] }>;
}

function sameClaim(left: ResourceClaim, right: ResourceClaim): boolean {
  return left.registry === right.registry && left.holderId === right.holderId && left.date === right.date && left.status === right.status;
}

function mergeClaim<T extends { claims: ResourceClaim[] }>(
  existing: T | undefined,
  claim: ResourceClaim,
  resource: string,
  duplicates: { value: number },
  conflicts: ValidatedResources["crossRegistryConflicts"],
): T | undefined {
  if (!existing) return undefined;
  const sameRegistryClaim = existing.claims.find((item) => item.registry === claim.registry);
  if (sameRegistryClaim) {
    if (!sameClaim(sameRegistryClaim, claim)) throw new Error(`Conflicting ${claim.registry} records for ${resource}`);
    return existing;
  }
  if (!existing.claims.some((item) => item.registry === claim.registry)) {
    existing.claims.push(claim);
    duplicates.value++;
    const fields = new Set<string>();
    for (const previous of existing.claims) {
      if (previous.registry === claim.registry) continue;
      if (previous.date !== claim.date) fields.add("date");
      if (previous.status !== claim.status) fields.add("status");
    }
    if (fields.size) {
      conflicts.push({
        resource,
        registries: [...new Set(existing.claims.map((item) => item.registry))].sort(),
        fields: [...fields].sort(),
      });
    }
  }
  return existing;
}

function addressBounds(cidr: string): { family: 4 | 6; start: bigint; end: bigint } {
  const [address, lengthText] = cidr.split("/");
  const family = address!.includes(":") ? 6 : 4;
  const bits = family === 4 ? 32 : 128;
  const prefix = Number(lengthText);
  const start = family === 4 ? parseIpv4(address!) : parseIpv6(address!);
  return { family, start, end: start + (1n << BigInt(bits - prefix)) - 1n };
}

function findCrossRegistryOverlaps(records: readonly AddressRecord[]): ValidatedResources["crossRegistryOverlaps"] {
  const overlaps: ValidatedResources["crossRegistryOverlaps"] = [];
  for (const family of [4, 6] as const) {
    const ordered = records
      .map((record) => ({ record, bounds: addressBounds(record.cidr) }))
      .filter((item) => item.bounds.family === family)
      .sort((left, right) => left.bounds.start < right.bounds.start ? -1 : left.bounds.start > right.bounds.start ? 1 : left.bounds.end > right.bounds.end ? -1 : left.bounds.end < right.bounds.end ? 1 : 0);
    for (let leftIndex = 0; leftIndex < ordered.length; leftIndex++) {
      const left = ordered[leftIndex]!;
      for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex++) {
        const right = ordered[rightIndex]!;
        if (right.bounds.start > left.bounds.end) break;
        const registries = [...new Set([...left.record.claims, ...right.record.claims].map((claim) => claim.registry))].sort();
        if (registries.length >= 2) overlaps.push({ first: left.record.cidr, second: right.record.cidr, registries });
      }
    }
  }
  return overlaps;
}

export function validateResources(records: readonly DelegatedRecord[]): ValidatedResources {
  const asns = new Map<number, AsnRecord>();
  const ipv4 = new Map<string, AddressRecord>();
  const ipv6 = new Map<string, AddressRecord>();
  const asnDuplicates = { value: 0 };
  const prefixDuplicates = { value: 0 };
  const crossRegistryConflicts: ValidatedResources["crossRegistryConflicts"] = [];

  for (const record of records) {
    if (record.countryCode !== "NG" || (record.status !== "allocated" && record.status !== "assigned")) continue;
    if (!/^\d{8}$/.test(record.date)) throw new Error(`Invalid allocation date from ${record.registry}: ${record.date}`);
    const claim: ResourceClaim = { registry: record.registry, holderId: record.holderId, date: record.date, status: record.status };
    if (record.type === "asn") {
      if (!/^\d+$/.test(record.start) || !/^\d+$/.test(record.value)) throw new Error(`Invalid ASN allocation range from ${record.registry}`);
      const start = BigInt(record.start);
      const count = BigInt(record.value);
      const end = start + count;
      if (count < 1n || start < 1n || end > 4_294_967_296n) throw new Error(`ASN allocation out of range from ${record.registry}: ${record.start} + ${record.value}`);
      for (let asn = start; asn < end; asn++) {
        const key = Number(asn);
        const existing = asns.get(key);
        const merged = mergeClaim(existing, claim, `AS${key}`, asnDuplicates, crossRegistryConflicts);
        if (!existing) asns.set(key, { asn: key, name: null, nameSource: null, claims: [claim] });
        else if (!merged) throw new Error(`Unable to merge claims for AS${key}`);
      }
    } else {
      const prefixes = record.type === "ipv4" ? ipv4RangeToCidrs(record.start, record.value) : [ipv6PrefixToCidr(record.start, record.value)];
      const target = record.type === "ipv4" ? ipv4 : ipv6;
      for (const cidr of prefixes) {
        const existing = target.get(cidr);
        const merged = mergeClaim(existing, claim, cidr, prefixDuplicates, crossRegistryConflicts);
        if (!existing) target.set(cidr, { cidr, claims: [claim] });
        else if (!merged) throw new Error(`Unable to merge claims for ${cidr}`);
      }
    }
  }

  if (!asns.size && !ipv4.size && !ipv6.size) throw new Error("No valid Nigerian delegated resources found");
  const sorted = (map: Map<string, AddressRecord>) => sortCidrs([...map.keys()]).map((cidr) => map.get(cidr)!);
  crossRegistryConflicts.sort((left, right) => left.resource.localeCompare(right.resource));
  const sortedIpv4 = sorted(ipv4);
  const sortedIpv6 = sorted(ipv6);
  return {
    asns: [...asns.values()].sort((left, right) => left.asn - right.asn),
    ipv4: sortedIpv4,
    ipv6: sortedIpv6,
    crossRegistryDuplicates: { asns: asnDuplicates.value, prefixes: prefixDuplicates.value },
    crossRegistryConflicts,
    crossRegistryOverlaps: findCrossRegistryOverlaps([...sortedIpv4, ...sortedIpv6]),
  };
}
