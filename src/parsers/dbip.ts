import { parseIpv4, parseIpv6 } from "../validation/ip";

export type AddressFamily = "ipv4" | "ipv6";

export interface IpRange {
  family: AddressFamily;
  start: bigint;
  end: bigint;
  startText: string;
  endText: string;
}

export interface CountryRange extends IpRange {
  countryCode: string;
}

export interface AsnRange extends IpRange {
  asn: number;
}

export function parseCsv(text: string, label: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]!;
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') { field += '"'; index += 1; }
        else { quoted = false; afterQuote = true; }
      } else field += character;
      continue;
    }
    if (afterQuote && character !== "," && character !== "\r" && character !== "\n") {
      throw new Error(`${label} CSV has characters after a closing quote`);
    }
    if (character === '"') {
      if (field.length !== 0 || afterQuote) throw new Error(`${label} CSV has an unexpected quote`);
      quoted = true;
    } else if (character === ",") {
      row.push(field); field = ""; afterQuote = false;
    } else if (character === "\r" || character === "\n") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = ""; afterQuote = false;
    } else field += character;
  }
  if (quoted) throw new Error(`${label} CSV has an unterminated quoted field`);
  if (field.length || row.length || afterQuote) { row.push(field); rows.push(row); }
  if (rows.length === 0) throw new Error(`${label} CSV contains no records`);
  return rows;
}

function parseRange(startText: string, endText: string, label: string, rowNumber: number): IpRange {
  let family: AddressFamily;
  let start: bigint;
  let end: bigint;
  try {
    if (startText.includes(":")) {
      family = "ipv6"; start = parseIpv6(startText); end = parseIpv6(endText);
    } else {
      family = "ipv4"; start = parseIpv4(startText); end = parseIpv4(endText);
    }
  } catch (error) {
    throw new Error(`${label} CSV has an invalid IP range on record ${rowNumber}: ${startText}-${endText}`, { cause: error });
  }
  if (end < start || endText.includes(":") !== (family === "ipv6")) {
    throw new Error(`${label} CSV has a reversed or mixed-family range on record ${rowNumber}`);
  }
  return { family, start, end, startText, endText };
}

function deduplicateAndValidateRanges<T extends IpRange>(ranges: T[], label: string, identity: (range: T) => string): T[] {
  ranges.sort((left, right) => left.family === right.family
    ? left.start < right.start ? -1 : left.start > right.start ? 1 : left.end < right.end ? -1 : left.end > right.end ? 1 : 0
    : left.family === "ipv4" ? -1 : 1);
  const unique: T[] = [];
  for (const range of ranges) {
    const previous = unique.at(-1);
    if (previous && previous.family === range.family && range.start <= previous.end) {
      if (range.start === previous.start && range.end === previous.end && identity(range) === identity(previous)) continue;
      throw new Error(`${label} CSV contains overlapping or conflicting ranges: ${range.startText}-${range.endText}`);
    }
    unique.push(range);
  }
  return unique;
}

export function parseDbipCountryCsv(text: string): CountryRange[] {
  const ranges = parseCsv(text, "DB-IP country").map((fields, index): CountryRange => {
    if (fields.length !== 3) throw new Error(`DB-IP country CSV record ${index + 1} has ${fields.length} fields; expected 3`);
    const [startText = "", endText = "", countryCode = ""] = fields;
    if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error(`DB-IP country CSV has invalid country code on record ${index + 1}`);
    return { ...parseRange(startText, endText, "DB-IP country", index + 1), countryCode };
  });
  return deduplicateAndValidateRanges(ranges, "DB-IP country", ({ countryCode }) => countryCode);
}

export function parseDbipAsnCsv(text: string): AsnRange[] {
  const ranges = parseCsv(text, "DB-IP ASN").map((fields, index): AsnRange => {
    if (fields.length !== 4) throw new Error(`DB-IP ASN CSV record ${index + 1} has ${fields.length} fields; expected 4`);
    const [startText = "", endText = "", asnText = ""] = fields;
    if (!/^\d+$/.test(asnText)) throw new Error(`DB-IP ASN CSV has an invalid ASN on record ${index + 1}`);
    const asn = Number(asnText);
    if (!Number.isSafeInteger(asn) || asn < 1 || asn > 4_294_967_295) throw new Error(`DB-IP ASN CSV ASN is out of range on record ${index + 1}`);
    return { ...parseRange(startText, endText, "DB-IP ASN", index + 1), asn };
  });
  return deduplicateAndValidateRanges(ranges, "DB-IP ASN", ({ asn }) => String(asn));
}
