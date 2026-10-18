const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDelegatedStatistics } = require('../dist/parsers/delegated-stats.js');
const { validateResources } = require('../dist/validation/resources.js');

function source(rows) {
  const counts = Object.fromEntries(['asn', 'ipv4', 'ipv6'].map((type) => [type, rows.filter((row) => row.split('|')[2] === type).length]));
  return ['# AFRINIC synthetic fixture', `2|afrinic|fixture-serial|${rows.length}|20260101|20260101|+0000`,
    `afrinic|*|asn|*|${counts.asn}|summary`, `afrinic|*|ipv4|*|${counts.ipv4}|summary`, `afrinic|*|ipv6|*|${counts.ipv6}|summary`, ...rows, ''].join('\n');
}
const rows = [
  'afrinic|NG|asn|64512|1|20200101|allocated|holder-asn',
  'afrinic|NG|ipv4|192.0.2.1|10|20200102|assigned|holder-v4',
  'afrinic|NG|ipv6|2001:db8:1::|48|20200103|allocated|holder-v6',
];

test('parses delegated records and selects active NG resource types', () => {
  const parsed = parseDelegatedStatistics(source([...rows, 'afrinic|US|asn|64513|1|20200101|allocated|holder-us', 'afrinic|NG|asn|64514|1|20200101|reserved|holder-reserved']));
  assert.equal(parsed.serial, 'fixture-serial');
  assert.equal(parsed.declaredRecordCount, 5);
  assert.equal(parsed.records.length, 3);
  const resources = validateResources(parsed.records);
  assert.deepEqual(resources.asns.map((item) => item.asn), [64512]);
  assert.equal(resources.asns[0].name, null);
});

test('rejects missing headers, malformed records, record-count drift, and empty NG results', () => {
  assert.throws(() => parseDelegatedStatistics(''), /Missing AFRINIC/);
  assert.throws(() => parseDelegatedStatistics(source(rows).replace('|+0000\n', '|+0000|unexpected\n')), /Invalid or duplicate AFRINIC version header/);
  assert.throws(() => parseDelegatedStatistics(source(rows).replace('1|summary', '1|summary|unexpected')), /Malformed AFRINIC summary/);
  assert.throws(() => validateResources(parseDelegatedStatistics(source(['afrinic|NG|ipv4|bad|2|20200101|assigned|holder'])).records), /Invalid IPv4/);
  assert.throws(() => parseDelegatedStatistics(source(rows).replace('fixture-serial|3|', 'fixture-serial|4|')), /count mismatch/);
  assert.throws(() => parseDelegatedStatistics(source(rows).replace('holder-v6\n', 'holder-v6|unexpected-extension\n')), /expected 8 fields/);
  assert.throws(() => parseDelegatedStatistics(source(['afrinic|US|asn|64513|1|20200101|allocated|holder'])), /no active NG/);
  assert.throws(() => parseDelegatedStatistics(source(['afrinic|NG|asn|64512|1|20200101|mystery|holder'])), /Malformed delegated record/);
});

test('rejects invalid ASN values and conflicting duplicates', () => {
  const parsed = parseDelegatedStatistics(source(rows));
  assert.throws(() => validateResources([{ ...parsed.records[0], start: '0' }]), /ASN allocation out of range/);
  assert.throws(() => validateResources([...parsed.records, { ...parsed.records[0], holderId: 'different-holder' }]), /Conflicting AFRINIC records/);
  assert.throws(() => validateResources([...parsed.records, { ...parsed.records[0], date: '20210101' }]), /Conflicting AFRINIC records/);
  assert.throws(() => validateResources([...parsed.records, { ...parsed.records[1], status: 'allocated' }]), /Conflicting AFRINIC records/);
});
