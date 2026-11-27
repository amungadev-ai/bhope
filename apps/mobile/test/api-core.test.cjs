const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient, normalizeApiUrl, defaultApiUrl } = require('../src/lib/api-core.ts');

test('mobile API accepts an origin or one /api/v1 base without duplicating the prefix', () => {
  for (const value of [
    undefined,
    '',
    ' https://api.billucsolutions.co.ke ',
    'https://api.billucsolutions.co.ke/api',
    'https://api.billucsolutions.co.ke/api/v1/',
  ])
    assert.equal(normalizeApiUrl(value), defaultApiUrl);
  assert.equal(normalizeApiUrl('http://192.168.1.20:3000'), 'http://192.168.1.20:3000/api/v1');
  for (const value of [
    'file:///private',
    'https://user:password@host.invalid',
    'https://host.invalid/api/v1/api/v1',
    'https://host.invalid?token=private',
  ])
    assert.throws(() => normalizeApiUrl(value));
});

test('native requests use the secure-store bearer token and a caller-provided abort signal', async () => {
  const controller = new AbortController();
  const api = createApiClient(
    defaultApiUrl,
    async () => 'fixture-token',
    async (url, options) => {
      assert.equal(url, defaultApiUrl + '/auth/me');
      assert.equal(options.headers.get('Authorization'), 'Bearer fixture-token');
      assert.equal(options.headers.get('Accept'), 'application/json');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.signal, controller.signal);
      return Response.json({ name: 'Fixture' });
    },
  );
  assert.deepEqual(await api('/auth/me', { signal: controller.signal }), { name: 'Fixture' });
});

test('HTML and invalid responses do not expose an unhandled JSON parsing exception or response body', async () => {
  const html = createApiClient(
    defaultApiUrl,
    async () => null,
    async () => new Response('<!DOCTYPE html><p>private body</p>'),
  );
  await assert.rejects(
    () => html('/health'),
    (error) =>
      error.message.includes('web page') &&
      !error.message.includes('Unexpected token') &&
      !error.message.includes('private body'),
  );
  const invalid = createApiClient(
    defaultApiUrl,
    async () => null,
    async () => new Response('private malformed response'),
  );
  await assert.rejects(() => invalid('/health'), /unreadable data/);
});

test('API errors remain useful, logout has no JSON body, and network failures preserve offline access', async () => {
  const denied = createApiClient(
    defaultApiUrl,
    async () => null,
    async () =>
      Response.json({ error: 'Sign in first.', code: 'SIGN_IN_REQUIRED' }, { status: 401 }),
  );
  await assert.rejects(() => denied('/auth/me'), /SIGN_IN_REQUIRED/);
  const logout = createApiClient(
    defaultApiUrl,
    async () => null,
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(await logout('/auth/logout', { method: 'POST' }), undefined);
  const unavailable = createApiClient(
    defaultApiUrl,
    async () => null,
    async () => {
      throw new Error('private transport details');
    },
  );
  await assert.rejects(
    () => unavailable('/health'),
    (error) =>
      error.message.includes('Could not reach Beacon') &&
      !error.message.includes('private transport'),
  );
});
