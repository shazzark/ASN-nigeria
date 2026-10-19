const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, rm, mkdir, writeFile, stat, utimes, rename } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { collectDelegatedData } = require('../dist/collect.js');
const { publishFiles } = require('../dist/output/publish.js');

function source(registry, serial, rows) {
  const counts = Object.fromEntries(['asn', 'ipv4', 'ipv6'].map((type) => [type, rows.filter((row) => row.split('|')[2] === type).length]));
  return [`2|${registry}|${serial}|${rows.length}|20260101|20260101|+0000`,
    `${registry}|*|asn|*|${counts.asn}|summary`, `${registry}|*|ipv4|*|${counts.ipv4}|summary`, `${registry}|*|ipv6|*|${counts.ipv6}|summary`, ...rows].join('\n');
}
const afrRows = [
  'afrinic|NG|asn|64512|1|20200101|allocated|holder-asn',
  'afrinic|NG|ipv4|192.0.2.0|256|20200102|assigned|holder-v4',
  'afrinic|NG|ipv6|2001:db8::|32|20200103|allocated|holder-v6',
];
const ripeRows = [
  'ripencc|NG|asn|64513|1|20210101|allocated|holder-asn-ripe',
  'ripencc|NG|ipv4|198.51.100.0|256|20210102|assigned|holder-v4-ripe',
  'ripencc|NG|ipv6|2001:db8:2::|48|20210103|allocated|holder-v6-ripe',
];
const fixture = (ripeSerial = 'ripe-serial') => ({
  afrinic: source('afrinic', 'afri-serial', afrRows),
  ripencc: source('ripencc', ripeSerial, ripeRows),
});

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

test('invalid AFRINIC source data preserves existing outputs', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectDelegatedData(fixture(), '2026-01-01T00:00:00.000Z', root);
  const before = await snapshot(join(root, 'data'));
  const invalid = fixture();
  invalid.afrinic = invalid.afrinic.replace('|3|', '|4|');
  await assert.rejects(collectDelegatedData(invalid, '2026-01-02T00:00:00.000Z', root), /count mismatch/);
  assert.deepEqual(await snapshot(join(root, 'data')), before);
});

test('collector ignores RIPE fixture data and emits only AFRINIC-derived public files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectDelegatedData(fixture(), '2026-01-01T00:00:00.000Z', root);
  const publicMetadata = JSON.parse(await readFile(join(root, 'data', 'metadata.json'), 'utf8'));
  const publicFiles = await snapshot(join(root, 'data'));
  assert.deepEqual(publicMetadata.sources.map((source) => source.registry), ['afrinic']);
  assert.equal((await readFile(join(root, 'data', 'asns.txt'), 'utf8')).trim(), '64512');
  for (const contents of publicFiles.values()) {
    assert.doesNotMatch(contents, /ripencc|64513|198\.51\.100\.0|holder-asn-ripe|holder-v4-ripe|holder-v6-ripe/);
  }
});

test('unchanged records leave list files untouched while changed source serial refreshes only provenance metadata', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectDelegatedData(fixture(), '2026-01-01T00:00:00.000Z', root);
  const listPath = join(root, 'data', 'IP.Nigeria.list');
  const oldTime = new Date('2020-01-01T00:00:00.000Z');
  await utimes(listPath, oldTime, oldTime);
  const before = await stat(listPath);
  const changedAfrinicSerial = { ...fixture(), afrinic: fixture().afrinic.replace('afri-serial', 'afri-serial-2') };
  await collectDelegatedData(changedAfrinicSerial, '2026-01-02T00:00:00.000Z', root);
  const after = await stat(listPath);
  assert.equal(after.mtimeMs, before.mtimeMs);
  const metadata = JSON.parse(await readFile(join(root, 'data', 'metadata.json'), 'utf8'));
  assert.equal(metadata.sources.find((source) => source.registry === 'afrinic').sourceSerial, 'afri-serial-2');
});

test('replacement failure restores every previously published file', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'data'), { recursive: true });
  await writeFile(join(root, 'data', 'first.txt'), 'old first', 'utf8');
  await writeFile(join(root, 'data', 'second.txt'), 'old second', 'utf8');
  let renames = 0;
  const failSecondRename = async (from, to) => {
    renames++;
    if (renames === 2) throw new Error('injected replacement failure');
    return rename(from, to);
  };
  await assert.rejects(publishFiles(new Map([
    ['data/first.txt', 'new first'],
    ['data/second.txt', 'new second'],
  ]), root, failSecondRename), /injected replacement failure/);
  assert.equal(await readFile(join(root, 'data', 'first.txt'), 'utf8'), 'old first');
  assert.equal(await readFile(join(root, 'data', 'second.txt'), 'utf8'), 'old second');
});
