import type { DelegatedRecord, DelegatedSnapshot, ResourceType } from "../types/resource";

const TYPES = new Set<ResourceType>(["asn", "ipv4", "ipv6"]);
const STATUSES = new Set(["allocated", "assigned", "available", "reserved"]);

export function parseDelegatedStatistics(text: string): DelegatedSnapshot {
  let serial: string | undefined;
  let declaredRecordCount: number | undefined;
  const records: DelegatedRecord[] = [];
  let actualRecordCount = 0;
  const recordCounts = new Map<ResourceType, number>();
  const summaryCounts = new Map<ResourceType, number>();

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const fields = line.split("|").map((field) => field.trim());
    if (/^2(?:\.\d+[a-z]*)?$/i.test(fields[0] ?? "")) {
      if (serial !== undefined || fields.length < 7 || fields[1] !== "afrinic") throw new Error(`Invalid or duplicate AFRINIC version header on line ${index + 1}`);
      serial = fields[2];
      declaredRecordCount = Number(fields[3]);
      if (!serial || !Number.isSafeInteger(declaredRecordCount) || declaredRecordCount < 0) throw new Error("Malformed AFRINIC version header");
      continue;
    }
    if (fields.at(-1) === "summary") {
      const [, marker, summaryType, unused, summaryCount] = fields;
      if (fields[0] !== "afrinic" || marker !== "*" || unused !== "*" || !TYPES.has(summaryType as ResourceType)
        || !/^\d+$/.test(summaryCount ?? "") || summaryCounts.has(summaryType as ResourceType)) {
        throw new Error(`Malformed AFRINIC summary line ${index + 1}`);
      }
      summaryCounts.set(summaryType as ResourceType, Number(summaryCount));
      continue;
    }
    if (serial === undefined) throw new Error(`Record appeared before AFRINIC version header on line ${index + 1}`);
    if (fields.length < 8) throw new Error(`Malformed delegated record on line ${index + 1}`);
    const [registry, countryCode, type, start, value, date, status, holderId] = fields;
    if (registry !== "afrinic" || !countryCode || !/^[A-Z]{2}$/.test(countryCode)) throw new Error(`Unexpected registry or country code on line ${index + 1}`);
    if (!TYPES.has(type as ResourceType)) throw new Error(`Unexpected resource type on line ${index + 1}: ${type}`);
    if (!start || !value || !/^\d+$/.test(value) || !status || !STATUSES.has(status)) {
      throw new Error(`Malformed delegated record fields on line ${index + 1}: ${fields.join("|")}`);
    }
    actualRecordCount++;
    recordCounts.set(type as ResourceType, (recordCounts.get(type as ResourceType) ?? 0) + 1);
    if (countryCode === "NG" && (status === "allocated" || status === "assigned")) {
      if (!date || !/^\d{8}$/.test(date) || !holderId) throw new Error(`Active NG record is missing date or holder ID on line ${index + 1}`);
      records.push({ registry: "afrinic", countryCode, type: type as ResourceType, start, value, date, status, holderId });
    }
  }
  if (serial === undefined || declaredRecordCount === undefined) throw new Error("Missing AFRINIC statistics version header");
  if (actualRecordCount !== declaredRecordCount) throw new Error(`AFRINIC record count mismatch: header declares ${declaredRecordCount}, found ${actualRecordCount}`);
  for (const type of TYPES) {
    if (summaryCounts.get(type) !== (recordCounts.get(type) ?? 0)) {
      throw new Error(`AFRINIC ${type} summary mismatch: declared ${summaryCounts.get(type) ?? "missing"}, found ${recordCounts.get(type) ?? 0}`);
    }
  }
  if (records.length === 0) throw new Error("AFRINIC statistics contain no active NG allocations or assignments");
  return { serial, declaredRecordCount, records };
}
