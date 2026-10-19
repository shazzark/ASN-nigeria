const IPV4_LIMIT = 1n << 32n;
const IPV6_LIMIT = 1n << 128n;

export function parseIpv4(value: string): bigint {
  const octets = value.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255 || String(Number(part)) !== part)) throw new Error(`Invalid IPv4 address: ${value}`);
  return octets.reduce((address, octet) => (address << 8n) | BigInt(Number(octet)), 0n);
}

export function formatIpv4(value: bigint): string {
  if (value < 0n || value >= IPV4_LIMIT) throw new Error(`IPv4 value out of range: ${value}`);
  return [24n, 16n, 8n, 0n].map((shift) => Number((value >> shift) & 255n)).join(".");
}

export function ipv4RangeToCidrs(startText: string, countText: string): string[] {
  const start = parseIpv4(startText);
  if (!/^\d+$/.test(countText)) throw new Error(`Invalid IPv4 range count: ${countText}`);
  const count = BigInt(countText);
  if (count < 1n || start + count > IPV4_LIMIT) throw new Error(`IPv4 range exceeds address space: ${startText} + ${countText}`);
  return rangeToCidrs(start, start + count - 1n, 32, formatIpv4);
}

export function ipv4InclusiveRangeToCidrs(startText: string, endText: string): string[] {
  return rangeToCidrs(parseIpv4(startText), parseIpv4(endText), 32, formatIpv4);
}

export function ipv6InclusiveRangeToCidrs(startText: string, endText: string): string[] {
  return rangeToCidrs(parseIpv6(startText), parseIpv6(endText), 128, formatIpv6);
}

function rangeToCidrs(start: bigint, end: bigint, width: number, format: (value: bigint) => string): string[] {
  if (start > end || end >= (1n << BigInt(width))) throw new Error("IP range end precedes start or exceeds address space");
  const cidrs: string[] = [];
  let next = start;
  while (next <= end) {
    let alignedBits = 0;
    if (next === 0n) alignedBits = width;
    else while (alignedBits < width && ((next >> BigInt(alignedBits)) & 1n) === 0n) alignedBits++;
    const remaining = end - next + 1n;
    let blockBits = remaining.toString(2).length - 1;
    const hostBits = Math.min(alignedBits, blockBits);
    cidrs.push(`${format(next)}/${width - hostBits}`);
    const size = 1n << BigInt(hostBits);
    next += size;
  }
  return cidrs;
}

export function parseIpv6(value: string): bigint {
  if (!value || value.includes(".") || value.includes("%")) throw new Error(`Invalid IPv6 address: ${value}`);
  const halves = value.toLowerCase().split("::");
  if (halves.length > 2) throw new Error(`Invalid IPv6 address: ${value}`);
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) throw new Error(`Invalid IPv6 address: ${value}`);
  const groups = halves.length === 1 ? left : [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[\da-f]{1,4}$/.test(group))) throw new Error(`Invalid IPv6 address: ${value}`);
  return groups.reduce((address, group) => (address << 16n) | BigInt(`0x${group}`), 0n);
}

export function formatIpv6(value: bigint): string {
  if (value < 0n || value >= IPV6_LIMIT) throw new Error(`IPv6 value out of range: ${value}`);
  const groups = Array.from({ length: 8 }, (_, index) => Number((value >> BigInt((7 - index) * 16)) & 0xffffn));
  let bestStart = -1;
  let bestLength = 1;
  for (let index = 0; index < 8;) {
    if (groups[index] !== 0) { index++; continue; }
    let end = index;
    while (end < 8 && groups[end] === 0) end++;
    if (end - index > bestLength) { bestStart = index; bestLength = end - index; }
    index = end;
  }
  if (bestStart === -1) return groups.map((group) => group.toString(16)).join(":");
  const before = groups.slice(0, bestStart).map((group) => group.toString(16)).join(":");
  const after = groups.slice(bestStart + bestLength).map((group) => group.toString(16)).join(":");
  return `${before}::${after}`;
}

export function ipv6PrefixToCidr(startText: string, prefixText: string): string {
  const start = parseIpv6(startText);
  if (!/^\d{1,3}$/.test(prefixText)) throw new Error(`Invalid IPv6 prefix length: ${prefixText}`);
  const prefix = Number(prefixText);
  if (prefix > 128) throw new Error(`IPv6 prefix length out of range: ${prefixText}`);
  const hostBits = BigInt(128 - prefix);
  if (((start >> hostBits) << hostBits) !== start) throw new Error(`IPv6 allocation is not aligned to /${prefix}: ${startText}`);
  return `${formatIpv6(start)}/${prefix}`;
}

export function sortCidrs(cidrs: readonly string[]): string[] {
  return [...new Set(cidrs)].sort((left, right) => {
    const [leftAddress, leftLength] = left.split("/");
    const [rightAddress, rightLength] = right.split("/");
    const leftV6 = leftAddress!.includes(":");
    const rightV6 = rightAddress!.includes(":");
    if (leftV6 !== rightV6) return leftV6 ? 1 : -1;
    const leftValue = leftV6 ? parseIpv6(leftAddress!) : parseIpv4(leftAddress!);
    const rightValue = rightV6 ? parseIpv6(rightAddress!) : parseIpv4(rightAddress!);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : Number(leftLength) - Number(rightLength);
  });
}
