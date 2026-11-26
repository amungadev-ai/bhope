import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { rewriteSharedImports, vendorApiShared } from './vendor-api-shared.mjs';

test('deployment rewrites module imports while preserving strings and comments', () => {
  const source = `
import { devotionalSeeds } from '@bhope/shared';
export { isPublicationDate } from "@bhope/shared";
const load = () => import('@bhope/shared');
const label = '@bhope/shared';
// Documentation example: import('@bhope/shared')
import { z } from 'zod';
`;
  const result = rewriteSharedImports(source, '../packages/shared/src/index.js');
  assert.ok(result.includes('from "../packages/shared/src/index.js"'));
  assert.ok(result.includes('import("../packages/shared/src/index.js")'));
  assert.ok(result.includes("const label = '@bhope/shared';"));
  assert.ok(result.includes("// Documentation example: import('@bhope/shared')"));
  assert.ok(result.includes("import { z } from 'zod';"));
  assert.equal(rewriteSharedImports(result, '../packages/shared/src/index.js'), result);
});

test('an isolated API database migration works with node_modules outside the application root', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'bhope-hosting-'));
  const application = join(temporary, 'domains', 'api', 'hope_api');
  const managed = join(temporary, 'nodevenv', 'node_modules');
  try {
    await mkdir(join(application, 'dist', 'nested'), { recursive: true });
    await mkdir(join(application, 'scripts'), { recursive: true });
    await mkdir(managed, { recursive: true });
    await symlink(managed, join(application, 'node_modules'), 'junction');
    await writeFile(
      join(application, 'package.json'),
      JSON.stringify({ type: 'module', dependencies: {} }),
    );
    await cp(
      new URL('../packages/shared/', import.meta.url),
      join(application, 'packages', 'shared'),
      { recursive: true },
    );
    await cp(new URL('../apps/api/migrations/', import.meta.url), join(application, 'migrations'), {
      recursive: true,
    });
    const source = await readFile(new URL('../apps/api/src/db.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
    }).outputText;
    await writeFile(join(application, 'dist', 'db.js'), compiled);
    await writeFile(
      join(application, 'dist', 'nested', 'inspiration.mjs'),
      `
export { getTikTokVideoId } from '@bhope/shared';
export const loadShared = () => import('@bhope/shared');
`,
    );
    await writeFile(
      join(application, 'scripts', 'probe.mjs'),
      `
import assert from 'node:assert/strict';
import { openDatabase, migrate } from '../dist/db.js';
import { getTikTokVideoId, loadShared } from '../dist/nested/inspiration.mjs';
import { isPublicationDate } from '@bhope/shared';
const db = await openDatabase({ DB_DRIVER: 'sqlite' }, ':memory:');
try {
  await migrate(db);
  const [{ total }] = await db.all('SELECT COUNT(*) AS total FROM devotionals');
  assert.ok(Number(total) > 0);
  assert.equal(isPublicationDate('2026-11-26'), true);
  assert.equal(getTikTokVideoId('https://www.tiktok.com/@beacon/video/1234567890123456789'), '1234567890123456789');
  assert.ok((await loadShared()).devotionalSeeds.length > 0);
  console.log('Isolated database migration passed.');
} finally {
  await db.close();
}
`,
    );
    const run = () =>
      spawnSync(process.execPath, ['scripts/probe.mjs'], {
        cwd: application,
        encoding: 'utf8',
        timeout: 10000,
        env: { ...process.env, NODE_PATH: '' },
      });
    const before = run();
    assert.equal(before.error, undefined);
    assert.equal(before.status, 1);
    assert.match(before.stderr, /Cannot find package '@bhope\/shared'/);
    const changed = await vendorApiShared(application);
    assert.equal(changed.length, 3);
    const after = run();
    assert.equal(after.error, undefined);
    assert.equal(after.status, 0, after.stderr);
    assert.match(after.stdout, /Isolated database migration passed/);
    assert.ok(
      (await readFile(join(application, 'dist', 'db.js'), 'utf8')).includes(
        '../packages/shared/src/index.js',
      ),
    );
    assert.ok(
      (await readFile(join(application, 'dist', 'nested', 'inspiration.mjs'), 'utf8')).includes(
        '../../packages/shared/src/index.js',
      ),
    );
    assert.deepEqual(await vendorApiShared(application), []);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
