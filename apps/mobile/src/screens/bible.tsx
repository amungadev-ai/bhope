import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { goBack, type BibleParams } from '../navigation/actions';
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
  fonts,
  Icon,
  IconButton,
  Input,
  Label,
  LanguageSwitch,
  Screen,
  Sheet,
  useUi,
} from '../components/ui';
import { ScriptureSheet } from '../components/scripture-sheet';
export default function BibleScreen() {
  const { colors, styles } = useUi();
  const params = (useRoute().params ?? {}) as BibleParams;
  const { language: appLanguage, bibleLanguage: language, fontSize, setFontSize } = useApp();
  const [bookId, setBookId] = useState(19);
  const [chapter, setChapter] = useState(23);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapters, setChapters] = useState<number[]>([]);
  const [available, setAvailable] = useState<number[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Verse[]>([]);
  const [picker, setPicker] = useState<'book' | 'chapter' | 'range' | null>(null);
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
  const sw = appLanguage === 'sw';
  const [options, setOptions] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeError, setRangeError] = useState('');
  useFocusEffect(
    useCallback(() => {
      if (params.book) {
        const id = Number(params.book);
        if (books.some((book) => book.id === id)) {
          setBookId(id);
          setChapter(Number(params.chapter) || 1);
          setHighlight(Number(params.verse) || undefined);
          setHighlightEnd(Number(params.verseEnd) || Number(params.verse) || undefined);
          setRange(
            Number(params.verseEnd) > Number(params.verse)
              ? { start: Number(params.verse), end: Number(params.verseEnd) }
              : null,
          );
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
      setHighlightEnd(undefined);
      setRange(null);
      return;
    }
    const book = available[available.indexOf(bookId) + direction];
    if (book) {
      const nextChapters = await getAvailableChapters(book, language);
      setBookId(book);
      setChapter(direction > 0 ? nextChapters[0] : nextChapters[nextChapters.length - 1]);
      setHighlight(undefined);
      setHighlightEnd(undefined);
      setRange(null);
    }
  }
  const book = books.find((item) => item.id === bookId)!;
  const displayedVerses = range
    ? verses.filter((verse) => verse.verse >= range.start && verse.verse <= range.end)
    : verses;
  function chooseRange() {
    setRangeStart(String(range?.start ?? highlight ?? verses[0]?.verse ?? 1));
    setRangeEnd(String(range?.end ?? highlightEnd ?? verses.at(-1)?.verse ?? 1));
    setRangeError('');
    setPicker('range');
  }
  function applyRange() {
    const start = Number(rangeStart),
      end = Number(rangeEnd || rangeStart);
    if (
      !/^\d+$/.test(rangeStart) ||
      (rangeEnd && !/^\d+$/.test(rangeEnd)) ||
      start < 1 ||
      end < start ||
      !verses.some((v) => v.verse === start) ||
      !verses.some((v) => v.verse === end)
    ) {
      setRangeError(
        sw
          ? 'Chagua mwanzo na mwisho unaopatikana katika sura hii.'
          : 'Choose a valid start and end verse from this chapter.',
      );
      return;
    }
    setRange({ start, end });
    setHighlight(start);
    setHighlightEnd(end);
    setQuery('');
    setPicker(null);
  }
  const header = (
    <View
      style={{
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {reader ? <IconButton name="arrow-back" label="Return to note" onPress={goBack} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fonts.serif, fontSize: reader ? 23 : 27, color: colors.ink }}>
            {sw ? 'Biblia yako.' : 'Your Bible.'}
          </Text>
          <Text
            numberOfLines={1}
            style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}
          >
            {bible.versions.find((v) => v.id === language)?.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bible text size"
          onPress={() => setOptions(true)}
          style={{ minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.serif, fontSize: 19, color: colors.ink }}>Aa</Text>
        </Pressable>
        <LanguageSwitch bibleOnly />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose Bible book"
          onPress={() => setPicker('book')}
          style={[
            styles.chip,
            {
              flex: 1.5,
              minHeight: 43,
              justifyContent: 'space-between',
              backgroundColor: colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.chipText, { flexShrink: 1, fontSize: 14 }]}>
            {book[language]}
          </Text>
          <Icon name="chevron-down" size={13} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose chapter"
          onPress={() => setPicker('chapter')}
          style={[
            styles.chip,
            {
              minHeight: 43,
              justifyContent: 'space-between',
              backgroundColor: colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            },
          ]}
        >
          <Text style={[styles.chipText, { fontSize: 13 }]}>{chapter}</Text>
          <Icon name="chevron-down" size={13} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose verse range"
          onPress={chooseRange}
          style={[
            styles.chip,
            {
              flex: 1,
              minHeight: 43,
              justifyContent: 'space-between',
              backgroundColor: colors.paper,
              borderWidth: 1,
              borderColor: colors.line,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.chipText, { flexShrink: 1 }]}>
            {range
              ? `${range.start}${range.end !== range.start ? `–${range.end}` : ''}`
              : sw
                ? 'Mistari yote'
                : 'All verses'}
          </Text>
          <Icon name="chevron-down" size={13} />
        </Pressable>
      </View>
      <Input
        accessibilityLabel="Search Bible"
        placeholder={
          sw ? 'Tafuta neno au rejeo · Yohana 1:1–10' : 'Search a word or passage · John 1:1–10'
        }
        value={query}
        onChangeText={setQuery}
        style={{
          minHeight: 42,
          fontSize: 13,
          paddingVertical: 9,
          backgroundColor: colors.soft,
          borderWidth: 0,
        }}
      />
    </View>
  );
  return (
    <Screen
      safeTop
      header={header}
      contentStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 16 }}
    >
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
                const found = extractReferences(query)[0];
                setHighlightEnd(found?.verseEnd ?? verse.verse);
                setRange(
                  found?.verseStart && found.verseEnd && found.verseEnd > found.verseStart
                    ? { start: found.verseStart, end: found.verseEnd }
                    : null,
                );
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
          {loading ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <View style={{ gap: 2 }}>
              {displayedVerses.map((verse) => {
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
                        verseStart: range?.start ?? verse.verse,
                        verseEnd: range?.end ?? verse.verse,
                      })
                    }
                    delayLongPress={450}
                    style={{
                      paddingHorizontal: 4,
                      paddingVertical: 5,
                      marginHorizontal: -4,
                      borderRadius: 12,
                      backgroundColor: selected
                        ? colors.soft
                        : highlight &&
                            verse.verse >= highlight &&
                            verse.verse <= (highlightEnd ?? highlight)
                          ? colors.selection
                          : 'transparent',
                      flexDirection: 'row',
                      gap: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 10,
                        paddingTop: 6,
                        color: colors.muted,
                        width: 16,
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
                        lineHeight: fontSize * 1.55,
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
          {range ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRange(null);
                setHighlight(undefined);
                setHighlightEnd(undefined);
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ fontFamily: fonts.medium, color: colors.green, fontSize: 13 }}>
                {sw ? 'Soma sura nzima' : 'Read the whole chapter'}
              </Text>
            </Pressable>
          ) : null}
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
              Sample Bible · Psalm 23, John 1:1–10, John 3:16, and Philippians 4:6–7.
            </Body>
          ) : (
            <Body muted>
              {bible.versions.find((version) => version.id === language)?.copyright}
            </Body>
          )}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Sheet
        visible={options}
        title={sw ? 'Ukubwa wa maandishi' : 'Text size'}
        onClose={() => setOptions(false)}
      >
        <View style={styles.row}>
          <Body>{sw ? 'Ukubwa wa maandishi' : 'Text size'}</Body>
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
        </View>
        <Body muted>{bible.versions.find((v) => v.id === language)?.copyright}</Body>
      </Sheet>
      <ScriptureSheet
        reference={actions}
        version={language}
        onClose={() => setActions(null)}
        sourceNoteId={params.sourceNoteId}
        showOpenBible={false}
        compactPreview
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
                setHighlightEnd(undefined);
                setRange(null);
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
                setHighlightEnd(undefined);
                setRange(null);
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
      <Sheet
        visible={picker === 'range'}
        title={sw ? 'Chagua mistari' : 'Choose verse range'}
        onClose={() => setPicker(null)}
      >
        <Body>
          {book[language]} {chapter}
        </Body>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Label>{sw ? 'MWANZO' : 'FROM VERSE'}</Label>
            <Input
              accessibilityLabel="From verse"
              value={rangeStart}
              onChangeText={setRangeStart}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Label>{sw ? 'MWISHO' : 'TO VERSE'}</Label>
            <Input
              accessibilityLabel="To verse"
              value={rangeEnd}
              onChangeText={setRangeEnd}
              keyboardType="number-pad"
            />
          </View>
        </View>
        {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}
        <Button onPress={applyRange}>{sw ? 'Soma mistari hii' : 'Read this passage'}</Button>
        <Button
          secondary
          onPress={() => {
            setRange(null);
            setPicker(null);
            setHighlight(undefined);
            setHighlightEnd(undefined);
          }}
        >
          {sw ? 'Sura nzima' : 'Read whole chapter'}
        </Button>
      </Sheet>
    </Screen>
  );
}
