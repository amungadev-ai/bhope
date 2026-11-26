import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { books } from '../packages/shared/src/index.js';

const args = process.argv.slice(2);
const inputs = [
  ['en', '--english'],
  ['sw', '--swahili'],
].flatMap(([id, flag]) => {
  const index = args.indexOf(flag);
  if (index < 0) return [];
  if (!args[index + 1] || args[index + 1].startsWith('--'))
    throw new Error(`Supply a file path after ${flag}.`);
  return [{ id, path: args[index + 1] }];
});
if (!inputs.length) {
  console.error(
    'Usage: npm run bible:import -- --english /path/EnglishNIVBible.xml --swahili /path/SwahiliBible.xml',
  );
  process.exit(1);
}
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => ['testament', 'book', 'chapter', 'verse'].includes(name),
});
const hash = createHash('sha256');
const versions = [];
const verses = [];
for (const input of inputs) {
  const xml = await readFile(input.path, 'utf8');
  if (Buffer.byteLength(xml) > 20_000_000)
    throw new Error('Bible XML exceeds the 20 MB import limit.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('DTD and custom XML entities are not supported.');
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Invalid XML: ${valid.err.msg}`);
  const source = parser.parse(xml).bible;
  if (!source?.testament)
    throw new Error('Expected a <bible> element containing <testament> elements.');
  const seen = new Set();
  for (const testament of source.testament)
    for (const book of testament.book ?? []) {
      const bookId = Number(book.number);
      const metadata = books.find((item) => item.id === bookId);
      if (!metadata) throw new Error(`Unknown book number: ${book.number}`);
      for (const chapter of book.chapter ?? [])
        for (const verse of chapter.verse ?? []) {
          const chapterNumber = Number(chapter.number);
          const verseNumber = Number(verse.number);
          if (
            !Number.isInteger(chapterNumber) ||
            chapterNumber < 1 ||
            chapterNumber > metadata.chapters ||
            !Number.isInteger(verseNumber) ||
            verseNumber < 1 ||
            verseNumber > 200
          )
            throw new Error(`Invalid reference in ${metadata.en}.`);
          const text = typeof verse === 'string' ? verse : verse.text;
          if (typeof text !== 'string' || !text.trim())
            throw new Error(`Empty verse: ${metadata.en} ${chapterNumber}:${verseNumber}`);
          const key = `${bookId}:${chapterNumber}:${verseNumber}`;
          if (seen.has(key)) throw new Error(`Duplicate reference: ${key}`);
          seen.add(key);
          verses.push({
            version: input.id,
            bookId,
            chapter: chapterNumber,
            verse: verseNumber,
            text: text.trim(),
          });
        }
    }
  hash.update(input.id).update(xml);
  versions.push({
    id: input.id,
    name: source.translation || input.id.toUpperCase(),
    copyright:
      source.status ||
      'Confirm edition, copyright notice, and distribution permission with the translation owner.',
  });
  console.log(
    `${input.id}: validated ${seen.size.toLocaleString()} verses from ${new Set(verses.filter((verse) => verse.version === input.id).map((verse) => verse.bookId)).size} books.`,
  );
}
const directory = fileURLToPath(new URL('../.local/', import.meta.url));
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/bible.json`,
  JSON.stringify({ fingerprint: hash.digest('hex'), sample: false, versions, verses }),
);
console.log('Local Bible library generated. Restart Expo with: npm start -- --clear');
console.log(
  'The generated file is excluded from Git. Confirm distribution and AI permissions before releasing a build containing these translations.',
);
