import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { formatReference, type Note, type Reference, type Verse } from '@bhope/shared';
import { useApp } from '../lib/context';
import { bible, getPassage, listBookmarks, listNotes, toggleBookmark } from '../lib/storage';
import { insertIntoNote, openBible } from '../navigation/actions';
import { Body, Button, colors, fonts, Icon, Sheet, styles } from './ui';
export function ScriptureSheet({
  reference,
  onClose,
  onInsert,
  sourceNoteId,
  onOpenBible,
  onBookmarkChange,
  showOpenBible = true,
}: {
  reference: Reference | null;
  onClose: () => void;
  onInsert?: (text: string) => void;
  sourceNoteId?: string;
  onOpenBible?: (reference: Reference) => Promise<void>;
  onBookmarkChange?: () => void;
  showOpenBible?: boolean;
}) {
  const { language, fontSize } = useApp();
  const sw = language === 'sw';
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
        }
      })
      .catch(() => {
        if (active) setError('This passage could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [reference, language, key]);
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
  return (
    <Sheet
      visible={Boolean(reference)}
      title={reference ? formatReference(reference, language) : ''}
      onClose={onClose}
    >
      {loading && !error ? (
        <ActivityIndicator color={colors.ink} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data.verses.length ? (
        <>
          <View style={{ gap: 14 }}>
            {data.verses.map((verse) => (
              <Text
                key={verse.verse}
                selectable
                style={{
                  fontFamily: fonts.serif,
                  fontSize,
                  lineHeight: fontSize * 1.65,
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
          <Body muted>{bible.versions.find((version) => version.id === language)?.name}</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void bookmark()}
              style={styles.chip}
            >
              <Icon name={allSaved ? 'bookmark' : 'bookmark-outline'} size={16} />
              <Text style={styles.chipText}>
                {allSaved ? (sw ? 'Ondoa alama' : 'Unsave') : sw ? 'Hifadhi' : 'Save verse'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Clipboard.setStringAsync(passageText)
                  .then(() => setNotice(sw ? 'Imenakiliwa.' : 'Copied.'))
                  .catch(() => setError('The passage could not be copied.'));
              }}
              style={styles.chip}
            >
              <Icon name="copy-outline" size={16} />
              <Text style={styles.chipText}>{sw ? 'Nakili' : 'Copy'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Share.share({ message: passageText }).catch(() =>
                  setError('Sharing is unavailable on this device.'),
                );
              }}
              style={styles.chip}
            >
              <Icon name="share-outline" size={16} />
              <Text style={styles.chipText}>{sw ? 'Shiriki' : 'Share'}</Text>
            </Pressable>
            {showOpenBible ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (onOpenBible)
                    void onOpenBible(reference!)
                      .then(onClose)
                      .catch(() =>
                        setError('Your note could not be saved before opening the Bible.'),
                      );
                  else {
                    openBible(reference!, sourceNoteId);
                    onClose();
                  }
                }}
                style={styles.chip}
              >
                <Icon name="book-outline" size={16} />
                <Text style={styles.chipText}>{sw ? 'Fungua Biblia' : 'Open in Bible'}</Text>
              </Pressable>
            ) : null}
          </View>
          {notice ? <Text style={[styles.body, { color: colors.green }]}>{notice}</Text> : null}
          {onInsert ? (
            <Button
              icon="add"
              onPress={() => {
                onInsert(passageText);
                onClose();
              }}
            >
              {sw ? 'Ongeza kwenye dokezo hili' : 'Insert into this note'}
            </Button>
          ) : sourceNoteId ? (
            <Button icon="arrow-back" onPress={() => void addToNote(sourceNoteId)}>
              {sw ? 'Ongeza na urudi kwenye dokezo' : 'Add passage and return to note'}
            </Button>
          ) : (
            <Button secondary icon="create-outline" onPress={() => setChoosingNote(!choosingNote)}>
              {sw ? 'Ongeza kwenye daftari' : 'Add to a note'}
            </Button>
          )}
          {choosingNote ? (
            <View style={{ gap: 10 }}>
              <Button secondary onPress={() => void addToNote()} icon="add">
                New reflection with this passage
              </Button>
              {data.notes.slice(0, 12).map((note) => (
                <Pressable
                  key={note.id}
                  accessibilityRole="button"
                  onPress={() => void addToNote(note.id)}
                  style={[styles.row, { paddingVertical: 8 }]}
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
            ? 'This passage is outside the development sample. Import your full Bible library to read it.'
            : 'This passage is not included in the selected translation. Try opening the chapter or switching languages.'}
        </Body>
      )}
    </Sheet>
  );
}
