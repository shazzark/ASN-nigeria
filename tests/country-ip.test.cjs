const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, rm, stat, utimes } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { parseDbipAsnCsv, parseDbipCountryCsv } = require('../dist/parsers/dbip.js');
const { validateCountryIp } = require('../dist/validation/country-ip.js');
const { ipv4InclusiveRangeToCidrs, ipv6InclusiveRangeToCidrs } = require('../dist/validation/ip.js');
const { renderCountryIpFiles } = require('../dist/output/render-country-ip.js');
const { collectCompleteData } = require('../dist/collect.js');
const { parseDbipReleasePage } = require('../dist/sources/dbip.js');

const countryCsv = [
  '192.0.2.1,192.0.2.10,NG',
  '2001:db8::2,2001:db8::5,NG',
  '198.51.100.0,198.51.100.255,US',
].join('\n');
const asnCsv = [
  '192.0.2.0,192.0.2.8,64512,"Network, One"',
  '192.0.2.9,192.0.2.20,64513,"Network ""Two"""',
  '2001:db8::,2001:db8::3,64514,IPv6 Network A',
  '2001:db8::4,2001:db8::f,64515,IPv6 Network B',
].join('\n');
const release = (kind, rows) => ({
  kind,
  releaseMonth: '2026-10',
  expectedRows: rows,
  sha1: 'a'.repeat(40),
  pageUrl: `https://db-ip.com/db/download/ip-to-${kind === 'country' ? 'country' : 'asn'}-lite`,
  downloadUrl: `https://download.db-ip.com/free/dbip-${kind}-lite-2026-10.csv.gz`,
});
const countryIp = (changes = {}) => ({
  countryCsv,
  asnCsv,
  countryRelease: release('country', 3),
  asnRelease: release('asn', 4),
  ...changes,
});
const sourceText = [
  '2|afrinic|fixture-1|1|20260101|20260101|+0000',
  'afrinic|*|asn|*|1|summary',
  'afrinic|*|ipv4|*|0|summary',
  'afrinic|*|ipv6|*|0|summary',
  'afrinic|NG|asn|64512|1|20200101|allocated|holder',
].join('\n');
const apnicSourceText = sourceText.replaceAll('afrinic', 'apnic');
const arinSourceText = sourceText.replaceAll('afrinic', 'arin');
const lacnicSourceText = sourceText.replaceAll('afrinic', 'lacnic');
const registrySourceTexts = { afrinic: sourceText, apnic: apnicSourceText, arin: arinSourceText, lacnic: lacnicSourceText };

async function snapshot(directory, prefix = '') {
  const result = new Map();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) {
      for (const [path, value] of await snapshot(join(directory, entry.name), relative)) result.set(path, value);
    } else result.set(relative, await readFile(join(directory, entry.name), 'utf8'));
  }
  return result;
}

test('converts inclusive DB-IP IPv4 and IPv6 ranges to minimal exact CIDRs', () => {
  assert.deepEqual(ipv4InclusiveRangeToCidrs('192.0.2.1', '192.0.2.10'), [
    '192.0.2.1/32', '192.0.2.2/31', '192.0.2.4/30', '192.0.2.8/31', '192.0.2.10/32',
  ]);
  assert.deepEqual(ipv6InclusiveRangeToCidrs('2001:db8::2', '2001:db8::5'), [
    '2001:db8::2/127', '2001:db8::4/127',
  ]);
  assert.throws(() => ipv4InclusiveRangeToCidrs('192.0.2.2', '192.0.2.1'), /precedes/);
  assert.throws(() => ipv6InclusiveRangeToCidrs('2001:db8::', 'not-ipv6'), /Invalid IPv6/);
});

test('parses RFC 4180 quoted organization fields and validates country and ASN records', () => {
  const parsed = parseDbipAsnCsv(asnCsv);
  assert.equal(parsed.length, 4);
  assert.deepEqual(parsed[0].organizations, ['Network, One']);
  assert.deepEqual(parsed[2].organizations, ['IPv6 Network A']);
  assert.equal(parseDbipCountryCsv(countryCsv).length, 3);
  assert.throws(() => parseDbipAsnCsv('192.0.2.0,192.0.2.1,0,No ASN'), /invalid ASN|out of range/);
  assert.throws(() => parseDbipCountryCsv('192.0.2.0,192.0.2.1,ng'), /invalid country code/);
  assert.throws(() => parseDbipCountryCsv(''), /contains no records/);
  assert.throws(() => parseDbipAsnCsv('192.0.2.0,192.0.2.1,64512,"broken'), /unterminated/);
});

test('accepts only a complete DB-IP CSV release identity from the official metadata page', () => {
  const page = '<dl class="card-body"><dt>Format</dt><dd>CSV</dd><dt>Release</dt><dd>October 2026</dd><dt>Number of records</dt><dd>477,362</dd><dt>SHA1SUM</dt><dd class="small">f9c20e619d6bd3c5d7679ca015d93260b7e9bc26</dd></dl>';
  const releaseInfo = parseDbipReleasePage(page, 'asn');
  assert.equal(releaseInfo.releaseMonth, '2026-10');
  assert.equal(releaseInfo.expectedRows, 477362);
  assert.equal(releaseInfo.downloadUrl, 'https://download.db-ip.com/free/dbip-asn-lite-2026-10.csv.gz');
  assert.throws(() => parseDbipReleasePage(page.replace('477,362', '0'), 'asn'), /invalid record count/);
  assert.throws(() => parseDbipReleasePage(page.replace('f9c20e619d6bd3c5d7679ca015d93260b7e9bc26', 'bad'), 'asn'), /invalid SHA-1/);
});

test('deduplicates identical source ranges but rejects conflicting and partial overlaps', () => {
  assert.equal(parseDbipCountryCsv('192.0.2.0,192.0.2.255,NG\n192.0.2.0,192.0.2.255,NG').length, 1);
  assert.throws(() => parseDbipCountryCsv('192.0.2.0,192.0.2.255,NG\n192.0.2.0,192.0.2.255,US'), /overlapping or conflicting/);
  assert.throws(() => parseDbipCountryCsv('192.0.2.0,192.0.2.200,NG\n192.0.2.100,192.0.2.255,NG'), /overlapping or conflicting/);
  assert.throws(() => parseDbipAsnCsv('192.0.2.0,192.0.2.10,64512,A\n192.0.2.10,192.0.2.20,64513,B'), /overlapping or conflicting/);
  const duplicateOrganizations = parseDbipAsnCsv('192.0.2.0,192.0.2.255,64512,Zulu\n192.0.2.0,192.0.2.255,64512,Alpha');
  assert.equal(duplicateOrganizations.length, 1);
  assert.deepEqual(duplicateOrganizations[0].organizations, ['Zulu', 'Alpha']);
});

test('associates ASNs only through overlap with DB-IP NG ranges and renders separate proxy formats', () => {
  const validated = validateCountryIp(parseDbipCountryCsv(countryCsv), parseDbipAsnCsv(asnCsv));
  assert.deepEqual(validated.ipv4, ['192.0.2.1/32', '192.0.2.2/31', '192.0.2.4/30', '192.0.2.8/31', '192.0.2.10/32']);
  assert.deepEqual(validated.ipv6, ['2001:db8::2/127', '2001:db8::4/127']);
  assert.deepEqual(validated.asns.map(({ asn }) => asn), [64512, 64513, 64514, 64515]);
  assert.deepEqual(validated.asns[0].organizationNames, ['Network, One']);
  const dataset = { ...validated, countryRangesCount: 3, asnRangesCount: 4, releaseMonth: '2026-10', sourceCountry: release('country', 3), sourceAsn: release('asn', 4) };
  const files = renderCountryIpFiles(dataset, [64512], '2026-10-19T00:00:00.000Z');
  assert.equal(files.get('data/country-ip/surge/IPv4.Nigeria.list'), '# Source: DB-IP Lite NG geolocation classification; see metadata.json.\nIP-CIDR,192.0.2.1/32\nIP-CIDR,192.0.2.2/31\nIP-CIDR,192.0.2.4/30\nIP-CIDR,192.0.2.8/31\nIP-CIDR,192.0.2.10/32\n');
  assert.equal(files.get('data/country-ip/quantumult-x/IPv6.Nigeria.list'), '# Source: DB-IP Lite NG geolocation classification; see metadata.json.\nip6-cidr, 2001:db8::2/127, direct\nip6-cidr, 2001:db8::4/127, direct\n');
  const metadata = JSON.parse(files.get('data/country-ip/metadata.json'));
  assert.deepEqual(metadata.asnAssociationOverlapsWithRegistryAllocations, [64512]);
  assert.match(metadata.meaning, /geolocation/);
  assert.match(metadata.asnClassification, /not an RIR country assignment/);
});

test('organization text with line breaks is rejected before rendering rules', () => {
  const hostile = '192.0.2.0,192.0.2.255,64512,"Name\nIP-ASN,65000"';
  assert.throws(() => parseDbipAsnCsv(hostile), /invalid organization/);
});

test('empty country results, no ASN overlap, and mismatched source releases fail closed', async () => {
  assert.throws(() => validateCountryIp([], parseDbipAsnCsv(asnCsv)), /no NG records/);
  assert.throws(() => validateCountryIp(parseDbipCountryCsv('192.0.2.0,192.0.2.1,NG'), parseDbipAsnCsv('198.51.100.0,198.51.100.1,64512,Elsewhere')), /no ASN ranges overlapping/);
  await assert.rejects(collectCompleteData({ countryIp: countryIp({ asnRelease: { ...release('asn', 4), releaseMonth: '2026-09' } }), sourceTexts: registrySourceTexts }), /different monthly releases/);
});

test('a failed complete collection preserves every previously published file', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-complete-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const baseline = { sourceTexts: registrySourceTexts, countryIp: countryIp(), fetchedAt: '2026-10-19T00:00:00.000Z', root };
  await collectCompleteData(baseline);
  const before = await snapshot(join(root, 'data'));
  await assert.rejects(collectCompleteData({ ...baseline, countryIp: countryIp({ countryCsv: 'not,a,valid,record' }), fetchedAt: '2026-10-20T00:00:00.000Z' }), /source record count/);
  assert.deepEqual(await snapshot(join(root, 'data')), before);
});

test('registry ASN labels use deterministic DB-IP source counts and retain all provenance', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-names-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const namesCsv = [
    '192.0.2.0,192.0.2.1,64512,Zulu',
    '192.0.2.2,192.0.2.3,64512,Alpha',
    '192.0.2.4,192.0.2.5,64512,Zulu',
    '2001:db8::,2001:db8::1,64513,',
  ].join('\n');
  await collectCompleteData({
    sourceTexts: registrySourceTexts,
    countryIp: countryIp({ asnCsv: namesCsv, asnRelease: release('asn', 4) }),
    fetchedAt: '2026-10-19T00:00:00.000Z', root,
  });
  const networks = JSON.parse(await readFile(join(root, 'data', 'networks.json'), 'utf8'));
  const network = networks.find(({ asn }) => asn === 64512);
  assert.equal(network.name, 'Zulu');
  assert.deepEqual(network.nameSource, {
    provider: 'DB-IP IP to ASN Lite', releaseMonth: '2026-10',
    selectedBy: 'most-frequent; lexical tie-break',
    candidates: [{ name: 'Zulu', records: 2 }, { name: 'Alpha', records: 1 }],
  });
  assert.equal(network.claims[0].registry, 'afrinic');
});

test('unchanged complete records do not rewrite outputs when only collection time changes', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-complete-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const initial = { sourceTexts: registrySourceTexts, countryIp: countryIp(), fetchedAt: '2026-10-19T00:00:00.000Z', root };
  await collectCompleteData(initial);
  const path = join(root, 'data', 'country-ip', 'IPv4.Nigeria.list');
  const oldTime = new Date('2020-01-01T00:00:00.000Z');
  await utimes(path, oldTime, oldTime);
  const before = await stat(path);
  await collectCompleteData({ ...initial, fetchedAt: '2026-10-20T00:00:00.000Z' });
  assert.equal((await stat(path)).mtimeMs, before.mtimeMs);
});

test('every generated Surge and Quantumult X subscription uses current rule-line syntax', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-syntax-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectCompleteData({ sourceTexts: registrySourceTexts, countryIp: countryIp(), fetchedAt: '2026-10-19T00:00:00.000Z', root });
  const files = await snapshot(join(root, 'data'));
  const listFiles = [...files].filter(([path]) => path.endsWith('.list') && !/^(?:IP|IPv4|IPv6)\.Nigeria\.list$|^country-ip[\\/](?:IP|IPv4|IPv6)\.Nigeria\.list$/.test(path));
  assert.equal(listFiles.length, 18);
  for (const [path, contents] of listFiles) {
    const qx = path.includes(`${join('quantumult-x', '')}`);
    const lines = contents.trimEnd().split(/\r?\n/);
    assert.ok(lines[0].startsWith('# Source: '), `${path}: missing supported source comment`);
    for (const line of lines.slice(1)) {
      const valid = qx
        ? /^(?:ip-cidr, .+, direct|ip6-cidr, .+, direct|ip-asn, \d+, direct)$/.test(line)
        : /^(?:IP-CIDR|IP-CIDR6),[^,]+(?:,no-resolve)?$|^IP-ASN,\d+$/.test(line);
      assert.ok(valid, `${path}: invalid rule line: ${line}`);
    }
  }
});
