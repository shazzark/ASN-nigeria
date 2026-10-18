const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readFile, readdir, rm, mkdir, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { collectAfrinicData } = require('../dist/collect.js');
const { publishFiles } = require('../dist/output/publish.js');
const { rename } = require('node:fs/promises');

const fixture = [
  '2|afrinic|fixture-serial|3|20260101|20260101|+0000',
  'afrinic|*|asn|*|1|summary', 'afrinic|*|ipv4|*|1|summary', 'afrinic|*|ipv6|*|1|summary',
  'afrinic|NG|asn|64512|1|20200101|allocated|holder-asn',
  'afrinic|NG|ipv4|192.0.2.1|2|20200102|assigned|holder-v4',
  'afrinic|NG|ipv6|2001:db8::|32|20200103|allocated|holder-v6',
].join('\n');

test('invalid source data preserves existing published outputs', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectAfrinicData(fixture, '2026-01-01T00:00:00.000Z', root);
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
  const before = await snapshot(join(root, 'data'));
  await assert.rejects(collectAfrinicData(fixture.replace('|3|', '|4|'), '2026-01-01T00:00:00.000Z', root), /count mismatch/);
  assert.deepEqual(await snapshot(join(root, 'data')), before);
});

test('identical records leave every output and metadata unchanged', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'asn-ng-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await collectAfrinicData(fixture, '2026-01-01T00:00:00.000Z', root);
  const paths = ['metadata.json', 'IP.Nigeria.list', 'resources.json'];
  const before = await Promise.all(paths.map((path) => readFile(join(root, 'data', path), 'utf8')));
  await collectAfrinicData(fixture.replace('fixture-serial', 'new-global-serial'), '2026-01-02T00:00:00.000Z', root);
  const after = await Promise.all(paths.map((path) => readFile(join(root, 'data', path), 'utf8')));
  assert.deepEqual(after, before);
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
