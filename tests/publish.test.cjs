const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile, mkdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { publishFiles } = require('../dist/output/publish.js');
const { collectFromHtml } = require('../dist/collect.js');

test('validation failure before publishing leaves existing output unchanged', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'data', 'asns.txt');
  await mkdir(join(root, 'data'));
  await writeFile(output, '64512\n');
  await assert.rejects(collectFromHtml('<html><p>broken source</p></html>', '2026-01-01T00:00:00.000Z', root), /Could not find/);
  assert.equal(await readFile(output, 'utf8'), '64512\n');
});

test('stages and publishes all files when output succeeds', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await publishFiles(new Map([['data/asns.txt', '64512\n'], ['data/networks.json', '[]\n']]), root);
  assert.equal(await readFile(join(root, 'data', 'asns.txt'), 'utf8'), '64512\n');
  assert.equal(await readFile(join(root, 'data', 'networks.json'), 'utf8'), '[]\n');
});

test('unchanged ASN records do not rewrite the successful fetch metadata', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const html = '<table><tr><th>ASN</th><th>Name</th></tr><tr><td>AS64512</td><td>Example Network</td></tr></table>';
  await collectFromHtml(html, '2026-01-01T00:00:00.000Z', root);
  const metadataPath = join(root, 'data', 'metadata.json');
  const before = await readFile(metadataPath, 'utf8');
  await collectFromHtml(html, '2026-01-02T00:00:00.000Z', root);
  assert.equal(await readFile(metadataPath, 'utf8'), before);
});
