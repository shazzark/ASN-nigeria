const test = require('node:test');
const assert = require('node:assert/strict');
const { renderFiles } = require('../dist/output/render.js');

test('renders separate proxy formats and keeps registry provenance and terms distinct', () => {
  const resources = {
    asns: [{ asn: 64512, name: null, claims: [{ registry: 'afrinic', holderId: 'h', date: '20200101', status: 'allocated' }] }],
    ipv4: [{ cidr: '192.0.2.0/24', claims: [{ registry: 'ripencc', holderId: 'r', date: '20200101', status: 'assigned' }] }],
    ipv6: [{ cidr: '2001:db8::/32', claims: [{ registry: 'ripencc', holderId: 'r', date: '20200101', status: 'allocated' }] }],
    crossRegistryDuplicates: { asns: 0, prefixes: 0 },
    crossRegistryConflicts: [],
    crossRegistryOverlaps: [],
  };
  const sources = [
    { registry: 'afrinic', sourceUrl: 'https://afrinic.example/stats', sourceSerial: 'a1', records: 12, documentationUrl: 'https://afrinic.example/readme', termsUrl: 'https://afrinic.example/terms', termsStatus: 'permission unresolved', attribution: 'AFRINIC source and disclaimer' },
    { registry: 'ripencc', sourceUrl: 'https://ripe.example/stats', sourceSerial: 'r1', records: 20, documentationUrl: 'https://ripe.example/readme', termsUrl: 'https://ripe.example/terms', termsStatus: 'separate terms status', attribution: 'RIPE NCC source' },
  ];
  const files = renderFiles(resources, sources, '2026-01-01T00:00:00.000Z');
  assert.equal(files.get('data/surge/IPv4.Nigeria.list'), 'IP-CIDR,192.0.2.0/24\n');
  assert.equal(files.get('data/quantumult-x/IPv4.Nigeria.list'), 'ip-cidr, 192.0.2.0/24, direct\n');
  assert.equal(files.get('data/IPv6.Nigeria.list'), '2001:db8::/32\n');
  const metadata = JSON.parse(files.get('data/metadata.json'));
  assert.deepEqual(metadata.sources.map(({ registry, termsStatus }) => [registry, termsStatus]), [
    ['afrinic', 'permission unresolved'], ['ripencc', 'separate terms status'],
  ]);
  assert.deepEqual(metadata.sources.map(({ attribution }) => attribution), ['AFRINIC source and disclaimer', 'RIPE NCC source']);
  assert.match(metadata.meaning, /not observed BGP routes/);
  const publicFiles = renderFiles(resources, sources.filter((source) => source.registry === 'afrinic'), '2026-01-01T00:00:00.000Z');
  assert.match(JSON.parse(publicFiles.get('data/metadata.json')).meaning, /^AFRINIC registry allocations/);
});
