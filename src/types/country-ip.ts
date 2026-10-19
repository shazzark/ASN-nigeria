import type { DbipRelease } from "../sources/dbip";
import type { CountryIpAsn, ValidatedCountryIp } from "../validation/country-ip";

export interface CountryIpMetadata {
  countryCode: "NG";
  meaning: string;
  fetchedAt: string;
  releaseMonth: string;
  records: { sourceCountryRows: number; sourceAsnRows: number; ipv4Ranges: number; ipv6Ranges: number; ipv4Cidrs: number; ipv6Cidrs: number; associatedAsns: number };
  asnClassification: string;
  asnAssociationOverlapsWithAfrinicAllocation: number[];
  sources: {
    country: DbipRelease & { termsUrl: string; termsStatus: string; attribution: string };
    asn: DbipRelease & { termsUrl: string; termsStatus: string; attribution: string };
  };
}

export interface CountryIpDataset extends ValidatedCountryIp {
  countryRangesCount: number;
  asnRangesCount: number;
  releaseMonth: string;
  sourceCountry: DbipRelease;
  sourceAsn: DbipRelease;
}

export type { CountryIpAsn };
