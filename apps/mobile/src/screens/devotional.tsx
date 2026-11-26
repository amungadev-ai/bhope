import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { goBack, navigate, openTab } from '../navigation/actions';
import { formatReference, type Note, type Verse } from '@bhope/shared';
import { useApp } from '../lib/context';
import { getPassage, getPreference, saveNote, setPreference } from '../lib/storage';
import {
  Body,
  Button,
  colors,
  fonts,
  IconButton,
  Label,
  LanguageSwitch,
  Screen,
  styles,
  Title,
} from '../components/ui';
export default function DevotionalScreen() {
  const { id } = useRoute().params as { id: string };
  const { language, fontSize, devotionals } = useApp();
  const devotional = devotionals.find((item) => item.id === id);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const day = new Date().toLocaleDateString('en-CA');
  useEffect(() => {
    let active = true;
    if (!devotional) return;
    Promise.all([getPassage(devotional, language), getPreference(`read:${day}:${id}`)])
      .then(([passage, done]) => {
        if (active) {
          setVerses(passage);
          setCompleted(done === 'true');
        }
      })
      .catch(() => setError('Your reading progress could not be loaded.'));
    return () => {
      active = false;
    };
  }, [devotional, language, day, id]);
  if (!devotional)
    return (
      <Screen>
        <Button onPress={() => openTab('Today')}>Return to today</Button>
        <Body>This devotional is not available offline.</Body>
      </Screen>
    );
  const text = devotional[language];
  const sw = language === 'sw';
  async function reflect() {
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
    <Screen>
      <View style={styles.row}>
        <IconButton name="arrow-back" label="Go back" onPress={() => goBack()} />
        <Label>{sw ? 'NAFASI YA KUTULIA' : 'YOUR QUIET MOMENT'}</Label>
        <LanguageSwitch />
      </View>
      <View style={{ gap: 12 }}>
        <Label>
          {devotional.category} · {devotional.minutes} MIN
        </Label>
        <Title>{text.title}</Title>
        <Body muted>{text.subtitle}</Body>
      </View>
      <View style={[styles.card, { backgroundColor: colors.soft }]}>
        <Label>{formatReference(devotional, language).toUpperCase()}</Label>
        {verses.length ? (
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
          <Body>The passage is not available in this library.</Body>
        )}
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
        secondary={completed}
        icon={completed ? 'checkmark-circle-outline' : 'checkmark-outline'}
        onPress={() => {
          void setPreference(`read:${day}:${id}`, 'true')
            .then(() => setCompleted(true))
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
