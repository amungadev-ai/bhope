import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

test('mobile connection helper replaces the old URL and preserves other private settings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'beacon-connect-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    await mkdir(path.join(root, 'apps/mobile'), { recursive: true });
    const script = path.join(root, 'scripts/connect-mobile-api.mjs');
    const env = path.join(root, 'apps/mobile/.env');
    await copyFile(new URL('./connect-mobile-api.mjs', import.meta.url), script);
    const original =
      '# Keep this comment\r\nOTHER_SETTING="fixture #value"\r\nEXPO_PUBLIC_API_URL=https://old.invalid/api/v1\r\nexport EXPO_PUBLIC_API_URL=https://duplicate.invalid\r\n';
    await writeFile(env, original);
    const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    const result = await readFile(env, 'utf8');
    assert.equal(result.match(/EXPO_PUBLIC_API_URL=/g).length, 1);
    assert(result.includes('EXPO_PUBLIC_API_URL=https://api.billucsolutions.co.ke/api/v1\r\n'));
    assert(result.startsWith('# Keep this comment\r\nOTHER_SETTING="fixture #value"\r\n'));
    assert(!output.includes('fixture #value'));
    execFileSync(process.execPath, [script]);
    assert.equal(await readFile(env, 'utf8'), result);
    await rm(env);
    execFileSync(process.execPath, [script]);
    assert(
      (await readFile(env, 'utf8')).includes(
        'EXPO_PUBLIC_API_URL=https://api.billucsolutions.co.ke/api/v1',
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
