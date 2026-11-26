import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

async function fixture(source, run) {
  const parent = fileURLToPath(new URL('../.local/', import.meta.url));
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'startup-test-'));
  try {
    await mkdir(join(directory, 'dist'));
    await mkdir(join(directory, 'public'));
    await writeFile(join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    await writeFile(join(directory, 'dist', 'index.js'), source);
    await writeFile(
      join(directory, 'app.cjs'),
      await readFile(new URL('../apps/api/app.cjs', import.meta.url)),
    );
    await run(directory, (env = {}) =>
      spawnSync(process.execPath, [join(directory, 'app.cjs')], {
        cwd: join(directory, 'public'),
        encoding: 'utf8',
        timeout: 5000,
        env: { ...process.env, ...env },
      }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('startup logs identify import failures and redact configured secrets from all diagnostic output', async () => {
  await fixture(
    `
const error = new Error('Login failed: ' + process.env.DB_PASSWORD + '\\nAPI key: ' + process.env.DEEPSEEK_API_KEY);
error.code = 'ER_ACCESS_DENIED_ERROR';
error.config = { password: 'DO_NOT_PRINT_ERROR_OBJECT' };
throw error;
`,
    async (directory, run) => {
      const result = run({
        DB_PASSWORD: 'PASSWORD_FOR_REDACTION_TEST42',
        DEEPSEEK_API_KEY: 'API_KEY_FOR_REDACTION_TEST42',
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      const log = await readFile(join(directory, 'startup.log'), 'utf8');
      assert.match(log, /\[BOOT\]/);
      assert.match(log, /\[ER_ACCESS_DENIED_ERROR\]/);
      assert.match(log, /Login failed: \[redacted\] API key: \[redacted\]/);
      assert.doesNotMatch(log, /MODULE_LOADED/);
      const output = log + result.stdout + result.stderr;
      assert.doesNotMatch(
        output,
        /PASSWORD_FOR_REDACTION_TEST42|API_KEY_FOR_REDACTION_TEST42|DO_NOT_PRINT_ERROR_OBJECT/,
      );
      if (process.platform !== 'win32')
        assert.equal((await stat(join(directory, 'startup.log'))).mode & 0o077, 0);
    },
  );
});

test('successful startup imports relative to the entry file and records module loading outside public', async () => {
  await fixture('console.log("Fixture API loaded");', async (directory, run) => {
    const result = run();
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    const log = await readFile(join(directory, 'startup.log'), 'utf8');
    assert.match(log, /\[BOOT\]/);
    assert.match(log, /\[MODULE_LOADED\]/);
    assert.match(result.stdout, /Fixture API loaded/);
    await assert.rejects(stat(join(directory, 'public', 'startup.log')), { code: 'ENOENT' });
  });
});

test('diagnostic file failures preserve the original startup error and failure exit code', async () => {
  await fixture(
    'throw Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" });',
    async (directory, run) => {
      await mkdir(join(directory, 'startup.log'));
      const result = run();
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\[ECONNREFUSED\] Connection refused/);
      assert.match(result.stderr, /Could not write startup.log/);
    },
  );
});

test('fatal listener errors after the startup module loads are recorded before exit', async () => {
  await fixture(
    `
setImmediate(() => {
  throw Object.assign(new Error('Address already in use'), { code: 'EADDRINUSE' });
});
`,
    async (directory, run) => {
      const result = run();
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1);
      const log = await readFile(join(directory, 'startup.log'), 'utf8');
      assert.match(log, /\[MODULE_LOADED\]/);
      assert.match(log, /\[EADDRINUSE\]/);
    },
  );
});
