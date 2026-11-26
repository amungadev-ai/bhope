import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { devotionalSeeds } from '@bhope/shared';
import { createApp } from '../src/app.js';
import { createUser, verifyPassword } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { migrate, openDatabase, type Database } from '../src/db.js';
let db: Database;
const password = 'Studio-test-password42';
const config = {
  ...loadConfig(),
  NODE_ENV: 'test' as const,
  DB_DRIVER: 'sqlite' as const,
  DEEPSEEK_API_KEY: 'test-only-key',
};
let app: ReturnType<typeof createApp>;
let aiBody: Record<string, unknown>;
let aiResult: unknown;
beforeEach(async () => {
  db = await openDatabase(config, ':memory:');
  await migrate(db);
  aiResult = { ...devotionalSeeds[0].en };
  app = createApp(config, db, async (_url, options) => {
    aiBody = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult),
            },
          },
        ],
      }),
    );
  });
});
afterEach(async () => {
  await db.close();
});
async function login(role: 'admin' | 'editor' | 'user') {
  const user = await createUser(db, { email: `${role}@example.test`, name: role, password, role });
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password })
    .expect(200);
  return { user, token: response.body.token as string };
}
test('only an administrator creates an editor; passwords are hashed and creation is audited', async () => {
  const admin = await login('admin');
  const editor = await login('editor');
  const reader = await login('user');
  const input = { name: 'New Editor', email: 'NewEditor@example.test', password };
  await request(app).post('/api/v1/studio/editors').send(input).expect(401);
  for (const account of [editor, reader])
    await request(app)
      .post('/api/v1/studio/editors')
      .auth(account.token, { type: 'bearer' })
      .send(input)
      .expect(403);
  const created = await request(app)
    .post('/api/v1/studio/editors')
    .auth(admin.token, { type: 'bearer' })
    .send(input)
    .expect(201);
  assert.equal(created.body.role, 'editor');
  assert.equal(created.body.password, undefined);
  assert.equal(created.body.password_hash, undefined);
  const [row] = await db.all<{ password_hash: string }>(
    'SELECT password_hash FROM users WHERE id = ?',
    [created.body.id],
  );
  assert.notEqual(row.password_hash, password);
  assert.equal(await verifyPassword(password, row.password_hash), true);
  const [audit] = await db.all<{ actor_id: string; target_id: string }>(
    'SELECT actor_id, target_id FROM audit_events WHERE action = ?',
    ['editor:create'],
  );
  assert.equal(audit.actor_id, admin.user.id);
  assert.equal(audit.target_id, created.body.id);
  const signedIn = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: input.email.toLowerCase(), password })
    .expect(200);
  await request(app)
    .get('/api/v1/studio/devotionals')
    .auth(signedIn.body.token, { type: 'bearer' })
    .expect(200);
  await request(app)
    .get('/api/v1/studio/ai-access')
    .auth(signedIn.body.token, { type: 'bearer' })
    .expect(403);
  await request(app)
    .post('/api/v1/studio/editors')
    .auth(admin.token, { type: 'bearer' })
    .send(input)
    .expect(409);
  await request(app)
    .post('/api/v1/studio/editors')
    .auth(admin.token, { type: 'bearer' })
    .send({ ...input, email: 'other@example.test', role: 'admin' })
    .expect(400);
});
test('English-only devotionals publish successfully and still require English content', async () => {
  const { token } = await login('admin');
  const { sw: _translation, ...devotional } = { ...devotionalSeeds[0], id: 'english-only' };
  const save = (value: unknown) =>
    request(app)
      .put('/api/v1/studio/devotionals/english-only')
      .auth(token, { type: 'bearer' })
      .send({
        devotional: value,
        status: 'published',
        publishAt: new Date(Date.now() - 1000).toISOString(),
      });
  const result = await save(devotional).expect(200);
  assert.equal(result.body.sw.title, '');
  const published = await request(app).get('/api/v1/devotionals/english-only').expect(200);
  assert.equal(published.body.en.title, devotional.en.title);
  await save({
    ...devotional,
    en: { ...devotional.en, title: '' },
    sw: devotionalSeeds[0].sw,
  }).expect(400);
});
test('English-only inspiration titles can be published without a translation', async () => {
  const { token } = await login('admin');
  await request(app)
    .put('/api/v1/studio/inspirations/english-video')
    .auth(token, { type: 'bearer' })
    .send({
      id: 'english-video',
      title: 'A little hope',
      description: 'A message of encouragement.',
      url: 'https://www.tiktok.com/@ministry/video/7412345678901234567',
      category: 'HOPE',
      status: 'published',
      publishAt: new Date(Date.now() - 1000).toISOString(),
    })
    .expect(200);
  const feed = await request(app).get('/api/v1/inspirations').expect(200);
  assert.equal(feed.body[0].title, 'A little hope');
  assert.equal(feed.body[0].titleSw, '');
});
test('editorial AI drafts structured suggestions without saving or publishing them', async () => {
  const { token } = await login('editor');
  const response = await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(token, { type: 'bearer' })
    .send({
      kind: 'devotional',
      mode: 'draft',
      brief: 'Peace in difficult moments',
      reference: 'Philippians 4:6–7',
      language: 'en',
      consent: true,
    })
    .expect(200);
  assert.equal(response.body.fields.title, devotionalSeeds[0].en.title);
  assert.deepEqual(aiBody.response_format, { type: 'json_object' });
  assert.equal(
    (await db.all<{ total: number }>('SELECT COUNT(*) AS total FROM devotionals'))[0].total,
    2,
  );
  const access = await request(app)
    .get('/api/v1/ai/access')
    .auth(token, { type: 'bearer' })
    .expect(200);
  assert.equal(access.body.freeUsed, 0);
  assert.equal(access.body.staff, true);
});
test('AI refinement supports inspirations and rejects incomplete provider responses', async () => {
  const { token } = await login('editor');
  const input = {
    kind: 'inspiration',
    mode: 'refine',
    current: JSON.stringify({
      title: 'A little hope today',
      description: 'An invitation to trust.',
    }),
    consent: true,
  };
  aiResult = {
    title: 'Hope for today',
    description: 'A quiet encouragement to trust God.',
    status: 'published',
  };
  const response = await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(token, { type: 'bearer' })
    .send(input)
    .expect(200);
  assert.equal(response.body.fields.status, undefined);
  aiResult = '   ';
  await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(token, { type: 'bearer' })
    .send(input)
    .expect(502);
  aiResult = { title: 'Incomplete' };
  await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(token, { type: 'bearer' })
    .send(input)
    .expect(502);
});
test('AI drafting enforces staff access, consent, and a meaningful brief', async () => {
  const reader = await login('user');
  const editor = await login('editor');
  const input = { kind: 'devotional', mode: 'draft', brief: 'A reflection on hope', consent: true };
  await request(app).post('/api/v1/studio/ai/draft').send(input).expect(401);
  await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(reader.token, { type: 'bearer' })
    .send(input)
    .expect(403);
  await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(editor.token, { type: 'bearer' })
    .send({ ...input, consent: false })
    .expect(400);
  await request(app)
    .post('/api/v1/studio/ai/draft')
    .auth(editor.token, { type: 'bearer' })
    .send({ ...input, brief: '' })
    .expect(400);
});
