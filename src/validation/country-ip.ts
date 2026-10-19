import type { AddressFamily, AsnRange, CountryRange, IpRange } from "../parsers/dbip";
import { ipv4InclusiveRangeToCidrs, ipv6InclusiveRangeToCidrs, sortCidrs } from "./ip";

export interface ClassifiedRange {
  start: string;
  end: string;
  cidrs: string[];
}

export interface CountryIpAsn {
  asn: number;
  families: AddressFamily[];
  organizationNames: string[];
}

export interface ValidatedCountryIp {
  ipv4: string[];
  ipv6: string[];
  ipv4Ranges: ClassifiedRange[];
  ipv6Ranges: ClassifiedRange[];
  asns: CountryIpAsn[];
}

function compareRanges(left: IpRange, right: IpRange): number {
  if (left.family !== right.family) return left.family === "ipv4" ? -1 : 1;
  return left.start < right.start ? -1 : left.start > right.start ? 1 : left.end < right.end ? -1 : left.end > right.end ? 1 : 0;
}

function overlaps(left: IpRange, right: IpRange): boolean {
  return left.family === right.family && left.start <= right.end && right.start <= left.end;
}

function intersectingAsns(country: readonly CountryRange[], asnRanges: readonly AsnRange[]): CountryIpAsn[] {
  const selected = country.filter(({ countryCode }) => countryCode === "NG").sort(compareRanges);
  const associations = new Map<number, Set<AddressFamily>>();
  const organizationNames = new Map<number, Set<string>>();
  let countryIndex = 0;
  let asnIndex = 0;
  while (countryIndex < selected.length && asnIndex < asnRanges.length) {
    const countryRange = selected[countryIndex]!;
    const asnRange = asnRanges[asnIndex]!;
    if (countryRange.family !== asnRange.family) {
      if (countryRange.family === "ipv4") countryIndex += 1;
      else asnIndex += 1;
      continue;
    }
    if (overlaps(countryRange, asnRange)) {
      const families = associations.get(asnRange.asn) ?? new Set<AddressFamily>();
      families.add(countryRange.family);
      associations.set(asnRange.asn, families);
      if (asnRange.organizations.length) {
        const names = organizationNames.get(asnRange.asn) ?? new Set<string>();
        for (const organization of asnRange.organizations) names.add(organization);
        organizationNames.set(asnRange.asn, names);
      }
    }
    if (countryRange.end < asnRange.end) countryIndex += 1;
    else asnIndex += 1;
  }
  return [...associations].sort(([left], [right]) => left - right)
    .map(([asn, families]) => ({ asn, families: [...families].sort(), organizationNames: [...(organizationNames.get(asn) ?? [])].sort() }));
}

function toClassifiedRanges(ranges: readonly CountryRange[], family: AddressFamily): ClassifiedRange[] {
  return ranges.filter((range) => range.countryCode === "NG" && range.family === family).map((range) => ({
    start: range.startText,
    end: range.endText,
    cidrs: family === "ipv4"
      ? ipv4InclusiveRangeToCidrs(range.startText, range.endText)
      : ipv6InclusiveRangeToCidrs(range.startText, range.endText),
  }));
}

export function validateCountryIp(countryRanges: CountryRange[], asnRanges: AsnRange[]): ValidatedCountryIp {
  const ngRanges = countryRanges.filter(({ countryCode }) => countryCode === "NG");
  if (ngRanges.length === 0) throw new Error("DB-IP country dataset has no NG records");
  const ipv4Ranges = toClassifiedRanges(ngRanges, "ipv4");
  const ipv6Ranges = toClassifiedRanges(ngRanges, "ipv6");
  const ipv4 = sortCidrs(ipv4Ranges.flatMap(({ cidrs }) => cidrs));
  const ipv6 = sortCidrs(ipv6Ranges.flatMap(({ cidrs }) => cidrs));
  if (ipv4.length === 0 && ipv6.length === 0) throw new Error("DB-IP country dataset produced no Nigerian address ranges");
  const asns = intersectingAsns(countryRanges, asnRanges);
  if (asns.length === 0) throw new Error("DB-IP ASN dataset has no ASN ranges overlapping NG-classified addresses");
  return { ipv4, ipv6, ipv4Ranges, ipv6Ranges, asns };
}
