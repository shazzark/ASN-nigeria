const test = require('node:test');
const assert = require('node:assert/strict');
const { renderFiles } = require('../dist/output/render.js');

test('renders separate Surge and Quantumult X formats with distinct syntax', () => {
  const resources = {
    asns: [{ asn: 64512, name: null, holderId: 'h', date: '20200101', status: 'allocated' }],
    ipv4: [{ cidr: '192.0.2.0/24', holderId: 'h', date: '20200101', status: 'assigned' }],
    ipv6: [{ cidr: '2001:db8::/32', holderId: 'h', date: '20200101', status: 'allocated' }],
  };
  const files = renderFiles(resources, 'serial-1', '2026-01-01T00:00:00.000Z');
  assert.equal(files.get('data/surge/IP.Nigeria.list'), 'IP-CIDR,192.0.2.0/24\nIP-CIDR6,2001:db8::/32\n');
  assert.equal(files.get('data/quantumult-x/IP.Nigeria.list'), 'ip-cidr, 192.0.2.0/24, direct\nip6-cidr, 2001:db8::/32, direct\n');
  assert.equal(files.get('data/quantumult-x/ASN.Nigeria.list'), 'ip-asn, 64512, direct\n');
  assert.equal(JSON.parse(files.get('data/networks.json'))[0].name, null);
  assert.match(files.get('data/metadata.json'), /not observed BGP routes/);
});
