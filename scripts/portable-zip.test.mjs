import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32, inflateRawSync } from 'node:zlib';
import { createZip, readZipEntries } from './portable-zip.mjs';

// Read the ZIP central directory and local records independently of the writer.
function unpack(zip) {
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  const count = zip.readUInt16LE(end + 10);
  let cursor = zip.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(cursor), 0x02014b50);
    const length = zip.readUInt16LE(cursor + 28);
    const name = zip.subarray(cursor + 46, cursor + 46 + length).toString('utf8');
    const local = zip.readUInt32LE(cursor + 42);
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    const localNameLength = zip.readUInt16LE(local + 26);
    assert.equal(zip.subarray(local + 30, local + 30 + localNameLength).toString('utf8'), name);
    assert.equal(zip.readUInt16LE(cursor + 8) & 0x0800, 0x0800);
    const start = local + 30 + localNameLength + zip.readUInt16LE(local + 28);
    const compressed = zip.subarray(start, start + zip.readUInt32LE(cursor + 20));
    const data = zip.readUInt16LE(cursor + 10) === 8 ? inflateRawSync(compressed) : compressed;
    assert.equal(data.length, zip.readUInt32LE(cursor + 24));
    assert.equal(crc32(data), zip.readUInt32LE(cursor + 16));
    assert.equal(crc32(data), zip.readUInt32LE(local + 14));
    files.set(name, { data, mode: zip.readUInt32LE(cursor + 38) >>> 16 });
    cursor += 46 + length + zip.readUInt16LE(cursor + 30) + zip.readUInt16LE(cursor + 32);
  }
  assert.equal(cursor, end);
  return files;
}

test('Windows paths become ZIP directory paths and preserve binary and Unicode contents', () => {
  const binary = Buffer.from([0, 255, 10, 13, 128, 32, 0]);
  const files = unpack(
    createZip([
      { name: 'public\\', data: Buffer.alloc(0) },
      { name: 'public\\console\\index.html', data: Buffer.from('<html>Beacon of Hope</html>') },
      { name: 'public\\console\\assets\\font.ttf', data: binary },
      { name: 'dist\\index.js', data: Buffer.from('console.log("ready");') },
      { name: 'packages\\shared\\tumaini-é.txt', data: Buffer.from('Tumaini na upendo — hope') },
      { name: 'empty.txt', data: Buffer.alloc(0) },
    ]),
  );
  assert.equal(
    [...files.keys()].some((name) => name.includes('\\')),
    false,
  );
  assert.equal(files.get('public/').mode, 0o40755);
  assert.equal(files.get('dist/index.js').mode, 0o100644);
  assert.equal(
    files.get('public/console/index.html').data.toString(),
    '<html>Beacon of Hope</html>',
  );
  assert.deepEqual(files.get('public/console/assets/font.ttf').data, binary);
  assert.equal(
    files.get('packages/shared/tumaini-é.txt').data.toString(),
    'Tumaini na upendo — hope',
  );
  assert.equal(files.get('empty.txt').data.length, 0);
});

test('directory packaging keeps the public and backend folders at the archive root', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bhope-zip-'));
  try {
    for (const path of [
      'public/console/assets',
      'dist',
      'migrations',
      'packages/shared',
      'scripts',
    ])
      await mkdir(join(directory, path), { recursive: true });
    await writeFile(join(directory, 'app.cjs'), 'import("./dist/index.js");');
    await writeFile(join(directory, '.env.example'), 'DB_PASSWORD=');
    await writeFile(join(directory, 'public/console/index.html'), 'Studio');
    const files = unpack(createZip(await readZipEntries(directory)));
    for (const name of [
      'app.cjs',
      '.env.example',
      'public/',
      'public/console/',
      'public/console/assets/',
      'dist/',
      'migrations/',
      'packages/shared/',
      'scripts/',
    ])
      assert.equal(files.has(name), true, `${name} should be present`);
    assert.equal(files.get('public/console/index.html').data.toString(), 'Studio');
    assert.equal(
      [...files.keys()].some((name) => name.startsWith('deploy-api/')),
      false,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('archive names reject traversal, absolute paths, and duplicate normalized entries', () => {
  for (const name of ['../.env', '/absolute.js', 'C:\\private\\file', 'public/../.env'])
    assert.throws(() => createZip([{ name, data: Buffer.alloc(0) }]), /relative paths/);
  assert.throws(
    () =>
      createZip([
        { name: 'dist\\index.js', data: Buffer.from('a') },
        { name: 'dist/index.js', data: Buffer.from('b') },
      ]),
    /Duplicate archive entry/,
  );
});
