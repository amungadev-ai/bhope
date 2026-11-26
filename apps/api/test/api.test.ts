import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { devotionalSeeds } from '@bhope/shared';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { migrate, openDatabase, type Database } from '../src/db.js';
import { createUser } from '../src/auth.js';
let db: Database;
let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  const config = {
    ...loadConfig(),
    NODE_ENV: 'test' as const,
    DB_DRIVER: 'sqlite' as const,
    DEEPSEEK_API_KEY: '',
  };
  db = await openDatabase(config, ':memory:');
  await migrate(db);
  app = createApp(config, db);
});
afterEach(async () => {
  await db.close();
});
async function register(email: string) {
  const result = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, name: 'Reader', password: 'LongEnoughPassword42', role: 'admin' })
    .expect(201);
  return result.body;
}
const note = {
  id: 'private-note',
  title: 'Sunday',
  body: 'John 3:16 and a private thought.',
  kind: 'sermon',
  preacher: '',
  church: '',
  sermonDate: '2026-11-26',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
test('health checks the database without exposing configuration', async () => {
  const result = await request(app).get('/api/v1/health').expect(200);
  assert.deepEqual(result.body, { status: 'ok', service: 'beacon-of-hope-api' });
});
test('registration cannot grant staff privileges and anonymous notes are blocked', async () => {
  await request(app).get('/api/v1/notes').expect(401);
  const account = await register('reader@example.com');
  assert.equal(account.user.role, 'user');
  assert.equal(account.user.password_hash, undefined);
  await request(app)
    .get('/api/v1/studio/devotionals')
    .auth(account.token, { type: 'bearer' })
    .expect(403);
});
test('private notes are scoped to their owner, including deletes', async () => {
  const a = await register('a@example.com');
  const b = await register('b@example.com');
  await request(app)
    .put(`/api/v1/notes/${note.id}`)
    .auth(a.token, { type: 'bearer' })
    .send({ note, revision: 0 })
    .expect(200);
  const other = await request(app)
    .get('/api/v1/notes')
    .auth(b.token, { type: 'bearer' })
    .expect(200);
  assert.deepEqual(other.body, []);
  await request(app)
    .delete(`/api/v1/notes/${note.id}`)
    .auth(b.token, { type: 'bearer' })
    .expect(204);
  const owner = await request(app)
    .get('/api/v1/notes')
    .auth(a.token, { type: 'bearer' })
    .expect(200);
  assert.equal(owner.body[0].note.body, note.body);
});
test('stale note revisions fail instead of silently replacing a newer edit', async () => {
  const { token } = await register('a@example.com');
  const put = (revision: number) =>
    request(app)
      .put(`/api/v1/notes/${note.id}`)
      .auth(token, { type: 'bearer' })
      .send({ note, revision });
  await put(0).expect(200);
  await put(0).expect(409);
  const updated = await put(1).expect(200);
  assert.equal(updated.body.revision, 2);
  await put(1).expect(409);
});
test('dashboard cookies authenticate and logout revokes the session', async () => {
  const agent = request.agent(app);
  await agent
    .post('/api/v1/auth/register')
    .send({ email: 'cookie@example.com', name: 'Reader', password: 'LongEnoughPassword42' })
    .expect(201);
  await agent.get('/api/v1/auth/me').expect(200);
  await agent.post('/api/v1/auth/logout').send({}).expect(204);
  await agent.get('/api/v1/auth/me').expect(401);
});
test('editors submit drafts while administrators approve and schedule publication', async () => {
  await createUser(db, {
    email: 'editor@example.com',
    name: 'Editor',
    password: 'LongEnoughPassword42',
    role: 'editor',
  });
  await createUser(db, {
    email: 'admin@example.com',
    name: 'Admin',
    password: 'LongEnoughPassword42',
    role: 'admin',
  });
  const editor = (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'editor@example.com', password: 'LongEnoughPassword42' })
  ).body.token;
  const admin = (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'LongEnoughPassword42' })
  ).body.token;
  const devotional = { ...devotionalSeeds[0], id: 'scheduled-example' };
  const future = new Date(Date.now() + 86400000).toISOString();
  await request(app)
    .put(`/api/v1/studio/devotionals/${devotional.id}`)
    .auth(editor, { type: 'bearer' })
    .send({ devotional, status: 'review', publishAt: null })
    .expect(200);
  await request(app)
    .put(`/api/v1/studio/devotionals/${devotional.id}`)
    .auth(editor, { type: 'bearer' })
    .send({ devotional, status: 'published', publishAt: future })
    .expect(403);
  await request(app)
    .put(`/api/v1/studio/devotionals/${devotional.id}`)
    .auth(admin, { type: 'bearer' })
    .send({ devotional, status: 'published', publishAt: future })
    .expect(200);
  const publicItems = (await request(app).get('/api/v1/devotionals').expect(200)).body;
  assert.equal(
    publicItems.some((item: { id: string }) => item.id === devotional.id),
    false,
  );
  const past = new Date(Date.now() - 1000).toISOString();
  await request(app)
    .put(`/api/v1/studio/devotionals/${devotional.id}`)
    .auth(admin, { type: 'bearer' })
    .send({ devotional, status: 'published', publishAt: past })
    .expect(200);
  assert.equal((await request(app).get('/api/v1/devotionals')).body[0].id, devotional.id);
});
test('AI requires explicit consent and a configured server key', async () => {
  const { token } = await register('ai@example.com');
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(token, { type: 'bearer' })
    .send({ action: 'summarize', text: note.body, language: 'en' })
    .expect(400);
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(token, { type: 'bearer' })
    .send({ action: 'summarize', text: note.body, language: 'en', consent: true })
    .expect(503);
});
test('rejects unapproved browser origins and malformed request bodies', async () => {
  await request(app).get('/api/v1/config').set('Origin', 'https://unapproved.example').expect(403);
  await request(app)
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .send('{')
    .expect(400);
});
test('only administrators manage roles, and changes are audited', async () => {
  const reader = await register('roles-reader@example.com');
  const admin = await createUser(db, {
    email: 'roles-admin@example.com',
    name: 'Admin',
    password: 'LongEnoughPassword42',
    role: 'admin',
  });
  const token = (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: admin.email, password: 'LongEnoughPassword42' })
  ).body.token;
  await request(app).get('/api/v1/studio/users').auth(reader.token, { type: 'bearer' }).expect(403);
  await request(app)
    .patch(`/api/v1/studio/users/${admin.id}/role`)
    .auth(token, { type: 'bearer' })
    .send({ role: 'user' })
    .expect(400);
  await request(app)
    .patch(`/api/v1/studio/users/${reader.user.id}/role`)
    .auth(token, { type: 'bearer' })
    .send({ role: 'editor' })
    .expect(204);
  const account = await request(app)
    .get('/api/v1/auth/me')
    .auth(reader.token, { type: 'bearer' })
    .expect(200);
  assert.equal(account.body.role, 'editor');
  assert.equal((await db.all('SELECT * FROM audit_events')).length, 1);
});
test('AI allowance is reserved atomically before calling the upstream service', async () => {
  const account = await register('allowance@example.com');
  let calls = 0;
  const aiFetch: typeof fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'A suggestion to review.' } }] }),
      { status: 200 },
    );
  };
  app = createApp(
    { ...loadConfig(), NODE_ENV: 'test', DEEPSEEK_API_KEY: 'test-key', AI_DAILY_LIMIT: 1 },
    db,
    aiFetch,
  );
  const payload = { action: 'summarize', text: note.body, language: 'en', consent: true };
  const result = await request(app)
    .post('/api/v1/ai/assist')
    .auth(account.token, { type: 'bearer' })
    .send(payload)
    .expect(200);
  assert.equal(result.body.text, 'A suggestion to review.');
  await request(app)
    .post('/api/v1/ai/assist')
    .auth(account.token, { type: 'bearer' })
    .send(payload)
    .expect(429);
  assert.equal(calls, 1);
});
