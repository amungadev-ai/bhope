import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  formatReference,
  type Language,
  type Note,
  type Reference,
  type Verse,
} from '@bhope/shared';
import { useApp } from '../lib/context';
import { bible, getPassage, listBookmarks, listNotes, toggleBookmark } from '../lib/storage';
import { insertIntoNote, openBible } from '../navigation/actions';
import { Body, Button, fonts, Icon, IconButton, Sheet, useUi, type IconName } from './ui';
export function ScriptureSheet({
  reference,
  onClose,
  onInsert,
  sourceNoteId,
  onOpenBible,
  onBookmarkChange,
  showOpenBible = true,
  version,
  showActionsOnOpen = false,
}: {
  reference: Reference | null;
  version?: Language;
  showActionsOnOpen?: boolean;
  onClose: () => void;
  onInsert?: (text: string) => void;
  sourceNoteId?: string;
  onOpenBible?: (reference: Reference) => Promise<void>;
  onBookmarkChange?: () => void;
  showOpenBible?: boolean;
}) {
  const { colors, styles } = useUi();
  const { language: appLanguage, bibleLanguage, fontSize } = useApp();
  const language = version ?? bibleLanguage;
  const sw = appLanguage === 'sw';
  const key = reference
    ? `${language}:${reference.bookId}:${reference.chapter}:${reference.verseStart}:${reference.verseEnd}`
    : '';
  const [data, setData] = useState<{
    key: string;
    verses: Verse[];
    saved: string[];
    notes: Note[];
  }>({ key: '', verses: [], saved: [], notes: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [menu, setMenu] = useState(false);
  const [choosingNote, setChoosingNote] = useState(false);
  useEffect(() => {
    if (!reference) return;
    let active = true;
    Promise.all([getPassage(reference, language), listBookmarks(), listNotes()])
      .then(([verses, bookmarks, notes]) => {
        if (active) {
          setData({
            key,
            verses,
            saved: bookmarks.map(
              (verse) => `${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`,
            ),
            notes,
          });
          setError('');
          setNotice('');
          setChoosingNote(false);
          setMenu(showActionsOnOpen);
        }
      })
      .catch(() => {
        if (active) setError('This passage could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [reference, language, key, showActionsOnOpen]);
  const loading = Boolean(reference) && data.key !== key;
  const passageText = reference
    ? `${formatReference(reference, language)}\n${data.verses.map((verse) => `${verse.verse} ${verse.text}`).join('\n')}`
    : '';
  const allSaved =
    data.verses.length > 0 &&
    data.verses.every((verse) =>
      data.saved.includes(`${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`),
    );
  async function bookmark() {
    try {
      for (const verse of data.verses) {
        const saved = data.saved.includes(
          `${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`,
        );
        if (allSaved || !saved) await toggleBookmark(verse);
      }
      const bookmarks = await listBookmarks();
      setData((old) => ({
        ...old,
        saved: bookmarks.map(
          (verse) => `${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`,
        ),
      }));
      setNotice(allSaved ? 'Removed from saved verses.' : 'Saved to your verses.');
      onBookmarkChange?.();
    } catch {
      setError('Your saved verses could not be updated.');
    }
  }
  async function addToNote(id?: string) {
    try {
      await insertIntoNote(id, passageText);
      onClose();
    } catch {
      setError('This passage could not be added to the note.');
    }
  }
  function openReader() {
    if (onOpenBible)
      void onOpenBible(reference!)
        .then(onClose)
        .catch(() => setError('Your note could not be saved before opening the Bible.'));
    else {
      openBible(reference!, sourceNoteId);
      onClose();
    }
  }
  const actions: { label: string; icon: IconName; run: () => void }[] = [
    {
      label: allSaved ? (sw ? 'Ondoa alama' : 'Unsave') : sw ? 'Hifadhi' : 'Save verse',
      icon: allSaved ? 'bookmark' : 'bookmark-outline',
      run: () => {
        void bookmark();
      },
    },
    {
      label: sw ? 'Nakili' : 'Copy',
      icon: 'copy-outline',
      run: () => {
        void Clipboard.setStringAsync(passageText)
          .then(() => setNotice(sw ? 'Imenakiliwa.' : 'Copied.'))
          .catch(() => setError('The passage could not be copied.'));
      },
    },
    {
      label: sw ? 'Shiriki' : 'Share',
      icon: 'share-outline',
      run: () => {
        void Share.share({ message: passageText }).catch(() =>
          setError('Sharing is unavailable on this device.'),
        );
      },
    },
    ...(showOpenBible
      ? [
          {
            label: sw ? 'Fungua Biblia' : 'Open in Bible',
            icon: 'book-outline' as IconName,
            run: openReader,
          },
        ]
      : []),
    {
      label: onInsert
        ? sw
          ? 'Ongeza hapa'
          : 'Insert into this note'
        : sourceNoteId
          ? sw
            ? 'Ongeza na urudi'
            : 'Add passage and return to note'
          : sw
            ? 'Ongeza kwenye dokezo'
            : 'Add to a note',
      icon: 'create-outline',
      run: () => {
        if (onInsert) {
          onInsert(passageText);
          onClose();
        } else if (sourceNoteId) void addToNote(sourceNoteId);
        else {
          setChoosingNote(true);
          setMenu(false);
        }
      },
    },
  ];
  return (
    <Sheet
      visible={Boolean(reference)}
      title={reference ? formatReference(reference, language) : ''}
      onClose={onClose}
      footer={
        !loading && data.verses.length ? (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 6 }}>
            <View style={styles.row}>
              <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted, flex: 1 }}>
                {notice || bible.versions.find((v) => v.id === language)?.name}
              </Text>
              <IconButton
                name="ellipsis-horizontal"
                label="Passage actions"
                onPress={() => setMenu(!menu)}
              />
            </View>
            {menu ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {actions.map((action) => (
                  <Pressable
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    onPress={action.run}
                    style={{
                      width: '49%',
                      minHeight: 44,
                      paddingHorizontal: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Icon name={action.icon} size={18} />
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        fontSize: 12,
                        color: colors.ink,
                        flexShrink: 1,
                      }}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null
      }
    >
      {loading && !error ? (
        <ActivityIndicator color={colors.ink} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data.verses.length ? (
        <>
          <View style={{ gap: 12 }}>
            {data.verses.map((verse) => (
              <Text
                key={verse.verse}
                selectable
                style={{
                  fontFamily: fonts.serif,
                  fontSize,
                  lineHeight: fontSize * 1.6,
                  color: colors.ink,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: colors.muted }}>
                  {verse.verse}{' '}
                </Text>
                {verse.text}
              </Text>
            ))}
          </View>
          {choosingNote ? (
            <View style={{ gap: 8 }}>
              <Button secondary onPress={() => void addToNote()} icon="add">
                {sw ? 'Dokezo jipya' : 'New reflection with this passage'}
              </Button>
              {data.notes.slice(0, 12).map((note) => (
                <Pressable
                  key={note.id}
                  accessibilityRole="button"
                  onPress={() => void addToNote(note.id)}
                  style={[styles.row, { paddingVertical: 10 }]}
                >
                  <Text numberOfLines={1} style={[styles.body, { flex: 1 }]}>
                    {note.title || 'Untitled note'}
                  </Text>
                  <Icon name="arrow-forward" size={16} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Body>
          {bible.sample
            ? 'This passage is outside the sample library.'
            : 'This passage is not included in the selected translation. Try another Bible language.'}
        </Body>
      )}
    </Sheet>
  );
}
