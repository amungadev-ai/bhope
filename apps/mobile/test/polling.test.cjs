const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleObject = { exports: {} };
const { outputText } = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/lib/polling.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } },
);
vm.runInNewContext(outputText, {
  module: moduleObject,
  exports: moduleObject.exports,
  AbortController,
  setTimeout,
  clearTimeout,
});
const { createPoller } = moduleObject.exports;
const flush = () => new Promise((resolve) => setImmediate(resolve));
function clock() {
  const queue = new Map();
  let key = 0;
  return {
    queue,
    schedule: (callback) => {
      queue.set(++key, callback);
      return key;
    },
    cancel: (id) => queue.delete(id),
    tick() {
      const [id, callback] = queue.entries().next().value;
      queue.delete(id);
      callback();
    },
  };
}
test('pending payments check automatically and stop immediately on a terminal result', async () => {
  const time = clock();
  let requests = 0;
  const poller = createPoller({ ...time, task: async () => ++requests < 3, intervalMs: 15000 });
  poller.resume();
  await flush();
  assert.equal(requests, 1);
  time.tick();
  await flush();
  time.tick();
  await flush();
  assert.equal(requests, 3);
  assert.equal(time.queue.size, 0);
  poller.resume();
  await flush();
  assert.equal(requests, 3);
});
test('polling never overlaps requests and resumes promptly after a foreground return', async () => {
  const time = clock();
  const resolvers = [];
  const signals = [];
  let calls = 0;
  const poller = createPoller({
    ...time,
    intervalMs: 20000,
    task: (signal) => {
      calls++;
      signals.push(signal);
      return new Promise((resolve) => resolvers.push(resolve));
    },
  });
  poller.resume();
  poller.resume();
  assert.equal(calls, 1);
  poller.pause();
  assert.equal(signals[0].aborted, true);
  assert.equal(time.queue.size, 0);
  poller.resume();
  assert.equal(calls, 1);
  resolvers.shift()();
  await flush();
  time.tick();
  assert.equal(calls, 2);
  poller.dispose();
  resolvers.shift()();
  await flush();
  assert.equal(time.queue.size, 0);
});
test('temporary errors retry within a bounded confirmation window', async () => {
  const time = clock();
  let errors = 0;
  let limit = 0;
  let calls = 0;
  const poller = createPoller({
    ...time,
    intervalMs: 15000,
    maxAttempts: 3,
    task: async () => {
      calls++;
      throw new Error('Offline');
    },
    onError: () => errors++,
    onLimit: () => limit++,
  });
  poller.resume();
  await flush();
  time.tick();
  await flush();
  time.tick();
  await flush();
  assert.equal(calls, 3);
  assert.equal(errors, 3);
  assert.equal(limit, 1);
  assert.equal(time.queue.size, 0);
  poller.resume();
  await flush();
  assert.equal(calls, 3);
});
test('leaving a screen cancels its request and schedules no background work', async () => {
  const time = clock();
  let resolve;
  let signal;
  let errors = 0;
  const poller = createPoller({
    ...time,
    intervalMs: 20000,
    task: (value) => {
      signal = value;
      return new Promise((done) => {
        resolve = done;
      });
    },
    onError: () => errors++,
  });
  poller.resume();
  poller.dispose();
  assert.equal(signal.aborted, true);
  resolve();
  await flush();
  assert.equal(time.queue.size, 0);
  assert.equal(errors, 0);
});
