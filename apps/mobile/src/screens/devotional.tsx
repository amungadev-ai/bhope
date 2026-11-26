import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { goBack, navigate, openBible, openTab } from '../navigation/actions';
import {
  formatReference,
  publicationDay,
  type Devotional,
  type Note,
  type Verse,
} from '@bhope/shared';
import { useApp } from '../lib/context';
import { getPassage, getPreference, saveNote, setPreference } from '../lib/storage';
import { Body, Button, fonts, Icon, IconButton, Label, Screen, useUi } from '../components/ui';
import { api, apiUrl } from '../lib/api';
import { publicationLabel } from '../lib/devotionals';
export default function DevotionalScreen() {
  const { colors, styles } = useUi();
  const { id } = useRoute().params as { id: string };
  const { language, fontSize, devotionals, rememberDevotionals } = useApp();
  const cached = devotionals.find((item) => item.id === id);
  const [loaded, setLoaded] = useState<Devotional | null>(null);
  const devotional = cached ?? (loaded?.id === id ? loaded : undefined);
  const [attempted, setAttempted] = useState('');
  const [detailRetry, setDetailRetry] = useState(0);
  const requestKey = `${id}:${detailRetry}`;
  const fetching = !devotional && Boolean(apiUrl) && attempted !== requestKey;
  const [reading, setReading] = useState<{ key: string; verses: Verse[]; completed: boolean }>({
    key: '',
    verses: [],
    completed: false,
  });
  const [error, setError] = useState('');
  const day = publicationDay(new Date().toISOString())!;
  const readingKey = `${id}:${language}:${day}`;
  const verses = reading.key === readingKey ? reading.verses : [];
  const completed = reading.key === readingKey && reading.completed;
  const text = devotional?.[language];
  const sw = language === 'sw';
  useEffect(() => {
    let active = true;
    if (cached || !apiUrl) return;
    void api<Devotional>(`/devotionals/${encodeURIComponent(id)}`)
      .then((item) => {
        if (!active) return;
        setLoaded(item);
        rememberDevotionals([item]);
      })
      .catch(() => {
        /* the offline/error view offers a retry */
      })
      .finally(() => {
        if (active) setAttempted(requestKey);
      });
    return () => {
      active = false;
    };
  }, [id, cached, requestKey, rememberDevotionals]);
  useEffect(() => {
    let active = true;
    if (!devotional) return;
    Promise.all([getPassage(devotional, language), getPreference(`read:${day}:${id}`)])
      .then(([passage, done]) => {
        if (active) {
          setReading({ key: readingKey, verses: passage, completed: done === 'true' });
          setError('');
        }
      })
      .catch(() => {
        if (active) {
          setReading({ key: readingKey, verses: [], completed: false });
          setError(
            sw
              ? 'Usomaji wako haukuweza kufunguliwa.'
              : 'Your reading progress could not be loaded.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [devotional, language, day, id, sw, readingKey]);
  const header = (
    <View
      testID="devotional-reader-header"
      style={{
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <IconButton name="arrow-back" label="Go back" onPress={goBack} />
        <View style={{ flex: 1, gap: 7 }}>
          <Text
            accessibilityRole="header"
            numberOfLines={3}
            style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 32, color: colors.ink }}
          >
            {text?.title ?? (sw ? 'Tafakari' : 'Your quiet moment')}
          </Text>
          {text?.subtitle ? (
            <Text
              numberOfLines={2}
              style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: colors.muted }}
            >
              {text.subtitle}
            </Text>
          ) : null}
          {devotional ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
              <Icon name="time-outline" size={13} color={colors.green} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.green }}>
                {devotional.minutes} {sw ? 'dakika za kusoma' : 'min read'}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
                · {devotional.category}
                {devotional.publishAt
                  ? ` · ${publicationLabel(devotional.publishAt, language)}`
                  : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
  if (!devotional || !text)
    return (
      <Screen safeTop safeBottom header={header}>
        {fetching ? (
          <ActivityIndicator accessibilityLabel="Loading devotional" color={colors.green} />
        ) : (
          <>
            <Body>
              {sw
                ? 'Tafakari hii haipatikani kwa sasa. Jaribu tena ukiwa mtandaoni.'
                : 'This reading is not available right now. Try again when you are connected.'}
            </Body>
            {apiUrl ? (
              <Button secondary onPress={() => setDetailRetry(detailRetry + 1)}>
                {sw ? 'Jaribu tena' : 'Try again'}
              </Button>
            ) : null}
            <Button onPress={() => openTab('Today')}>{sw ? 'Rudi leo' : 'Return to today'}</Button>
          </>
        )}
      </Screen>
    );
  async function reflect() {
    if (!text) return;
    try {
      const now = new Date().toISOString();
      const note: Note = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        title: text.title,
        body: `${formatReference(devotional!, language)}\n\n${text.question}\n\n`,
        kind: 'reflection',
        preacher: '',
        church: '',
        sermonDate: day,
        createdAt: now,
        updatedAt: now,
      };
      await saveNote(note);
      navigate('NoteEditor', { id: note.id });
    } catch {
      setError('Your reflection could not be created. Please try again.');
    }
  }
  return (
    <Screen
      safeTop
      safeBottom
      header={header}
      contentStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 32, gap: 28 }}
    >
      <View style={[styles.card, { backgroundColor: colors.soft }]}>
        <Label>{formatReference(devotional, language).toUpperCase()}</Label>
        {reading.key !== readingKey ? (
          <ActivityIndicator color={colors.green} />
        ) : verses.length ? (
          verses.map((verse) => (
            <Text
              key={verse.verse}
              style={{
                fontFamily: fonts.serif,
                fontSize,
                lineHeight: fontSize * 1.7,
                color: colors.ink,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.muted }}>{verse.verse} </Text>
              {verse.text}
            </Text>
          ))
        ) : (
          <Body>
            {sw
              ? 'Kifungu hiki hakipatikani kwenye maktaba hii.'
              : 'The passage is not available in this library.'}
          </Body>
        )}
        <Button secondary icon="book-outline" onPress={() => openBible(devotional)}>
          {sw ? 'Soma katika Biblia' : 'Read in Bible'}
        </Button>
      </View>
      <View style={{ gap: 18 }}>
        <Label>{sw ? 'TAFAKARI' : 'REFLECT'}</Label>
        <Text
          selectable
          style={{
            fontFamily: fonts.body,
            color: colors.ink,
            fontSize: fontSize - 3,
            lineHeight: fontSize * 1.6,
          }}
        >
          {text.reflection}
        </Text>
      </View>
      <View style={styles.card}>
        <Label>{sw ? 'ISHI KWA NENO' : 'LIVE IT OUT'}</Label>
        <Body>{text.application}</Body>
      </View>
      <View style={{ gap: 14 }}>
        <Label>{sw ? 'TUOMBE' : 'A MOMENT OF PRAYER'}</Label>
        <Text
          style={{
            fontFamily: fonts.italic,
            fontSize: fontSize - 1,
            lineHeight: fontSize * 1.65,
            color: colors.green,
          }}
        >
          {text.prayer}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.peach }]}>
        <Label>{sw ? 'SWALI KWA MOYO' : 'TAKE IT TO HEART'}</Label>
        <Text style={{ fontFamily: fonts.serif, fontSize: 23, lineHeight: 33, color: colors.ink }}>
          {text.question}
        </Text>
        <Button secondary icon="create-outline" onPress={() => void reflect()}>
          {sw ? 'Andika tafakari' : 'Write a reflection'}
        </Button>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        testID="mark-devotional-read"
        disabled={reading.key !== readingKey}
        secondary={completed}
        icon={completed ? 'checkmark-circle-outline' : 'checkmark-outline'}
        onPress={() => {
          void setPreference(`read:${day}:${id}`, 'true')
            .then(() =>
              setReading((previous) => ({
                key: readingKey,
                verses: previous.key === readingKey ? previous.verses : [],
                completed: true,
              })),
            )
            .catch(() => setError('Your reading progress could not be saved.'));
        }}
      >
        {completed
          ? sw
            ? 'Umetafakari leo'
            : 'A little hope carried with you'
          : sw
            ? 'Nimetafakari leo'
            : 'I’ve reflected today'}
      </Button>
    </Screen>
  );
}
