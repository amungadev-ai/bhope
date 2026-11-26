import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { goBack, openDrawer, type BibleParams } from '../navigation/actions';
import {
  books,
  extractReferences,
  formatReference,
  type Verse,
  type Reference,
} from '@bhope/shared';
import { useApp } from '../lib/context';
import {
  bible,
  getAvailableBooks,
  getAvailableChapters,
  getPassage,
  listBookmarks,
  searchBible,
} from '../lib/storage';
import {
  Body,
  Button,
  colors,
  fonts,
  Icon,
  IconButton,
  Input,
  Label,
  LanguageSwitch,
  Screen,
  Sheet,
  styles,
  Title,
} from '../components/ui';
import { ScriptureSheet } from '../components/scripture-sheet';
export default function BibleScreen() {
  const params = (useRoute().params ?? {}) as BibleParams;
  const { language, fontSize, setFontSize } = useApp();
  const [bookId, setBookId] = useState(19);
  const [chapter, setChapter] = useState(23);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [available, setAvailable] = useState<number[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Verse[]>([]);
  const [picker, setPicker] = useState<'book' | 'chapter' | null>(null);
  const [bookQuery, setBookQuery] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const key = `${language}:${bookId}:${chapter}`;
  const loading = loadedKey !== key;
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState<number | undefined>();
  const [highlightEnd, setHighlightEnd] = useState<number | undefined>();
  const [actions, setActions] = useState<Reference | null>(null);
  const route = useRoute();
  const reader = route.name === 'BibleReader';
  const sw = language === 'sw';
  useFocusEffect(
    useCallback(() => {
      if (params.book) {
        const id = Number(params.book);
        if (books.some((book) => book.id === id)) {
          setBookId(id);
          setChapter(Number(params.chapter) || 1);
          setHighlight(Number(params.verse) || undefined);
          setHighlightEnd(Number(params.verseEnd) || Number(params.verse) || undefined);
        }
      }
    }, [params.book, params.chapter, params.verse, params.verseEnd]),
  );
  useEffect(() => {
    let active = true;
    (async () => {
      const availableBooks = await getAvailableBooks(language);
      const selectedBook = availableBooks.includes(bookId) ? bookId : availableBooks[0];
      if (!selectedBook) {
        if (active) {
          setVerses([]);
          setLoadedKey(key);
        }
        return;
      }
      if (selectedBook !== bookId) {
        if (active) setBookId(selectedBook);
        return;
      }
      const availableChapters = await getAvailableChapters(bookId, language);
      const selectedChapter = availableChapters.includes(chapter) ? chapter : availableChapters[0];
      if (selectedChapter !== chapter) {
        if (active) setChapter(selectedChapter);
        return;
      }
      const [passage, bookmarks] = await Promise.all([
        getPassage({ bookId, chapter }, language),
        listBookmarks(),
      ]);
      if (active) {
        setError('');
        setAvailable(availableBooks);
        setChapters(availableChapters);
        setVerses(passage);
        setSaved(
          new Set(
            bookmarks.map(
              (verse) => `${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`,
            ),
          ),
        );
        setLoadedKey(key);
      }
    })().catch(() => {
      if (active) {
        setError('Your Bible library could not be opened.');
        setLoadedKey(key);
      }
    });
    return () => {
      active = false;
    };
  }, [language, bookId, chapter, key]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      const reference = extractReferences(query)[0];
      (reference ? getPassage(reference, language) : searchBible(query, language))
        .then((items) => {
          if (active) setResults(items);
        })
        .catch(() => {
          if (active) setError('Search could not be completed.');
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, language]);
  async function move(direction: number) {
    const index = chapters.indexOf(chapter) + direction;
    if (chapters[index]) {
      setChapter(chapters[index]);
      setHighlight(undefined);
      return;
    }
    const book = available[available.indexOf(bookId) + direction];
    if (book) {
      const nextChapters = await getAvailableChapters(book, language);
      setBookId(book);
      setChapter(direction > 0 ? nextChapters[0] : nextChapters[nextChapters.length - 1]);
      setHighlight(undefined);
    }
  }
  const book = books.find((item) => item.id === bookId)!;
  return (
    <Screen>
      <View style={styles.row}>
        <IconButton
          name={reader ? 'arrow-back' : 'menu-outline'}
          label={reader ? 'Return to note' : 'Open menu'}
          onPress={reader ? goBack : openDrawer}
        />
        <Label>
          {reader && params.sourceNoteId
            ? sw
              ? 'BIBLIA NA DAFTARI'
              : 'BIBLE & NOTEBOOK'
            : sw
              ? 'NAFASI YAKO YA KUSOMA'
              : 'YOUR READING SPACE'}
        </Label>
        <LanguageSwitch />
      </View>
      <View style={styles.row}>
        <View style={{ gap: 6 }}>
          <Label>{sw ? 'NENO LILILO HAI' : 'THE LIVING WORD'}</Label>
          <Title>{sw ? 'Biblia yako.' : 'Your Bible.'}</Title>
        </View>
      </View>
      <Input
        accessibilityLabel="Search Bible"
        placeholder={
          sw ? 'Tafuta Yohana 1: 1–10 au neno' : 'Try John 1: 1–10, jhon 3:16, or a word'
        }
        value={query}
        onChangeText={setQuery}
      />
      {query.trim().length >= 2 ? (
        <View style={{ gap: 14 }}>
          <View style={styles.row}>
            <Label>
              {results.length} {sw ? 'MATOKEO' : 'RESULTS'}
            </Label>
            <Pressable accessibilityRole="button" onPress={() => setQuery('')}>
              <Text style={styles.chipText}>{sw ? 'Funga' : 'Clear'}</Text>
            </Pressable>
          </View>
          {results.map((verse) => (
            <Pressable
              accessibilityRole="button"
              key={`${verse.bookId}:${verse.chapter}:${verse.verse}`}
              style={styles.card}
              onPress={() => {
                setBookId(verse.bookId);
                setChapter(verse.chapter);
                setHighlight(verse.verse);
                setHighlightEnd(extractReferences(query)[0]?.verseEnd ?? verse.verse);
                setQuery('');
              }}
            >
              <Label>{formatReference({ ...verse, verseStart: verse.verse }, language)}</Label>
              <Body>{verse.text}</Body>
            </Pressable>
          ))}
          {!results.length ? <Body muted>No verses found in this library.</Body> : null}
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose Bible book"
                onPress={() => setPicker('book')}
                style={[styles.chip, { flex: 1, justifyContent: 'space-between' }]}
              >
                <Text style={[styles.chipText, { fontSize: 15 }]}>{book[language]}</Text>
                <Icon name="chevron-down" size={14} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose chapter"
                onPress={() => setPicker('chapter')}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{chapter}</Text>
                <Icon name="chevron-down" size={14} />
              </Pressable>
            </View>
            <IconButton
              name="remove"
              label="Smaller Bible text"
              onPress={() => setFontSize(fontSize - 2)}
            />
            <IconButton
              name="add"
              label="Larger Bible text"
              onPress={() => setFontSize(fontSize + 2)}
            />
          </View>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
              paddingBottom: 18,
              gap: 8,
            }}
          >
            <Label>
              {bible.versions.find((version) => version.id === language)?.name.toUpperCase()}
            </Label>
            <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.ink }}>
              {book[language]} {chapter}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <View style={{ gap: 8 }}>
              {verses.map((verse) => {
                const selected = saved.has(`${language}:${bookId}:${chapter}:${verse.verse}`);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Verse ${verse.verse}${selected ? ', saved' : ''}`}
                    key={verse.verse}
                    onPress={() => {
                      setHighlight(verse.verse);
                      setHighlightEnd(verse.verse);
                    }}
                    onLongPress={() =>
                      setActions({
                        bookId,
                        chapter,
                        verseStart: verse.verse,
                        verseEnd: verse.verse,
                      })
                    }
                    delayLongPress={450}
                    style={{
                      padding: 12,
                      marginHorizontal: -12,
                      borderRadius: 12,
                      backgroundColor: selected
                        ? '#E8EDDC'
                        : highlight &&
                            verse.verse >= highlight &&
                            verse.verse <= (highlightEnd ?? highlight)
                          ? '#E4EDF6'
                          : 'transparent',
                      flexDirection: 'row',
                      gap: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 10,
                        paddingTop: 8,
                        color: colors.muted,
                        width: 17,
                      }}
                    >
                      {verse.verse}
                    </Text>
                    <Text
                      selectable={false}
                      style={{
                        fontFamily: fonts.serif,
                        color: colors.ink,
                        fontSize,
                        lineHeight: fontSize * 1.8,
                        flex: 1,
                      }}
                    >
                      {verse.text}
                    </Text>
                    {selected ? (
                      <View style={{ paddingTop: 8 }}>
                        <Icon name="bookmark" size={12} color={colors.green} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.row}>
            <IconButton
              name="arrow-back"
              label="Previous chapter"
              onPress={() => {
                void move(-1).catch(() => setError('The previous chapter could not be opened.'));
              }}
            />
            <Label>{sw ? 'SHIKILIA MSTARI KWA CHAGUZI' : 'HOLD A VERSE FOR OPTIONS'}</Label>
            <IconButton
              name="arrow-forward"
              label="Next chapter"
              onPress={() => {
                void move(1).catch(() => setError('The next chapter could not be opened.'));
              }}
            />
          </View>
          {bible.sample ? (
            <Body muted>
              Development sample · Psalm 23, John 3:16, and Philippians 4:6–7. The full NIV and SRUV
              libraries can be imported from your XML files.
            </Body>
          ) : (
            <Body muted>
              {bible.versions.find((version) => version.id === language)?.copyright}
            </Body>
          )}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {highlight ? (
        <Button
          secondary
          icon="ellipsis-horizontal"
          onPress={() =>
            setActions({
              bookId,
              chapter,
              verseStart: highlight,
              verseEnd: highlightEnd ?? highlight,
            })
          }
        >
          {sw ? 'Chaguzi za kifungu' : 'Passage actions'}
        </Button>
      ) : null}
      <ScriptureSheet
        reference={actions}
        onClose={() => setActions(null)}
        sourceNoteId={params.sourceNoteId}
        showOpenBible={false}
        onBookmarkChange={() => {
          void listBookmarks().then((items) =>
            setSaved(
              new Set(
                items.map(
                  (verse) => `${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`,
                ),
              ),
            ),
          );
        }}
      />
      <Sheet
        visible={picker === 'book'}
        title={sw ? 'Chagua kitabu' : 'Choose a book'}
        onClose={() => setPicker(null)}
      >
        <Input
          placeholder="Search books / Tafuta kitabu"
          value={bookQuery}
          onChangeText={setBookQuery}
        />
        {books
          .filter(
            (item) =>
              available.includes(item.id) &&
              item.aliases.some((alias) => alias.toLowerCase().includes(bookQuery.toLowerCase())),
          )
          .map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              onPress={() => {
                setBookId(item.id);
                setChapter(1);
                setPicker(null);
                setHighlight(undefined);
              }}
              style={[styles.row, { paddingVertical: 9 }]}
            >
              <Body>{item[language]}</Body>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
                {item[language === 'en' ? 'sw' : 'en']}
              </Text>
            </Pressable>
          ))}
      </Sheet>
      <Sheet visible={picker === 'chapter'} title={book[language]} onClose={() => setPicker(null)}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {chapters.map((number) => (
            <Pressable
              accessibilityRole="button"
              key={number}
              onPress={() => {
                setChapter(number);
                setPicker(null);
                setHighlight(undefined);
              }}
              style={[
                styles.chip,
                {
                  width: 49,
                  justifyContent: 'center',
                  backgroundColor: chapter === number ? colors.ink : colors.soft,
                },
              ]}
            >
              <Text style={[styles.chipText, chapter === number && { color: '#fff' }]}>
                {number}
              </Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
