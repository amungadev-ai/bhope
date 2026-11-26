const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
});
function loadApi(value, fetch) {
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    process: { env: value === undefined ? {} : { EXPO_PUBLIC_API_URL: value } },
    AbortSignal,
    fetch,
    require(name) {
      assert.equal(name, './session');
      return { getToken: async () => undefined };
    },
  });
  return module.exports;
}

for (const value of [undefined, '', ' \n ']) {
  test(`registration reaches the hosted API when its address is ${JSON.stringify(value)}`, async () => {
    let request;
    const { api, apiUrl } = loadApi(value, async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201, json: async () => ({ user: { role: 'user' } }) };
    });
    const body = JSON.stringify({
      name: 'Reader',
      email: 'reader@example.test',
      password: 'Test-only-password42',
    });
    const result = await api('/auth/register', { method: 'POST', body });
    assert.equal(apiUrl, 'https://bhope-api.billucsolutions.co.ke/api/v1');
    assert.equal(request.url, 'https://bhope-api.billucsolutions.co.ke/api/v1/auth/register');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.body, body);
    assert.equal(request.options.headers['Content-Type'], 'application/json');
    assert.equal(result.user.role, 'user');
  });
}

test('an explicit local API override is trimmed and preserves the registration route', async () => {
  let destination;
  const { api } = loadApi('  http://192.168.1.20:4000/api/v1///  ', async (url) => {
    destination = url;
    return { ok: true, status: 201, json: async () => ({}) };
  });
  await api('/auth/register', { method: 'POST', body: '{}' });
  assert.equal(destination, 'http://192.168.1.20:4000/api/v1/auth/register');
});

test('an unavailable network reports a useful error instead of disabling account services', async () => {
  const { api } = loadApi(undefined, async () => {
    throw new TypeError('Network request failed');
  });
  await assert.rejects(api('/auth/register', { method: 'POST', body: '{}' }), {
    message: 'Could not reach Beacon of Hope. Check your connection and API address.',
  });
});
