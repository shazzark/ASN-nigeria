const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCountryNetworks } = require('../dist/parsers/country-table.js');
const { normalizeNetworks } = require('../dist/validation/networks.js');

const page = (rows) => `<html><table><tr><th>ASN</th><th>Name</th><th>Routes</th></tr>${rows}</table></html>`;

test('parses country records and decodes HTML entities', () => {
  assert.deepEqual(parseCountryNetworks(page('<tr><td><a>AS64512</a></td><td>O&#39;Play&nbsp;Networks</td><td>2</td></tr>')),
    [{ asn: 64512, name: "O'Play Networks" }]);
});

test('normalizes names, deduplicates matching ASNs, and sorts numerically', () => {
  assert.deepEqual(normalizeNetworks([
    { asn: 20, name: '  Net\tTwo ' }, { asn: 3, name: 'First' }, { asn: 20, name: 'Net Two' },
  ]), [{ asn: 3, name: 'First' }, { asn: 20, name: 'Net Two' }]);
});

test('rejects missing tables, malformed rows, and empty results', () => {
  assert.throws(() => parseCountryNetworks('<html><p>blocked</p></html>'), /Could not find/);
  assert.throws(() => parseCountryNetworks(page('<tr><td>ASx</td><td>Bad</td></tr>')), /Malformed ASN/);
  assert.throws(() => parseCountryNetworks(page('')), /no ASN records/);
});

test('rejects invalid ASNs, unsafe rule names, and conflicting duplicate names', () => {
  assert.throws(() => normalizeNetworks([{ asn: 0, name: 'Bad' }]), /Invalid ASN/);
  assert.throws(() => normalizeNetworks([{ asn: 1, name: 'Good\nIP-ASN,2' }]), /Unsafe/);
  assert.throws(() => normalizeNetworks([{ asn: 1, name: 'One' }, { asn: 1, name: 'Two' }]), /Conflicting/);
  assert.throws(() => normalizeNetworks([]), /empty/);
});
