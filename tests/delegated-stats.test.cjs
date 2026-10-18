const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDelegatedStatistics } = require('../dist/parsers/delegated-stats.js');
const { validateResources } = require('../dist/validation/resources.js');

function source(registry, rows) {
  const counts = Object.fromEntries(['asn', 'ipv4', 'ipv6'].map((type) => [type, rows.filter((row) => row.split('|')[2] === type).length]));
  return [`2|${registry}|fixture-serial|${rows.length}|20260101|20260101|+0000`,
    `${registry}|*|asn|*|${counts.asn}|summary`, `${registry}|*|ipv4|*|${counts.ipv4}|summary`, `${registry}|*|ipv6|*|${counts.ipv6}|summary`, ...rows, ''].join('\n');
}
const afrinicRows = [
  'afrinic|NG|asn|64512|1|20200101|allocated|holder-asn',
  'afrinic|NG|ipv4|192.0.2.0|256|20200102|assigned|holder-v4',
  'afrinic|NG|ipv6|2001:db8:1::|48|20200103|allocated|holder-v6',
];
const ripeRows = [
  'ripencc|NG|asn|64513|1|20210101|allocated|holder-asn-ripe',
  'ripencc|NG|ipv4|198.51.100.0|256|20210102|assigned|holder-v4-ripe',
  'ripencc|NG|ipv6|2001:db8:2::|48|20210103|allocated|holder-v6-ripe',
];

test('parses and filters AFRINIC and RIPE NCC records with registry provenance', () => {
  const afrinic = parseDelegatedStatistics(source('afrinic', [...afrinicRows, 'afrinic|US|asn|64514|1|20200101|allocated|holder-us', 'afrinic|NG|asn|64515|1|20200101|reserved|holder-reserved']), 'afrinic');
  const ripe = parseDelegatedStatistics(source('ripencc', ripeRows), 'ripencc');
  assert.equal(afrinic.registry, 'afrinic');
  assert.equal(ripe.registry, 'ripencc');
  assert.equal(afrinic.declaredRecordCount, 5);
  assert.equal(afrinic.records.length, 3);
  const resources = validateResources([...afrinic.records, ...ripe.records]);
  assert.deepEqual(resources.asns.map((item) => item.asn), [64512, 64513]);
  assert.equal(resources.asns[0].name, null);
  assert.equal(resources.asns[0].claims[0].registry, 'afrinic');
  assert.equal(resources.asns[1].claims[0].registry, 'ripencc');
});

test('rejects wrong registry headers, malformed rows, count drift, and empty files', () => {
  assert.throws(() => parseDelegatedStatistics('', 'afrinic'), /Missing afrinic/);
  assert.throws(() => parseDelegatedStatistics(source('afrinic', afrinicRows), 'ripencc'), /Invalid or duplicate ripencc version header/);
  assert.throws(() => parseDelegatedStatistics(source('afrinic', afrinicRows).replace('|+0000\n', '|+0000|unexpected\n'), 'afrinic'), /Invalid or duplicate afrinic version header/);
  assert.throws(() => parseDelegatedStatistics(source('afrinic', afrinicRows).replace('1|summary', '1|summary|unexpected'), 'afrinic'), /Malformed afrinic summary/);
  assert.throws(() => validateResources(parseDelegatedStatistics(source('afrinic', ['afrinic|NG|ipv4|bad|2|20200101|assigned|holder']), 'afrinic').records), /Invalid IPv4/);
  assert.throws(() => parseDelegatedStatistics(source('afrinic', afrinicRows).replace('fixture-serial|3|', 'fixture-serial|4|'), 'afrinic'), /count mismatch/);
  assert.throws(() => parseDelegatedStatistics(source('afrinic', afrinicRows).replace('holder-v6\n', 'holder-v6|unexpected-extension\n'), 'afrinic'), /expected 8 fields/);
  assert.throws(() => parseDelegatedStatistics(source('ripencc', ['ripencc||ipv4|5.134.16.0|2048||assigned']), 'ripencc'), /only unassigned rows/);
  const emptyNigeria = parseDelegatedStatistics(source('ripencc', ['ripencc||ipv4|5.134.16.0|2048||reserved']), 'ripencc');
  assert.deepEqual(emptyNigeria.records, []);
});

test('rejects invalid ASN values and conflicting duplicates within one registry', () => {
  const parsed = parseDelegatedStatistics(source('afrinic', afrinicRows), 'afrinic');
  assert.throws(() => validateResources([{ ...parsed.records[0], start: '0' }]), /ASN allocation out of range/);
  assert.throws(() => validateResources([...parsed.records, { ...parsed.records[0], holderId: 'different-holder' }]), /Conflicting afrinic records/);
});

test('deduplicates identical cross-registry outputs, retains both claims, and records conflicts', () => {
  const afrinic = parseDelegatedStatistics(source('afrinic', [afrinicRows[0], afrinicRows[1]]), 'afrinic');
  const ripe = parseDelegatedStatistics(source('ripencc', [
    'ripencc|NG|asn|64512|1|20210101|assigned|different-holder-id',
    'ripencc|NG|ipv4|192.0.2.0|256|20210102|allocated|different-holder-id',
  ]), 'ripencc');
  const resources = validateResources([...afrinic.records, ...ripe.records]);
  assert.equal(resources.asns.length, 1);
  assert.deepEqual(resources.asns[0].claims.map((claim) => claim.registry), ['afrinic', 'ripencc']);
  assert.equal(resources.ipv4.length, 1);
  assert.equal(resources.crossRegistryDuplicates.asns, 1);
  assert.equal(resources.crossRegistryDuplicates.prefixes, 1);
  assert.deepEqual(resources.crossRegistryConflicts.map((item) => [item.resource, item.fields]), [
    ['192.0.2.0/24', ['date', 'status']], ['AS64512', ['date', 'status']],
  ]);
});

test('reports partial cross-registry prefix overlap without merging or widening either prefix', () => {
  const afrinic = parseDelegatedStatistics(source('afrinic', ['afrinic|NG|ipv4|192.0.2.0|256|20200102|assigned|a']), 'afrinic');
  const ripe = parseDelegatedStatistics(source('ripencc', ['ripencc|NG|ipv4|192.0.2.0|128|20210102|assigned|b']), 'ripencc');
  const resources = validateResources([...afrinic.records, ...ripe.records]);
  assert.deepEqual(resources.ipv4.map((record) => record.cidr), ['192.0.2.0/24', '192.0.2.0/25']);
  assert.deepEqual(resources.crossRegistryOverlaps, [{ first: '192.0.2.0/24', second: '192.0.2.0/25', registries: ['afrinic', 'ripencc'] }]);
});
