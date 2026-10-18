import type { NetworkRecord } from "../types/network";

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
    if (code.startsWith("#x")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " } as Record<string, string>)[code.toLowerCase()] ?? entity;
  });
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function tableRows(table: string): string[][] {
  return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((row) =>
    [...row[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi)].map((cell) => cellText(cell[1]!)),
  );
}

export function parseCountryNetworks(html: string): NetworkRecord[] {
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi)].map((match) => match[1]!);
  const rows = tables.map(tableRows);
  const target = rows.find((candidate) => candidate.some((row) => {
    const headers = row.map((value) => value.toLowerCase());
    return headers.includes("asn") && headers.includes("name");
  }));
  if (!target) throw new Error("Could not find a country table with ASN and Name columns; source layout may have changed");

  const headerIndex = target.findIndex((row) => {
    const headers = row.map((value) => value.toLowerCase());
    return headers.includes("asn") && headers.includes("name");
  });
  const headers = target[headerIndex]!.map((value) => value.toLowerCase());
  const asnIndex = headers.indexOf("asn");
  const nameIndex = headers.indexOf("name");
  const records: NetworkRecord[] = [];
  for (const [rowIndex, row] of target.slice(headerIndex + 1).entries()) {
    if (row.every((value) => value === "")) continue;
    const asnText = row[asnIndex] ?? "";
    const name = row[nameIndex] ?? "";
    if (!/^AS\d+$/.test(asnText)) throw new Error(`Malformed ASN in country table row ${rowIndex + 1}: ${asnText || "empty"}`);
    if (!name) throw new Error(`Missing network name for ${asnText}`);
    records.push({ asn: Number(asnText.slice(2)), name });
  }
  if (records.length === 0) throw new Error("Country table contained no ASN records");
  return records;
}
