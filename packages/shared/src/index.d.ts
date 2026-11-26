export type Language = 'en' | 'sw';
export interface Book {
  id: number;
  en: string;
  sw: string;
  chapters: number;
  aliases: string[];
}
export interface Reference {
  bookId: number;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  raw?: string;
  start?: number;
  end?: number;
  key?: string;
}
export interface DetectedReference extends Reference {
  raw: string;
  start: number;
  end: number;
  key: string;
}
export interface DevotionalText {
  title: string;
  subtitle: string;
  reflection: string;
  application: string;
  prayer: string;
  question: string;
}
export interface Devotional {
  id: string;
  category: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  minutes: number;
  en: DevotionalText;
  sw: DevotionalText;
}
export interface Verse {
  version: Language;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
}
export interface BibleData {
  fingerprint: string;
  sample: boolean;
  versions: { id: Language; name: string; copyright: string }[];
  verses: Verse[];
}
export interface Note {
  id: string;
  title: string;
  body: string;
  kind: 'sermon' | 'reflection';
  preacher: string;
  church: string;
  sermonDate: string;
  createdAt: string;
  updatedAt: string;
}
export const books: Book[];
export const devotionalSeeds: Devotional[];
export function extractReferences(text: string): DetectedReference[];
export function formatReference(reference: Reference, language?: Language): string;
