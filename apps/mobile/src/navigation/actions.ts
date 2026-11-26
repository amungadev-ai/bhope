import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createNote, type Note, type Reference } from '@bhope/shared';
import { saveNote } from '../lib/storage';

export type BibleParams = {
  book?: number;
  chapter?: number;
  verse?: number;
  verseEnd?: number;
  sourceNoteId?: string;
};
export type DrawerRoutes = {
  MoreHome: { openDrawer?: string } | undefined;
  Account: undefined;
  SavedVerses: undefined;
  Giving: undefined;
  DonationHistory: undefined;
  Settings: undefined;
  About: undefined;
  AiPlan: undefined;
};
export type TabRoutes = {
  Today: undefined;
  Bible: BibleParams | undefined;
  Notebook: undefined;
  Inspirations: undefined;
  More: NavigatorScreenParams<DrawerRoutes> | undefined;
};
export type RootRoutes = {
  Main: NavigatorScreenParams<TabRoutes> | undefined;
  NoteEditor: { id: string; kind?: Note['kind']; insert?: { text: string; nonce: string } };
  Devotional: { id: string };
  BibleReader: BibleParams;
  Account: undefined;
  AiPlan: undefined;
};
export const navigationRef = createNavigationContainerRef<RootRoutes>();
export function navigate<Name extends keyof RootRoutes>(name: Name, params?: RootRoutes[Name]) {
  if (navigationRef.isReady()) navigationRef.dispatch(CommonActions.navigate({ name, params }));
}
export function openTab<Name extends keyof TabRoutes>(name: Name, params?: TabRoutes[Name]) {
  navigate('Main', { screen: name, params } as NavigatorScreenParams<TabRoutes>);
}
export function openMore(name: keyof DrawerRoutes) {
  openTab('More', { screen: name } as NavigatorScreenParams<DrawerRoutes>);
}
export function goBack() {
  if (navigationRef.canGoBack()) navigationRef.goBack();
  else openTab('Today');
}
export function openDrawer() {
  openTab('More', { screen: 'MoreHome', params: { openDrawer: `${Date.now()}` } });
}
export function openBible(reference: Reference, sourceNoteId?: string) {
  navigate('BibleReader', {
    book: reference.bookId,
    chapter: reference.chapter,
    verse: reference.verseStart,
    verseEnd: reference.verseEnd,
    sourceNoteId,
  });
}
export async function openNote(id = 'new', kind: Note['kind'] = 'reflection') {
  if (id === 'new') {
    const note = createNote({ kind });
    await saveNote(note);
    id = note.id;
  }
  navigate('NoteEditor', { id, kind });
}
export async function insertIntoNote(id: string | undefined, text: string) {
  if (!id) {
    const note = createNote({ body: text });
    await saveNote(note);
    navigate('NoteEditor', { id: note.id });
    return;
  }
  const params = { id, insert: { text, nonce: `${Date.now()}-${Math.random()}` } };
  const existing = navigationRef
    .getRootState()
    ?.routes.some(
      (route) => route.name === 'NoteEditor' && (route.params as { id?: string })?.id === id,
    );
  if (existing) navigationRef.dispatch(StackActions.popTo('NoteEditor', params));
  else navigate('NoteEditor', params);
}
