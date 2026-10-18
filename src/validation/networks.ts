import type { NetworkRecord } from "../types/network";

export function normalizeNetworks(input: readonly NetworkRecord[]): NetworkRecord[] {
  const unique = new Map<number, string>();
  for (const item of input) {
    if (!Number.isSafeInteger(item.asn) || item.asn < 1 || item.asn > 4_294_967_295) {
      throw new Error(`Invalid ASN value: ${item.asn}`);
    }
    if (typeof item.name !== "string") throw new Error(`Invalid network name for AS${item.asn}`);
    if (/[\u0000-\u0008\u000a-\u001f\u007f-\u009f]/.test(item.name)) throw new Error(`Unsafe or invalid network name for AS${item.asn}`);
    const name = item.name.normalize("NFKC").replace(/\s+/g, " ").trim();
    if (!name || name.length > 200 || /[|#]/.test(name)) throw new Error(`Unsafe or invalid network name for AS${item.asn}`);
    const previous = unique.get(item.asn);
    if (previous !== undefined && previous !== name) throw new Error(`Conflicting names for AS${item.asn}: ${previous} / ${name}`);
    unique.set(item.asn, name);
  }
  if (unique.size === 0) throw new Error("Refusing to publish an empty ASN dataset");
  return [...unique].map(([asn, name]) => ({ asn, name })).sort((left, right) => left.asn - right.asn);
}
