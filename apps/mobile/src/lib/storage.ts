import * as SQLite from 'expo-sqlite';
import bible from '@bhope/bible-data';
import type { Language, Note, Reference, Verse } from '@bhope/shared';
export { bible };
export interface Bookmark extends Verse {
  createdAt: string;
}
let database: Promise<SQLite.SQLiteDatabase> | undefined;
let initialization: Promise<void> | undefined;
const db = () => (database ??= SQLite.openDatabaseAsync('beacon-of-hope.db'));
export function initializeStorage(): Promise<void> {
  return (initialization ??= (async () => {
    const connection = await db();
    await connection.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS verses (version TEXT, book_id INTEGER, chapter INTEGER, verse INTEGER, text TEXT, PRIMARY KEY (version, book_id, chapter, verse));
      CREATE TABLE IF NOT EXISTS bookmarks (version TEXT, bookId INTEGER, chapter INTEGER, verse INTEGER, text TEXT, createdAt TEXT, PRIMARY KEY (version, bookId, chapter, verse));`);
    const current = await connection.getFirstAsync<{ value: string }>(
      'SELECT value FROM preferences WHERE key = ?',
      ['bible-fingerprint'],
    );
    if (current?.value === bible.fingerprint) return;
    await connection.withTransactionAsync(async () => {
      await connection.runAsync('DELETE FROM verses');
      for (let offset = 0; offset < bible.verses.length; offset += 100) {
        const chunk = bible.verses.slice(offset, offset + 100);
        await connection.runAsync(
          `INSERT INTO verses (version, book_id, chapter, verse, text) VALUES ${chunk.map(() => '(?,?,?,?,?)').join(',')}`,
          chunk.flatMap((verse) => [
            verse.version,
            verse.bookId,
            verse.chapter,
            verse.verse,
            verse.text,
          ]),
        );
      }
      await connection.runAsync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [
        'bible-fingerprint',
        bible.fingerprint,
      ]);
    });
  })().catch((error) => {
    initialization = undefined;
    throw error;
  }));
}
export async function getPreference(key: string) {
  await initializeStorage();
  return (
    (
      await (
        await db()
      ).getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE key = ?', [key])
    )?.value ?? null
  );
}
export async function setPreference(key: string, value: string) {
  await initializeStorage();
  await (
    await db()
  ).runAsync('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value]);
}
export async function listNotes(): Promise<Note[]> {
  await initializeStorage();
  return (
    await (
      await db()
    ).getAllAsync<{ payload: string }>('SELECT payload FROM notes ORDER BY updated_at DESC')
  ).map((row) => JSON.parse(row.payload));
}
export async function getNote(id: string): Promise<Note | null> {
  await initializeStorage();
  const row = await (
    await db()
  ).getFirstAsync<{ payload: string }>('SELECT payload FROM notes WHERE id = ?', [id]);
  return row ? JSON.parse(row.payload) : null;
}
export async function saveNote(note: Note) {
  await initializeStorage();
  await (
    await db()
  ).runAsync('INSERT OR REPLACE INTO notes (id, payload, updated_at) VALUES (?, ?, ?)', [
    note.id,
    JSON.stringify(note),
    note.updatedAt,
  ]);
}
export async function deleteNote(id: string) {
  await initializeStorage();
  await (await db()).runAsync('DELETE FROM notes WHERE id = ?', [id]);
}
export async function getPassage(reference: Reference, version: Language): Promise<Verse[]> {
  await initializeStorage();
  return (await db()).getAllAsync<Verse>(
    'SELECT version, book_id AS bookId, chapter, verse, text FROM verses WHERE version = ? AND book_id = ? AND chapter = ? AND verse >= ? AND verse <= ? ORDER BY verse',
    [
      version,
      reference.bookId,
      reference.chapter,
      reference.verseStart ?? 1,
      reference.verseEnd ?? reference.verseStart ?? 200,
    ],
  );
}
export async function getAvailableChapters(bookId: number, version: Language): Promise<number[]> {
  await initializeStorage();
  return (
    await (
      await db()
    ).getAllAsync<{ chapter: number }>(
      'SELECT DISTINCT chapter FROM verses WHERE version = ? AND book_id = ? ORDER BY chapter',
      [version, bookId],
    )
  ).map((row) => row.chapter);
}
export async function getAvailableBooks(version: Language): Promise<number[]> {
  await initializeStorage();
  return (
    await (
      await db()
    ).getAllAsync<{ id: number }>(
      'SELECT DISTINCT book_id AS id FROM verses WHERE version = ? ORDER BY book_id',
      [version],
    )
  ).map((row) => row.id);
}
export async function searchBible(query: string, version: Language): Promise<Verse[]> {
  await initializeStorage();
  if (query.trim().length < 2) return [];
  const escaped = query.trim().replace(/[\\%_]/g, '\\$&');
  return (await db()).getAllAsync<Verse>(
    "SELECT version, book_id AS bookId, chapter, verse, text FROM verses WHERE version = ? AND text LIKE ? ESCAPE '\\' ORDER BY book_id, chapter, verse LIMIT 50",
    [version, `%${escaped}%`],
  );
}
export async function listBookmarks(): Promise<Bookmark[]> {
  await initializeStorage();
  return (await db()).getAllAsync<Bookmark>('SELECT * FROM bookmarks ORDER BY createdAt DESC');
}
export async function toggleBookmark(verse: Verse) {
  await initializeStorage();
  const connection = await db();
  const params = [verse.version, verse.bookId, verse.chapter, verse.verse];
  const exists = await connection.getFirstAsync(
    'SELECT verse FROM bookmarks WHERE version = ? AND bookId = ? AND chapter = ? AND verse = ?',
    params,
  );
  if (exists)
    await connection.runAsync(
      'DELETE FROM bookmarks WHERE version = ? AND bookId = ? AND chapter = ? AND verse = ?',
      params,
    );
  else
    await connection.runAsync(
      'INSERT INTO bookmarks (version, bookId, chapter, verse, text, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [...params, verse.text, new Date().toISOString()],
    );
  return !exists;
}
