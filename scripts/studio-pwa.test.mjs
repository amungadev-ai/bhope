import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const publicRoot = new URL('../apps/dashboard/public/', import.meta.url);
test('studio installation has a scoped manifest and correctly sized local icons', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', publicRoot), 'utf8'));
  assert.equal(manifest.scope, '/console/');
  assert.equal(manifest.start_url, '/console/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const data = readFileSync(new URL(icon.src.slice('/console/'.length), publicRoot));
    assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`, icon.sizes);
  }
});
function worker() {
  const handlers = {};
  const cached = [];
  const requests = [];
  const removed = [];
  vm.runInNewContext(readFileSync(new URL('sw.js', publicRoot), 'utf8'), {
    URL,
    self: {
      location: { origin: 'https://studio.example.test' },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        addAll: async (urls) => {
          cached.push(...urls);
        },
        put: async () => {},
      }),
      match: async (url) => ({ offline: url }),
      keys: async () => ['another-app-cache', 'bhope-studio-shell-old'],
      delete: async (key) => removed.push(key),
    },
    fetch: async (request) => {
      requests.push(request);
      throw new Error('Offline');
    },
  });
  return { handlers, cached, requests, removed };
}
test('service worker leaves authentication, API data, and mutations network-only', () => {
  const { handlers, requests } = worker();
  for (const [path, method] of [
    ['/api/v1/auth/me', 'GET'],
    ['/api/v1/studio/users', 'GET'],
    ['/console/private', 'POST'],
  ]) {
    let intercepted = false;
    handlers.fetch({
      request: { url: `https://studio.example.test${path}`, method, mode: 'cors' },
      respondWith: () => {
        intercepted = true;
      },
    });
    assert.equal(intercepted, false);
  }
  assert.equal(requests.length, 0);
});
test('offline navigation gets a reconnect page and activation preserves other applications', async () => {
  const { handlers, cached, removed } = worker();
  let installation;
  handlers.install({
    waitUntil: (promise) => {
      installation = promise;
    },
  });
  await installation;
  for (const url of cached)
    assert.equal(existsSync(new URL(url.slice('/console/'.length), publicRoot)), true);
  let response;
  handlers.fetch({
    request: { url: 'https://studio.example.test/console/', method: 'GET', mode: 'navigate' },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.equal((await response).offline, '/console/offline.html');
  let activation;
  handlers.activate({
    waitUntil: (promise) => {
      activation = promise;
    },
  });
  await activation;
  assert.deepEqual(removed, ['bhope-studio-shell-old']);
});
