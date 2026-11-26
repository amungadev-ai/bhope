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
  publishAt?: string | null;
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
  html?: string;
  kind: 'sermon' | 'reflection';
  preacher: string;
  church: string;
  sermonDate: string;
  createdAt: string;
  updatedAt: string;
}
export const books: Book[];
export const devotionalSeeds: Devotional[];
export function devotionalText(item: Devotional, language?: Language): DevotionalText;
export function publicationDay(value?: string | null): string | null;
export function isPublicationDate(value: string): boolean;
export function filterDevotionals(
  items: Devotional[],
  filters?: { query?: string; from?: string; to?: string; order?: 'newest' | 'oldest' },
): Devotional[];
export interface DevotionalArchivePage {
  items: Devotional[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
export function extractReferences(text: string): DetectedReference[];
export function formatReference(reference: Reference, language?: Language): string;

export interface ReferenceRules {
  aliases: Record<string, number>;
  chapters: Record<number, number>;
  pattern: string;
}
export const referenceRules: ReferenceRules;
export function createReferenceExtractor(
  rules: ReferenceRules,
): (text: string) => DetectedReference[];
export function getTikTokVideoId(url: string): string | null;
export function getTikTokPlayerUrl(url: string): string | null;
export function createNote(input?: Partial<Note>): Note;
export interface Inspiration {
  id: string;
  title: string;
  titleSw: string;
  description: string;
  descriptionSw: string;
  url: string;
  category: string;
  status: 'draft' | 'review' | 'published';
  publishAt: string | null;
  updatedAt?: string;
}
export interface Donation {
  id: string;
  amount: number;
  currency: 'KES';
  method: 'mpesa' | 'card';
  status: 'pending' | 'success' | 'failed' | 'reversed';
  reference: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiAccess {
  freeTotal: number;
  freeUsed: number;
  freeRemaining: number;
  active: boolean;
  staff: boolean;
  paidUntil: string | null;
  monthlyPrice: number;
  currency: string;
  dailyLimit: number;
  dailyRemaining: number;
  billingAvailable: boolean;
  aiEnabled: boolean;
}
