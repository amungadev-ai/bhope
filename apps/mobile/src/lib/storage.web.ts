import bible from '@bhope/bible-data';
import type { Language, Note, Reference, Verse } from '@bhope/shared';
export { bible };
export interface Bookmark extends Verse {
  createdAt: string;
}
const key = (name: string) => `bhope:${name}`;
const load = <T>(name: string, fallback: T): T => {
  const value = localStorage.getItem(key(name));
  return value ? (JSON.parse(value) as T) : fallback;
};
const store = (name: string, value: unknown) =>
  localStorage.setItem(key(name), JSON.stringify(value));
export async function initializeStorage() {
  const probe = key('probe');
  localStorage.setItem(probe, 'ok');
  localStorage.removeItem(probe);
}
export async function getPreference(name: string): Promise<string | null> {
  return load(name, null);
}
export async function setPreference(name: string, value: string) {
  store(name, value);
}
export async function listNotes(): Promise<Note[]> {
  return load<Note[]>('notes', []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getNote(id: string): Promise<Note | null> {
  return (await listNotes()).find((note) => note.id === id) ?? null;
}
export async function saveNote(note: Note) {
  const notes = await listNotes();
  store('notes', [note, ...notes.filter((item) => item.id !== note.id)]);
}
export async function deleteNote(id: string) {
  store(
    'notes',
    (await listNotes()).filter((note) => note.id !== id),
  );
}
export async function getPassage(reference: Reference, version: Language): Promise<Verse[]> {
  return bible.verses.filter(
    (verse) =>
      verse.version === version &&
      verse.bookId === reference.bookId &&
      verse.chapter === reference.chapter &&
      verse.verse >= (reference.verseStart ?? 1) &&
      verse.verse <= (reference.verseEnd ?? reference.verseStart ?? 200),
  );
}
export async function getAvailableChapters(bookId: number, version: Language): Promise<number[]> {
  return [
    ...new Set(
      bible.verses
        .filter((verse) => verse.version === version && verse.bookId === bookId)
        .map((verse) => verse.chapter),
    ),
  ];
}
export async function getAvailableBooks(version: Language): Promise<number[]> {
  return [
    ...new Set(
      bible.verses.filter((verse) => verse.version === version).map((verse) => verse.bookId),
    ),
  ];
}
export async function searchBible(query: string, version: Language): Promise<Verse[]> {
  return query.trim().length < 2
    ? []
    : bible.verses
        .filter(
          (verse) =>
            verse.version === version &&
            verse.text.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .slice(0, 50);
}
export async function listBookmarks(): Promise<Bookmark[]> {
  return load('bookmarks', []);
}
export async function toggleBookmark(verse: Verse) {
  const bookmarks = await listBookmarks();
  const matches = (item: Verse) =>
    item.version === verse.version &&
    item.bookId === verse.bookId &&
    item.chapter === verse.chapter &&
    item.verse === verse.verse;
  const exists = bookmarks.some(matches);
  store(
    'bookmarks',
    exists
      ? bookmarks.filter((item) => !matches(item))
      : [{ ...verse, createdAt: new Date().toISOString() }, ...bookmarks],
  );
  return !exists;
}
