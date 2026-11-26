import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { migrate, openDatabase } from '../src/db.js';
import { readUserInput } from '../src/user-input.js';

const env = {
  CREATE_USER_EMAIL: ' ADMIN@example.com ',
  CREATE_USER_NAME: ' First Admin ',
  CREATE_USER_PASSWORD: 'Example-test-password42',
};

test('Node manager account settings create an administrator who can sign into the studio', async () => {
  const input = await readUserInput({ args: [], env });
  assert.equal(input.email, 'admin@example.com');
  assert.equal(input.name, 'First Admin');
  assert.equal(input.role, 'admin');
  const config = { ...loadConfig(), NODE_ENV: 'test' as const, DB_DRIVER: 'sqlite' as const };
  const db = await openDatabase(config, ':memory:');
  try {
    await migrate(db);
    await createUser(db, input);
    const app = createApp(config, db);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: input.email, password: env.CREATE_USER_PASSWORD })
      .expect(200);
    assert.equal(login.body.user.role, 'admin');
    await request(app)
      .get('/api/v1/studio/devotionals')
      .auth(login.body.token, { type: 'bearer' })
      .expect(200);
    await assert.rejects(createUser(db, input));
    assert.equal((await db.all('SELECT id FROM users')).length, 1);
  } finally {
    await db.close();
  }
});

test('terminal flags override environment identity and role settings', async () => {
  const input = await readUserInput({
    args: ['--email', 'editor@example.com', '--name', 'Editor', '--role', 'editor'],
    env: { ...env, CREATE_USER_ROLE: 'admin' },
  });
  assert.equal(input.email, 'editor@example.com');
  assert.equal(input.name, 'Editor');
  assert.equal(input.role, 'editor');
  assert.equal(input.password, env.CREATE_USER_PASSWORD);
});

test('headless setup reports every missing field without prompting or revealing supplied secrets', async () => {
  await assert.rejects(
    readUserInput({ args: [], env: { CREATE_USER_PASSWORD: env.CREATE_USER_PASSWORD } }),
    (error: Error) => {
      assert.match(error.message, /CREATE_USER_EMAIL, CREATE_USER_NAME/);
      assert.doesNotMatch(error.message, /Example-test-password42/);
      return true;
    },
  );
  await assert.rejects(readUserInput({ args: [], env: {} }), /CREATE_USER_PASSWORD/);
});

test('invalid account settings report field names without logging their values', async () => {
  await assert.rejects(
    readUserInput({
      args: [],
      env: {
        CREATE_USER_EMAIL: 'invalid-address',
        CREATE_USER_NAME: ' ',
        CREATE_USER_ROLE: 'owner',
        CREATE_USER_PASSWORD: 'secret!?',
      },
    }),
    (error: Error) => {
      assert.match(error.message, /email, name, role, password/);
      assert.doesNotMatch(error.message, /invalid-address|secret!\?/);
      return true;
    },
  );
});

test('interactive setup prompts only for missing fields and preserves the full password', async () => {
  const prompted: string[] = [];
  const input = await readUserInput({
    args: [],
    env: { CREATE_USER_EMAIL: 'reader@example.com', CREATE_USER_ROLE: 'user' },
    prompt: async (field) => {
      prompted.push(field);
      return field === 'name' ? 'Reader' : '  A full password42  ';
    },
  });
  assert.deepEqual(prompted, ['name', 'password']);
  assert.equal(input.password, '  A full password42  ');
  assert.equal(input.role, 'user');
});

test('a non-interactive staff command exits with a useful error rather than waiting for stdin', () => {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(new URL('../scripts/create-user.ts', import.meta.url))],
    {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        CREATE_USER_EMAIL: '',
        CREATE_USER_NAME: '',
        CREATE_USER_ROLE: 'admin',
        CREATE_USER_PASSWORD: env.CREATE_USER_PASSWORD,
      },
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing account settings: CREATE_USER_EMAIL, CREATE_USER_NAME/);
  assert.doesNotMatch(result.stderr + result.stdout, /Example-test-password42|Password \(hidden\)/);
});
