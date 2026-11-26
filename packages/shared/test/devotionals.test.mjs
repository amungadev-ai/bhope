import test from 'node:test';
import assert from 'node:assert/strict';
import {
  devotionalSeeds,
  filterDevotionals,
  isPublicationDate,
  publicationDay,
} from '../src/index.js';

const reading = (id, publishAt, title = id) => ({
  ...devotionalSeeds[0],
  id,
  publishAt,
  en: { ...devotionalSeeds[0].en, title, reflection: 'A body-only keyword.' },
  sw: { ...devotionalSeeds[0].sw, title: `Tumaini ${id}` },
});
test('publication dates follow Nairobi midnight and reject impossible calendar dates', () => {
  assert.equal(publicationDay('2020-07-01T20:59:59.999Z'), '2020-07-01');
  assert.equal(publicationDay('2020-07-01T21:00:00Z'), '2020-07-02');
  assert.equal(publicationDay(null), null);
  assert.equal(publicationDay('bad date'), null);
  assert.equal(isPublicationDate('2024-02-29'), true);
  for (const date of ['2023-02-29', '2020-02-30', '2020-13-01', '01/07/2020', '2020-7-1'])
    assert.equal(isPublicationDate(date), false);
});
test('the offline archive searches bilingual titles, including literal punctuation', () => {
  const items = [reading('first', null, 'Hope 100%_!'), reading('second', null, 'Peace')];
  assert.equal(filterDevotionals(items, { query: 'HOPE' })[0].id, 'first');
  assert.equal(filterDevotionals(items, { query: 'tumaini second' })[0].id, 'second');
  assert.equal(filterDevotionals(items, { query: '%_!' }).length, 1);
  assert.deepEqual(filterDevotionals(items, { query: 'body-only' }), []);
});
test('archive ranges include both selected days and keep undated readings out of date filters', () => {
  const items = [
    reading('before', '2020-07-01T20:59:59.999Z'),
    reading('start', '2020-07-01T21:00:00Z'),
    reading('end', '2020-07-02T20:59:59.999Z'),
    reading('after', '2020-07-02T21:00:00Z'),
    reading('saved', null),
  ];
  assert.deepEqual(
    filterDevotionals(items, { from: '2020-07-02', to: '2020-07-02' }).map((x) => x.id),
    ['end', 'start'],
  );
  assert.equal(filterDevotionals(items, { from: '2020-07-03' })[0].id, 'after');
  assert.equal(filterDevotionals(items, { to: '2020-07-01' })[0].id, 'before');
});
test('both archive orders keep undated reflections last without modifying the source cache', () => {
  const items = [
    reading('saved', null),
    reading('older', '2020-01-01T00:00:00Z'),
    reading('newer', '2021-01-01T00:00:00Z'),
  ];
  assert.deepEqual(
    filterDevotionals(items).map((x) => x.id),
    ['newer', 'older', 'saved'],
  );
  assert.deepEqual(
    filterDevotionals(items, { order: 'oldest' }).map((x) => x.id),
    ['older', 'newer', 'saved'],
  );
  assert.deepEqual(
    items.map((x) => x.id),
    ['saved', 'older', 'newer'],
  );
});
