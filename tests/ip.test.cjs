const test = require('node:test');
const assert = require('node:assert/strict');
const { ipv4RangeToCidrs, ipv6PrefixToCidr, sortCidrs } = require('../dist/validation/ip.js');

test('converts aligned and unaligned IPv4 start/count ranges to exact CIDRs', () => {
  assert.deepEqual(ipv4RangeToCidrs('192.0.2.0', '256'), ['192.0.2.0/24']);
  assert.deepEqual(ipv4RangeToCidrs('192.0.2.1', '10'), ['192.0.2.1/32', '192.0.2.2/31', '192.0.2.4/30', '192.0.2.8/31', '192.0.2.10/32']);
});

test('validates IPv4 ranges and IPv6 prefix length and alignment', () => {
  assert.throws(() => ipv4RangeToCidrs('001.2.3.4', '1'), /Invalid IPv4/);
  assert.throws(() => ipv4RangeToCidrs('256.0.0.1', '1'), /Invalid IPv4/);
  assert.throws(() => ipv4RangeToCidrs('255.255.255.255', '2'), /exceeds address space/);
  assert.equal(ipv6PrefixToCidr('2001:0db8:0001:0000::', '48'), '2001:db8:1::/48');
  assert.throws(() => ipv6PrefixToCidr('2001:db8:1::1', '48'), /not aligned/);
  assert.throws(() => ipv6PrefixToCidr('2001:db8::', '129'), /out of range/);
  assert.throws(() => ipv6PrefixToCidr('not-ipv6', '48'), /Invalid IPv6/);
});

test('sorts numerically, separates families, and removes exact duplicates only', () => {
  assert.deepEqual(sortCidrs(['2001:db8::/32', '10.0.0.0/8', '10.0.0.0/8', '10.0.0.0/9']), ['10.0.0.0/8', '10.0.0.0/9', '2001:db8::/32']);
});
