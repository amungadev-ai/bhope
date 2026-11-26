import {
  CommonActions,
  DrawerActions,
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
export type TabRoutes = {
  Today: undefined;
  Bible: BibleParams | undefined;
  Notebook: undefined;
  Inspirations: undefined;
};
export type DrawerRoutes = {
  HomeTabs: NavigatorScreenParams<TabRoutes> | undefined;
  Account: undefined;
  SavedVerses: undefined;
  Giving: undefined;
  DonationHistory: undefined;
  Settings: undefined;
  About: undefined;
};
export type RootRoutes = {
  Main: NavigatorScreenParams<DrawerRoutes> | undefined;
  NoteEditor: { id: string; kind?: Note['kind']; insert?: { text: string; nonce: string } };
  Devotional: { id: string };
  BibleReader: BibleParams;
  Account: undefined;
};
export const navigationRef = createNavigationContainerRef<RootRoutes>();
export function navigate<Name extends keyof RootRoutes>(name: Name, params?: RootRoutes[Name]) {
  if (navigationRef.isReady()) navigationRef.dispatch(CommonActions.navigate({ name, params }));
}
export function openTab<Name extends keyof TabRoutes>(name: Name, params?: TabRoutes[Name]) {
  navigate('Main', {
    screen: 'HomeTabs',
    params: { screen: name, params },
  } as NavigatorScreenParams<DrawerRoutes>);
}
export function goBack() {
  if (navigationRef.canGoBack()) navigationRef.goBack();
  else openTab('Today');
}
export function openDrawer() {
  if (navigationRef.isReady()) navigationRef.dispatch(DrawerActions.openDrawer());
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
