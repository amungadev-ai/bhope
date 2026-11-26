import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import { migrate, openDatabase, type Database } from '../src/db.js';
import { createUser } from '../src/auth.js';
let db: Database;
let config: Config;
let app: ReturnType<typeof createApp>;
let upstreamCalls: number;
let upstreamFails: boolean;
const upstream: typeof fetch = async () => {
  upstreamCalls += 1;
  await new Promise((resolve) => setTimeout(resolve, 10));
  return upstreamFails
    ? new Response('{}', { status: 503 })
    : new Response(
        JSON.stringify({ choices: [{ message: { content: 'Suggestions to review.' } }] }),
        { status: 200 },
      );
};
beforeEach(async () => {
  config = {
    ...loadConfig(),
    NODE_ENV: 'test',
    DB_DRIVER: 'sqlite',
    DEEPSEEK_API_KEY: 'unit-test-key',
    AI_DAILY_LIMIT: 20,
  };
  db = await openDatabase(config, ':memory:');
  await migrate(db);
  upstreamCalls = 0;
  upstreamFails = false;
  app = createApp(config, db, upstream);
});
afterEach(async () => {
  await db.close();
});
async function account(role: 'user' | 'editor' | 'admin' = 'user') {
  const user = await createUser(db, {
    email: `${role}@example.test`,
    name: role,
    role,
    password: 'LongEnoughPassword42',
  });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: 'LongEnoughPassword42' })
    .expect(200);
  return { ...user, token: response.body.token };
}
const payload = {
  action: 'summarize',
  text: 'John 3:16 and a personal reflection about hope.',
  language: 'en',
  consent: true,
};
test('five free AI uses are lifetime and cannot be reset by restarting the app or changing the day', async () => {
  const user = await account();
  for (let i = 0; i < 5; i++)
    await request(app)
      .post('/api/v1/ai/assist')
      .auth(user.token, { type: 'bearer' })
      .send(payload)
      .expect(200);
  await db.run('DELETE FROM daily_ai_usage');
  app = createApp(config, db, upstream);
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(user.token, { type: 'bearer' })
    .send(payload)
    .expect(402);
  const state = (
    await request(app).get('/api/v1/ai/access').auth(user.token, { type: 'bearer' }).expect(200)
  ).body;
  assert.equal(state.freeRemaining, 0);
  assert.equal(state.monthlyPrice, 150);
  assert.equal(state.billingAvailable, false);
  assert.equal(upstreamCalls, 5);
});
test('concurrent AI requests cannot exceed the five-use allowance', async () => {
  const user = await account();
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      request(app).post('/api/v1/ai/assist').auth(user.token, { type: 'bearer' }).send(payload),
    ),
  );
  assert.equal(responses.filter((result) => result.status === 200).length, 5);
  assert.equal(responses.filter((result) => result.status === 402).length, 3);
  assert.equal(upstreamCalls, 5);
});
test('provider errors restore the free credit without restoring the daily abuse allowance', async () => {
  const user = await account();
  upstreamFails = true;
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(user.token, { type: 'bearer' })
    .send(payload)
    .expect(502);
  let state = (await request(app).get('/api/v1/ai/access').auth(user.token, { type: 'bearer' }))
    .body;
  assert.equal(state.freeRemaining, 5);
  assert.equal(state.dailyRemaining, 19);
  upstreamFails = false;
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(user.token, { type: 'bearer' })
    .send(payload)
    .expect(200);
  state = (await request(app).get('/api/v1/ai/access').auth(user.token, { type: 'bearer' })).body;
  assert.equal(state.freeRemaining, 4);
});
test('only admins may adjust access; expiry and audit do not create donations or reset free usage', async () => {
  const user = await account(),
    admin = await account('admin'),
    editor = await account('editor');
  await request(app)
    .get('/api/v1/studio/ai-access')
    .auth(editor.token, { type: 'bearer' })
    .expect(403);
  await request(app)
    .patch(`/api/v1/studio/ai-access/${user.id}`)
    .auth(user.token, { type: 'bearer' })
    .send({ paidUntil: null, reason: 'Unauthorised change' })
    .expect(403);
  const paidUntil = new Date(Date.now() + 30 * 86400000).toISOString();
  await request(app)
    .patch(`/api/v1/studio/ai-access/${user.id}`)
    .auth(admin.token, { type: 'bearer' })
    .send({ paidUntil, reason: 'Documented complimentary testing access' })
    .expect(204);
  await db.run('UPDATE ai_access SET free_used = 5 WHERE user_id = ?', [user.id]);
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(user.token, { type: 'bearer' })
    .send(payload)
    .expect(200);
  assert.equal((await db.all('SELECT * FROM ai_access_events')).length, 1);
  assert.equal((await db.all('SELECT * FROM donations')).length, 0);
  await db.run('UPDATE ai_access SET paid_until = ? WHERE user_id = ?', [
    '2000-01-01T00:00:00.000Z',
    user.id,
  ]);
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(user.token, { type: 'bearer' })
    .send(payload)
    .expect(402);
  const report = (
    await request(app)
      .get('/api/v1/studio/ai-access')
      .auth(admin.token, { type: 'bearer' })
      .expect(200)
  ).body;
  assert.equal(report.items.find((item: { id: string }) => item.id === user.id).freeUsed, 5);
});
test('editorial staff retain assistance with a daily limit and no trial-credit consumption', async () => {
  const editor = await account('editor');
  for (let i = 0; i < 6; i++)
    await request(app)
      .post('/api/v1/ai/assist')
      .auth(editor.token, { type: 'bearer' })
      .send({ ...payload, action: 'outline' })
      .expect(200);
  const state = (await request(app).get('/api/v1/ai/access').auth(editor.token, { type: 'bearer' }))
    .body;
  assert.equal(state.staff, true);
  assert.equal(state.freeUsed, 0);
  assert.equal(state.dailyRemaining, 14);
});
