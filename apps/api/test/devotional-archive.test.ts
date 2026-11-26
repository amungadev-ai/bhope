import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { devotionalSeeds } from '@bhope/shared';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { migrate, openDatabase, type Database } from '../src/db.js';

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
  await db.run('DELETE FROM devotionals');
  app = createApp(config, db);
});
afterEach(async () => {
  await db.close();
});
async function add(id: string, date: string | null, status = 'published', title = id) {
  const item = {
    ...devotionalSeeds[0],
    id,
    en: { ...devotionalSeeds[0].en, title, reflection: 'A keyword only in the body.' },
    sw: { ...devotionalSeeds[0].sw, title: `Tumaini ${id}` },
  };
  await db.run(
    'INSERT INTO devotionals (id, payload, status, publish_at, author_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, JSON.stringify(item), status, date, null, new Date().toISOString()],
  );
}
test('the public archive and detail routes exclude drafts, reviews, undated, and future publications', async () => {
  await add('visible', '2020-01-01T12:00:00.000Z');
  await add('private-draft', '2020-01-01T12:00:00.000Z', 'draft');
  await add('private-review', '2020-01-01T12:00:00.000Z', 'review');
  await add('undated', null);
  await add('scheduled', new Date(Date.now() + 86400000).toISOString());
  const { body } = await request(app).get('/api/v1/devotionals/archive').expect(200);
  assert.deepEqual(
    body.items.map((item: { id: string }) => item.id),
    ['visible'],
  );
  assert.equal(body.total, 1);
  assert.equal(body.items[0].publishAt, '2020-01-01T12:00:00.000Z');
  for (const id of ['private-draft', 'private-review', 'undated', 'scheduled'])
    await request(app).get(`/api/v1/devotionals/${id}`).expect(404);
  await request(app).get('/api/v1/devotionals/visible').expect(200);
});
test('pagination reaches beyond the home feed and archived entries can be opened by id', async () => {
  for (let i = 0; i < 65; i++)
    await add(
      `reading-${String(i).padStart(2, '0')}`,
      new Date(Date.UTC(2020, 0, i + 1, 12)).toISOString(),
    );
  const feed = await request(app).get('/api/v1/devotionals').expect(200);
  assert.equal(feed.body.length, 60);
  const first = await request(app).get('/api/v1/devotionals/archive?limit=40').expect(200);
  const second = await request(app).get('/api/v1/devotionals/archive?limit=40&page=2').expect(200);
  assert.equal(first.body.total, 65);
  assert.equal(first.body.hasMore, true);
  assert.equal(second.body.items.length, 25);
  assert.equal(second.body.hasMore, false);
  assert.equal(
    new Set([...first.body.items, ...second.body.items].map((x: { id: string }) => x.id)).size,
    65,
  );
  const detail = await request(app).get('/api/v1/devotionals/reading-00').expect(200);
  assert.equal(detail.body.id, 'reading-00');
  const oldest = await request(app)
    .get('/api/v1/devotionals/archive?order=oldest&limit=1')
    .expect(200);
  assert.equal(oldest.body.items[0].id, 'reading-00');
});
test('title search works across languages and treats SQL wildcard characters literally', async () => {
  await add('hope', '2020-01-01T12:00:00.000Z', 'published', 'Hope 100%_!');
  await add('other', '2020-01-02T12:00:00.000Z', 'published', 'Another day');
  for (const q of ['HOPE', 'tumaini hope', '%_!']) {
    const result = await request(app).get('/api/v1/devotionals/archive').query({ q }).expect(200);
    assert.deepEqual(
      result.body.items.map((x: { id: string }) => x.id),
      ['hope'],
    );
  }
  const noBodyMatches = await request(app).get('/api/v1/devotionals/archive?q=keyword').expect(200);
  assert.equal(noBodyMatches.body.total, 0);
  const injection = await request(app)
    .get('/api/v1/devotionals/archive')
    .query({ q: "' OR 1=1 --" })
    .expect(200);
  assert.equal(injection.body.total, 0);
});
test('inclusive Nairobi publication-day filters use UTC boundaries consistently', async () => {
  await add('before', '2020-07-01T20:59:59.999Z');
  await add('start', '2020-07-01T21:00:00.000Z');
  await add('end', '2020-07-02T20:59:59.999Z');
  await add('after', '2020-07-02T21:00:00.000Z');
  const result = await request(app)
    .get('/api/v1/devotionals/archive?from=2020-07-02&to=2020-07-02')
    .expect(200);
  assert.deepEqual(
    result.body.items.map((x: { id: string }) => x.id),
    ['end', 'start'],
  );
});
test('invalid filters and unbounded page sizes are rejected', async () => {
  for (const query of [
    'from=2020-02-30',
    'from=2020-02-02&to=2020-02-01',
    'page=0',
    'page=abc',
    'limit=41',
    'limit=-1',
    'order=anything',
  ])
    await request(app).get(`/api/v1/devotionals/archive?${query}`).expect(400);
});
