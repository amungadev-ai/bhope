import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { formatReference } from '@bhope/shared';
import { useApp } from '../../lib/context';
import { listBookmarks, type Bookmark } from '../../lib/storage';
import { api, apiUrl } from '../../lib/api';
import {
  Body,
  Button,
  colors,
  fonts,
  Icon,
  IconButton,
  Label,
  LanguageSwitch,
  Screen,
  Sheet,
  styles,
  Title,
} from '../../components/ui';
export default function MoreScreen() {
  const { language, setLanguage, fontSize, setFontSize } = useApp();
  const sw = language === 'sw';
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState({
    tiktokUrl: 'https://www.tiktok.com/@auramultipurposesoap',
    donationUrl: null as string | null,
  });
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listBookmarks()
        .then((items) => {
          if (active) setBookmarks(items);
        })
        .catch(() => {
          if (active) setError('Your bookmarks could not be loaded.');
        });
      return () => {
        active = false;
      };
    }, []),
  );
  useEffect(() => {
    let active = true;
    if (apiUrl)
      void api<typeof config>('/config')
        .then((settings) => {
          if (active) setConfig(settings);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  async function open(url: string) {
    try {
      if (!url.startsWith('https://')) throw new Error();
      await Linking.openURL(url);
    } catch {
      setError('This link could not be opened. Please try again later.');
    }
  }
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Label>{sw ? 'TUKUE PAMOJA' : 'A LITTLE MORE CONNECTION'}</Label>
        <Title>{sw ? 'Safari yako.' : 'Your journey.'}</Title>
        <Body muted>{sw ? 'Fanya nafasi hii iwe yako.' : 'Make this little space your own.'}</Body>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/account')}
        style={[styles.card, styles.row]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ padding: 12, borderRadius: 18, backgroundColor: colors.soft }}>
            <Icon name="person-outline" />
          </View>
          <View>
            <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 16 }}>
              {sw ? 'Akaunti yako' : 'Your account'}
            </Text>
            <Body muted>{sw ? 'Unganisha huduma za AI' : 'Connect for AI assistance'}</Body>
          </View>
        </View>
        <Icon name="chevron-forward" size={19} />
      </Pressable>
      <View style={styles.card}>
        <Label>{sw ? 'MAPENDELEO YA KUSOMA' : 'YOUR READING SPACE'}</Label>
        <View style={styles.row}>
          <Body>{sw ? 'Lugha' : 'Language'}</Body>
          <LanguageSwitch />
        </View>
        <View style={styles.row}>
          <Body>{sw ? 'Ukubwa wa maandishi' : 'Bible text size'}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconButton
              name="remove"
              label="Smaller text"
              onPress={() => setFontSize(fontSize - 2)}
            />
            <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>Aa</Text>
            <IconButton name="add" label="Larger text" onPress={() => setFontSize(fontSize + 2)} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowBookmarks(true)}
          style={styles.row}
        >
          <Body>{sw ? 'Mistari iliyohifadhiwa' : 'Saved verses'}</Body>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.chipText}>{bookmarks.length}</Text>
            <Icon name="chevron-forward" size={17} />
          </View>
        </Pressable>
      </View>
      <View style={[styles.card, { backgroundColor: colors.ink, borderWidth: 0 }]}>
        <View style={styles.row}>
          <Icon name="logo-tiktok" color="#E8E9DB" size={25} />
          <Label color="#D9DABF">BEYOND THE PAGE</Label>
        </View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 27, lineHeight: 36, color: '#FFFFF2' }}>
          {sw ? 'Tumaini, popote ulipo.' : 'A little hope, wherever you are.'}
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 22, color: '#CAD7C4' }}>
          {sw
            ? 'Tembelea ukurasa wetu wa TikTok kwa video zaidi.'
            : 'Visit our TikTok page for more moments of encouragement.'}
        </Text>
        <Button secondary icon="open-outline" onPress={() => void open(config.tiktokUrl)}>
          {sw ? 'Fungua TikTok' : 'Watch on TikTok'}
        </Button>
      </View>
      <View style={[styles.card, { backgroundColor: colors.peach }]}>
        <Icon name="heart-outline" color="#8D7041" />
        <Text style={{ fontFamily: fonts.serif, fontSize: 25, color: colors.ink }}>
          {sw ? 'Saidia mwanga uendelee.' : 'Help keep the light shining.'}
        </Text>
        <Body>
          {sw
            ? 'Beacon of Hope ni bure kwa kila mtu. Kutoa ni hiari.'
            : 'Beacon of Hope is free for everyone. Giving is always optional.'}
        </Body>
        {config.donationUrl ? (
          <Button secondary icon="heart-outline" onPress={() => void open(config.donationUrl!)}>
            {sw ? 'Saidia huduma' : 'Support the ministry'}
          </Button>
        ) : (
          <Body muted>
            {sw
              ? 'Njia za kutoa zitapatikana hapa hivi karibuni.'
              : 'Ways to give will be available here soon.'}
          </Body>
        )}
      </View>
      <View style={{ gap: 10 }}>
        <Label>{sw ? 'DAFTARI LAKO NI LAKO' : 'YOUR WORDS ARE YOURS'}</Label>
        <Body muted>
          Notes are stored on this device. Export important notes before uninstalling the app or
          clearing Expo Go data. AI receives note text only when you choose to send it.
        </Body>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text
        style={{ textAlign: 'center', fontFamily: fonts.body, fontSize: 10, color: colors.muted }}
      >
        BEACON OF HOPE · EARLY PREVIEW 0.1.0
      </Text>
      <Sheet
        visible={showBookmarks}
        title={sw ? 'Mistari yako' : 'Words you’re holding on to'}
        onClose={() => setShowBookmarks(false)}
      >
        {bookmarks.length ? (
          bookmarks.map((verse) => (
            <Pressable
              accessibilityRole="button"
              key={`${verse.version}:${verse.bookId}:${verse.chapter}:${verse.verse}`}
              style={styles.card}
              onPress={() => {
                setShowBookmarks(false);
                if (verse.version !== language) setLanguage(verse.version);
                router.push({
                  pathname: '/bible',
                  params: { book: verse.bookId, chapter: verse.chapter, verse: verse.verse },
                });
              }}
            >
              <Label>{formatReference({ ...verse, verseStart: verse.verse }, verse.version)}</Label>
              <Body>{verse.text}</Body>
            </Pressable>
          ))
        ) : (
          <Body>Tap a verse in the Bible reader to save it here.</Body>
        )}
      </Sheet>
    </Screen>
  );
}
