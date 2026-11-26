import test from 'node:test';
import assert from 'node:assert/strict';
import { extractReferences, formatReference } from '../src/index.js';

test('English and Swahili references resolve to the same canonical passage', () => {
  const result = extractReferences('Read John 3:16–18, then Yohana 3:16-18.');
  assert.equal(result.length, 2);
  assert.equal(result[0].key, result[1].key);
  assert.equal(formatReference(result[0], 'sw'), 'Yohana 3:16–18');
});
test('numbered books and abbreviations retain accurate source offsets', () => {
  const text = 'Love: 1 Kor. 13:4–7 and 2 Timothy 1:7.';
  const refs = extractReferences(text);
  assert.deepEqual(
    refs.map((ref) => ref.bookId),
    [46, 55],
  );
  for (const ref of refs) assert.equal(text.slice(ref.start, ref.end), ref.raw);
});
test('recognizes chapter references and compact aliases', () => {
  const refs = extractReferences('Zaburi 23; Jn3:16; 1Jn 4:8');
  assert.deepEqual(
    refs.map((ref) => [ref.bookId, ref.chapter, ref.verseStart]),
    [
      [19, 23, undefined],
      [43, 3, 16],
      [62, 4, 8],
    ],
  );
});
test('rejects impossible chapters, zero verses, descending ranges, and partial numbers', () => {
  assert.deepEqual(
    extractReferences(
      'John 0:1; John 99:1; John 3:0; John 3:18-16; John 3:1234; xJohn 3:16; 11 John 3:16',
    ),
    [],
  );
});
test('runs independently on every edit and supports repeated references', () => {
  assert.equal(extractReferences('John 3:16').length, 1);
  assert.equal(extractReferences('John 3:16 and John 3:16').length, 2);
  assert.equal(extractReferences('a quiet moment').length, 0);
});
