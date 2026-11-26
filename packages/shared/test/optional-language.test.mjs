import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devotionalSeeds, devotionalText } from '../src/index.js';
test('readers receive English when a devotional has no complete Swahili reflection', () => {
  const entry = structuredClone(devotionalSeeds[0]);
  entry.sw = { title: '', reflection: '' };
  assert.deepEqual(devotionalText(entry, 'sw'), entry.en);
  delete entry.sw;
  assert.deepEqual(devotionalText(entry, 'sw'), entry.en);
});
test('available Swahili text is preserved and missing secondary fields fall back to English', () => {
  const entry = structuredClone(devotionalSeeds[0]);
  entry.sw.prayer = '';
  const text = devotionalText(entry, 'sw');
  assert.equal(text.title, entry.sw.title);
  assert.equal(text.prayer, entry.en.prayer);
  assert.equal(entry.sw.prayer, '');
});
