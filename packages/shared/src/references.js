import { books } from './books.js';

const aliases = books.flatMap((book) => book.aliases.map((alias) => [alias, book.id]));
const names = [...new Set(aliases.map(([alias]) => alias))].sort((a, b) => b.length - a.length);
export const referenceRules = {
  aliases: Object.fromEntries(
    aliases.map(([alias, id]) => [alias.toLowerCase().replace(/[.\s]+/g, ''), id]),
  ),
  chapters: Object.fromEntries(books.map((book) => [book.id, book.chapters])),
  pattern: `(^|[^\\p{L}\\p{N}])(${names.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*')).join('|')})\\.?\\s*(\\d{1,3})(?:\\s*:\\s*(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?)?(?![\\p{L}\\d:])(?!\\s*[-–—]\\s*\\d)`,
};

// Self-contained so the same tested parser can run inside the offline rich editor.
export function createReferenceExtractor(rules) {
  return function extract(text) {
    const matches = [];
    for (const match of text.matchAll(new RegExp(rules.pattern, 'giu'))) {
      const bookId = rules.aliases[match[2].toLowerCase().replace(/[.\s]+/g, '')];
      const chapter = Number(match[3]);
      const verseStart = match[4] ? Number(match[4]) : undefined;
      const verseEnd = match[5] ? Number(match[5]) : verseStart;
      if (!bookId || chapter < 1 || chapter > rules.chapters[bookId]) continue;
      if (
        verseStart !== undefined &&
        (verseStart < 1 || verseStart > 200 || verseEnd < verseStart || verseEnd > 200)
      )
        continue;
      const start = match.index + match[1].length;
      if (/\d\s+$/.test(text.slice(0, start))) continue;
      const raw = match[0].slice(match[1].length);
      matches.push({
        bookId,
        chapter,
        verseStart,
        verseEnd,
        raw,
        start,
        end: start + raw.length,
        key: `${bookId}:${chapter}:${verseStart ?? ''}:${verseEnd ?? ''}`,
      });
    }
    return matches;
  };
}
export const extractReferences = createReferenceExtractor(referenceRules);
