import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser } from '../src/auth.js';
import { loadConfig, type Config } from '../src/config.js';
import { migrate, openDatabase, type Database } from '../src/db.js';
import { normalizePhone, verifyPaystackSignature } from '../src/payments.js';
let db: Database;
let config: Config;
let app: ReturnType<typeof createApp>;
let providerCalls: { url: string; body: any }[];
let resultStatus = 'success';
let wrongAmount = false;
let stkCode = '499';
const transactions = new Map<string, any>();
const response = (value: unknown) =>
  new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const provider: typeof fetch = async (input, options) => {
  const url = String(input);
  const body = options?.body ? JSON.parse(String(options.body)) : {};
  providerCalls.push({ url, body });
  if (url.endsWith('/transaction/initialize')) {
    transactions.set(body.reference, body);
    return response({
      status: true,
      data: {
        reference: body.reference,
        authorization_url: 'https://checkout.paystack.com/unit-checkout',
      },
    });
  }
  if (url.includes('/transaction/verify/')) {
    const reference = decodeURIComponent(url.split('/').at(-1)!);
    const original = transactions.get(reference);
    return response({
      status: true,
      data: {
        reference,
        amount: wrongAmount ? 1 : original.amount,
        currency: original.currency,
        status: resultStatus,
      },
    });
  }
  if (url.includes('/oauth/v1/generate')) return response({ access_token: 'unit-provider-token' });
  if (url.endsWith('/stkpush/v1/processrequest'))
    return response({ ResponseCode: '0', CheckoutRequestID: 'ws_CO_unit_checkout' });
  if (url.endsWith('/stkpushquery/v1/query'))
    return response({ CheckoutRequestID: 'ws_CO_unit_checkout', ResultCode: stkCode });
  throw new Error('Unexpected payment URL');
};
beforeEach(async () => {
  config = {
    ...loadConfig(),
    NODE_ENV: 'test',
    DB_DRIVER: 'sqlite',
    APP_URL: 'https://api.example.test',
    PAYSTACK_SECRET_KEY: 'unit-card-secret',
    PAYSTACK_WEBHOOK_SECRET: 'unit-signing-secret',
    MPESA_CONSUMER_KEY: 'unit-consumer',
    MPESA_CONSUMER_SECRET: 'unit-secret',
    MPESA_SHORTCODE: '123456',
    MPESA_PASSKEY: 'unit-passkey',
  };
  db = await openDatabase(config, ':memory:');
  await migrate(db);
  providerCalls = [];
  transactions.clear();
  resultStatus = 'success';
  wrongAmount = false;
  stkCode = '499';
  app = createApp(config, db, fetch, provider);
});
afterEach(async () => {
  await db.close();
});
async function token(role: 'user' | 'editor' | 'admin', email = `${role}@example.test`) {
  await createUser(db, { email, name: role, role, password: 'A-long-test-password' });
  return (
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'A-long-test-password' })
      .expect(200)
  ).body.token as string;
}
const gift = () => ({
  amount: 250,
  method: 'card',
  email: 'donor@example.test',
  idempotencyKey: randomUUID(),
  clientToken: randomBytes(32).toString('hex'),
});
function signature(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=unit-key:${createHmac('sha512', config.PAYSTACK_WEBHOOK_SECRET).update(`${timestamp}.`).update(body).digest('hex')}`;
}
test('a stale poll cannot downgrade a concurrently confirmed or reversed payment', async () => {
  for (const protectedStatus of ['success', 'reversed']) {
    const guarded = createApp(config, db, fetch, async (input, options) => {
      if (String(input).includes('/transaction/verify/')) {
        const reference = decodeURIComponent(String(input).split('/').at(-1)!);
        await db.run('UPDATE donations SET status = ? WHERE reference = ?', [
          protectedStatus,
          reference,
        ]);
        resultStatus = 'failed';
      }
      return provider(input, options);
    });
    const started = (await request(guarded).post('/api/v1/donations').send(gift()).expect(201))
      .body;
    const checked = await request(guarded)
      .post(`/api/v1/donations/${started.donation.id}/refresh?token=${started.token}`)
      .send({})
      .expect(200);
    assert.equal(checked.body.status, protectedStatus);
    const stored = await request(guarded)
      .get(`/api/v1/donations/${started.donation.id}?token=${started.token}`)
      .expect(200);
    assert.equal(stored.body.status, protectedStatus);
  }
});
test('a new Inspirations feed is empty until a reviewed video is published', async () => {
  assert.deepEqual((await request(app).get('/api/v1/inspirations').expect(200)).body, []);
  const editor = await token('editor'),
    admin = await token('admin');
  const video = {
    id: 'hope-video',
    title: 'Hope',
    titleSw: 'Tumaini',
    description: 'Encouragement.',
    descriptionSw: 'Faraja.',
    category: 'HOPE',
    url: 'https://www.tiktok.com/@ministry/video/6718335390845095173',
    status: 'review',
    publishAt: null,
  };
  await request(app)
    .put('/api/v1/studio/inspirations/hope-video')
    .auth(editor, { type: 'bearer' })
    .send(video)
    .expect(200);
  await request(app)
    .put('/api/v1/studio/inspirations/hope-video')
    .auth(editor, { type: 'bearer' })
    .send({ ...video, status: 'published', publishAt: new Date().toISOString() })
    .expect(403);
  assert.deepEqual((await request(app).get('/api/v1/inspirations')).body, []);
  await request(app)
    .put('/api/v1/studio/inspirations/hope-video')
    .auth(admin, { type: 'bearer' })
    .send({ ...video, status: 'published', publishAt: new Date(Date.now() - 1000).toISOString() })
    .expect(200);
  assert.equal((await request(app).get('/api/v1/inspirations')).body[0].titleSw, 'Tumaini');
  await request(app)
    .put('/api/v1/studio/inspirations/bad-video')
    .auth(admin, { type: 'bearer' })
    .send({ ...video, id: 'bad-video', url: 'https://www.tiktok.com/@ministry' })
    .expect(400);
});
test('giving is disabled without merchant configuration', async () => {
  app = createApp({ ...config, PAYSTACK_SECRET_KEY: '', MPESA_PASSKEY: '' }, db);
  await request(app).post('/api/v1/donations').send(gift()).expect(503);
  assert.equal(
    (await db.all<{ total: number }>('SELECT COUNT(*) AS total FROM donations'))[0].total,
    0,
  );
});
test('card gifts use minor units, stay pending, and retry without duplicate initialization', async () => {
  const input = gift();
  const started = (await request(app).post('/api/v1/donations').send(input).expect(201)).body;
  assert.equal(started.donation.status, 'pending');
  assert.equal(providerCalls[0].body.amount, 25000);
  assert.equal(providerCalls[0].body.currency, 'KES');
  const retried = (await request(app).post('/api/v1/donations').send(input).expect(200)).body;
  assert.equal(retried.donation.id, started.donation.id);
  assert.equal(providerCalls.length, 1);
  await request(app)
    .post('/api/v1/donations')
    .send({ ...input, clientToken: randomBytes(32).toString('hex') })
    .expect(409);
});
test('donation status requires the owner or its receipt token', async () => {
  const owner = await token('user', 'owner@example.test'),
    other = await token('user', 'other@example.test');
  const started = (
    await request(app)
      .post('/api/v1/donations')
      .auth(owner, { type: 'bearer' })
      .send(gift())
      .expect(201)
  ).body;
  await request(app).get(`/api/v1/donations/${started.donation.id}`).expect(404);
  await request(app)
    .get(`/api/v1/donations/${started.donation.id}`)
    .auth(other, { type: 'bearer' })
    .expect(404);
  await request(app)
    .get(`/api/v1/donations/${started.donation.id}`)
    .auth(owner, { type: 'bearer' })
    .expect(200);
  assert.equal(
    (await request(app).get('/api/v1/donations/history').auth(other, { type: 'bearer' })).body
      .length,
    0,
  );
});
test('invalid or expired account sessions cannot silently create guest gifts', async () => {
  await request(app)
    .post('/api/v1/donations')
    .set('Authorization', 'Bearer invalid')
    .send(gift())
    .expect(401);
  const expired = await token('user', 'expired@example.test');
  await db.run('UPDATE sessions SET expires_at = ?', ['2000-01-01T00:00:00.000Z']);
  await request(app)
    .post('/api/v1/donations')
    .auth(expired, { type: 'bearer' })
    .send(gift())
    .expect(401);
  assert.equal(providerCalls.length, 0);
});
test('card verification rejects a mismatched amount', async () => {
  const started = (await request(app).post('/api/v1/donations').send(gift()).expect(201)).body;
  wrongAmount = true;
  await request(app)
    .post(`/api/v1/donations/${started.donation.id}/refresh?token=${started.token}`)
    .send({})
    .expect(502);
  const current = (
    await request(app).get(`/api/v1/donations/${started.donation.id}?token=${started.token}`)
  ).body;
  assert.equal(current.status, 'pending');
});
test('signed Paystack callbacks are verified and repeated events do not duplicate gifts', async () => {
  const started = (await request(app).post('/api/v1/donations').send(gift()).expect(201)).body;
  const body = JSON.stringify({
    event: 'charge.success',
    data: { reference: started.donation.reference },
  });
  await request(app)
    .post('/api/v1/payments/paystack/webhook')
    .set('Content-Type', 'application/json')
    .send(body)
    .expect(401);
  for (let index = 0; index < 2; index++)
    await request(app)
      .post('/api/v1/payments/paystack/webhook')
      .set('Content-Type', 'application/json')
      .set('paystack-signature', signature(body))
      .send(body)
      .expect(200);
  const current = (
    await request(app).get(`/api/v1/donations/${started.donation.id}?token=${started.token}`)
  ).body;
  assert.equal(current.status, 'success');
  assert.equal(
    (await db.all<{ total: number }>('SELECT COUNT(*) AS total FROM donations'))[0].total,
    1,
  );
});
test('webhook signature validation rejects tampering and old timestamps', () => {
  const raw = Buffer.from('{"event":"charge.success"}');
  assert.equal(verifyPaystackSignature(raw, signature(raw.toString()), undefined, config), true);
  assert.equal(
    verifyPaystackSignature(Buffer.from('{}'), signature(raw.toString()), undefined, config),
    false,
  );
  assert.equal(
    verifyPaystackSignature(raw, signature(raw.toString(), 1), undefined, config),
    false,
  );
  const legacy = createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  assert.equal(
    verifyPaystackSignature(raw, undefined, legacy, { ...config, PAYSTACK_WEBHOOK_SECRET: '' }),
    true,
  );
  assert.equal(verifyPaystackSignature(raw, undefined, legacy, config), false);
});
test('M-Pesa callback claims alone cannot confirm a donation', async () => {
  const input = { ...gift(), method: 'mpesa', phone: '0712 345 678' };
  const started = (await request(app).post('/api/v1/donations').send(input).expect(201)).body;
  const initialized = providerCalls.find((call) =>
    call.url.endsWith('/stkpush/v1/processrequest'),
  )!;
  assert.equal(initialized.body.Amount, 250);
  assert.equal(initialized.body.PhoneNumber, '254712345678');
  const path = new URL(initialized.body.CallBackURL).pathname;
  const body = {
    Body: { stkCallback: { CheckoutRequestID: 'ws_CO_unit_checkout', ResultCode: 0 } },
  };
  await request(app).post(path).send(body).expect(200);
  assert.equal(
    (await request(app).get(`/api/v1/donations/${started.donation.id}?token=${started.token}`)).body
      .status,
    'pending',
  );
  stkCode = '0';
  await request(app).post(path).send(body).expect(200);
  assert.equal(
    (await request(app).get(`/api/v1/donations/${started.donation.id}?token=${started.token}`)).body
      .status,
    'success',
  );
});
test('phone validation accepts Kenyan mobile formats and rejects other destinations', () => {
  for (const number of ['0712345678', '+254 712 345 678', '712345678'])
    assert.equal(normalizePhone(number), '254712345678');
  assert.equal(normalizePhone('0112345678'), '254112345678');
  assert.equal(normalizePhone('+15551234567'), null);
  assert.equal(normalizePhone('254212345678'), null);
});
test('only administrators read financial summaries', async () => {
  const editor = await token('editor'),
    admin = await token('admin');
  await request(app).get('/api/v1/studio/donations').auth(editor, { type: 'bearer' }).expect(403);
  const report = await request(app)
    .get('/api/v1/studio/donations')
    .auth(admin, { type: 'bearer' })
    .expect(200);
  assert.deepEqual(report.body.items, []);
});
test('rich note payloads survive authenticated round trips', async () => {
  const reader = await token('user');
  const now = new Date().toISOString();
  const note = {
    id: 'rich-note',
    title: 'Sermon',
    body: 'John 3:16',
    html: '<h2>Sunday</h2><p><u>John 3:16</u></p>',
    kind: 'sermon',
    preacher: '',
    church: '',
    sermonDate: '2026-11-26',
    createdAt: now,
    updatedAt: now,
  };
  await request(app)
    .put('/api/v1/notes/rich-note')
    .auth(reader, { type: 'bearer' })
    .send({ note, revision: 0 })
    .expect(200);
  assert.equal(
    (await request(app).get('/api/v1/notes').auth(reader, { type: 'bearer' })).body[0].note.html,
    note.html,
  );
});
