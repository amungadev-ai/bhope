import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { formatReference, type Reference } from '@bhope/shared';
import { useApp } from '../lib/context';
import { listBookmarks, type Bookmark } from '../lib/storage';
import { openDrawer } from '../navigation/actions';
import {
  Body,
  colors,
  Empty,
  fonts,
  Icon,
  IconButton,
  Label,
  Screen,
  styles,
  Title,
} from '../components/ui';
import { ScriptureSheet } from '../components/scripture-sheet';
export function SavedVerses() {
  const { language } = useApp();
  const sw = language === 'sw';
  const [items, setItems] = useState<Bookmark[]>([]);
  const [reference, setReference] = useState<Reference | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    void listBookmarks()
      .then(setItems)
      .catch(() => setError('Your saved verses could not be loaded.'));
  }, []);
  useFocusEffect(refresh);
  return (
    <Screen>
      <IconButton name="menu-outline" label="Open menu" onPress={openDrawer} />
      <View style={{ gap: 8 }}>
        <Label>{sw ? 'MANENO YANAYOKUBEBA' : 'WORDS TO CARRY WITH YOU'}</Label>
        <Title>{sw ? 'Mistari yako.' : 'Your saved verses.'}</Title>
        <Body muted>
          {sw
            ? 'Kumbuka vifungu vinavyokutia moyo.'
            : 'Come back to the words that met you where you were.'}
        </Body>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length ? (
        items.map((verse) => (
          <Pressable
            key={`${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`}
            accessibilityRole="button"
            onPress={() =>
              setReference({
                bookId: verse.bookId,
                chapter: verse.chapter,
                verseStart: verse.verse,
                verseEnd: verse.verse,
              })
            }
            style={styles.card}
          >
            <View style={styles.row}>
              <Label>{formatReference({ ...verse, verseStart: verse.verse }, verse.version)}</Label>
              <Icon name="bookmark" size={16} color={colors.green} />
            </View>
            <Text
              style={{ fontFamily: fonts.serif, color: colors.ink, fontSize: 20, lineHeight: 32 }}
            >
              {verse.text}
            </Text>
          </Pressable>
        ))
      ) : (
        <Empty
          icon="bookmark-outline"
          title={sw ? 'Maneno yatakaa hapa' : 'A place for the words you love'}
        >
          {sw
            ? 'Shikilia mstari ndani ya Biblia na uchague kuhifadhi.'
            : 'Hold a verse in the Bible and choose Save verse.'}
        </Empty>
      )}
      <ScriptureSheet
        reference={reference}
        onClose={() => setReference(null)}
        onBookmarkChange={refresh}
      />
    </Screen>
  );
}
export function About() {
  const { language } = useApp();
  const sw = language === 'sw';
  return (
    <Screen>
      <IconButton name="menu-outline" label="Open menu" onPress={openDrawer} />
      <View style={{ gap: 10 }}>
        <Label>BEACON OF HOPE</Label>
        <Title>{sw ? 'Mwanga wa kushiriki.' : 'A little light, freely shared.'}</Title>
        <Body muted>
          {sw
            ? 'Kusoma, kutafakari, na kukua katika tumaini.'
            : 'A daily space for Scripture, thoughtful reflection, and the words you want to keep.'}
        </Body>
      </View>
      <View style={[styles.card, { backgroundColor: colors.soft }]}>
        <Icon name="leaf-outline" size={27} />
        <Title style={{ fontSize: 26, lineHeight: 36 }}>
          {sw ? 'Tumaini kwa kila mtu.' : 'Hope belongs to everyone.'}
        </Title>
        <Body>
          {sw
            ? 'Ibada za kila siku, Biblia, na daftari vinapatikana bure. Kutoa ni hiari.'
            : 'Daily devotionals, the Bible, and the notebook remain free. Giving is always optional.'}
        </Body>
      </View>
      <View style={{ gap: 14 }}>
        <Label>{sw ? 'KUTOA KWA UWAZI' : 'GIVING WITH TRANSPARENCY'}</Label>
        <Body>
          Our aim is to sustain this platform and support people in need. We will publish updates on
          how funds are used. Donation records show confirmed payments separately from pending or
          unsuccessful attempts.
        </Body>
        <Body muted>
          Financial reporting and community support updates will appear here once they have been
          reviewed and published by the ministry.
        </Body>
      </View>
      <View style={styles.card}>
        <Label>{sw ? 'FARAGHA YAKO' : 'YOUR PRIVACY'}</Label>
        <Body>
          Your notes stay on this device. Editors cannot read your notebook. Text is sent to
          DeepSeek only when you choose an assistance action. Watching an embedded video connects to
          TikTok. Payments are handled by Safaricom or Paystack.
        </Body>
        <Body muted>
          Export important notes before uninstalling the app or clearing its data. Account-linked
          backup and sync will be added separately.
        </Body>
      </View>
    </Screen>
  );
}
