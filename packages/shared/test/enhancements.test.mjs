import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNote,
  createReferenceExtractor,
  extractReferences,
  getTikTokPlayerUrl,
  getTikTokVideoId,
  referenceRules,
} from '../src/index.js';
test('John aliases and whitespace ranges work inside a sentence', () => {
  for (const alias of ['john', 'jhon', 'joh', 'jhn', 'jon', 'jn', 'Yohana', 'Yoh', 'Yn']) {
    const [reference] = extractReferences(
      `During the sermon, read ${alias} 1: 1 - 10 and reflect.`,
    );
    assert.equal(reference?.bookId, 43, alias);
    assert.equal(reference.chapter, 1);
    assert.equal(reference.verseStart, 1);
    assert.equal(reference.verseEnd, 10);
  }
});
test('the project Jon preference does not change full Jonah or Yona references', () => {
  assert.equal(extractReferences('Jon 1:1')[0].bookId, 43);
  assert.equal(extractReferences('Jonah 1:1')[0].bookId, 32);
  assert.equal(extractReferences('Yona 1:1')[0].bookId, 32);
});
test('Roman numeral books and Swahili abbreviations resolve consistently', () => {
  assert.equal(extractReferences('II Timothy 1:7')[0].bookId, 55);
  assert.equal(extractReferences('I Wakorintho 13: 4–7')[0].bookId, 46);
  assert.equal(extractReferences('Phillipians 4:6')[0].bookId, 50);
});
test('the offline editor factory has the same reference behavior', () => {
  const parser = createReferenceExtractor(JSON.parse(JSON.stringify(referenceRules)));
  const text = 'jhon 1: 1-10, Zaburi 23 and II Timothy 1:7';
  assert.deepEqual(parser(text), extractReferences(text));
});
test('TikTok embeds accept only full HTTPS video URLs on the real host', () => {
  assert.equal(
    getTikTokVideoId('https://www.tiktok.com/@ministry/video/6718335390845095173?lang=en'),
    '6718335390845095173',
  );
  assert.match(
    getTikTokPlayerUrl('https://www.tiktok.com/@ministry/video/6718335390845095173'),
    /^https:\/\/www\.tiktok\.com\/player\/v1\/6718335390845095173\?/,
  );
  for (const url of [
    'https://www.tiktok.com/@ministry',
    'http://www.tiktok.com/@ministry/video/6718335390845095173',
    'https://tiktok.com.evil.example/@ministry/video/6718335390845095173',
    'https://www.tiktok.com:444/@ministry/video/6718335390845095173',
    'javascript:alert(1)',
    'https://vm.tiktok.com/shortlink',
  ])
    assert.equal(getTikTokVideoId(url), null);
});
test('new rich-capable notes remain compatible with plain note records', () => {
  const note = createNote({ title: 'Sermon', body: 'John 3:16', kind: 'sermon' });
  assert.equal(note.body, 'John 3:16');
  assert.equal(note.html, undefined);
  assert.equal(note.kind, 'sermon');
  assert.equal(typeof note.id, 'string');
});
