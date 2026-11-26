import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import type { Inspiration } from '@bhope/shared';
import { api } from '../lib/api';
import { useLiveRefresh } from '../lib/use-live-refresh';
import { getPreference, setPreference } from '../lib/storage';
import { useApp } from '../lib/context';
import { Body, Button, Empty, fonts, Icon, Label, Screen, Title, useUi } from '../components/ui';
import { TikTokPlayer } from '../components/tiktok-player';
export default function Inspirations() {
  const { colors, styles } = useUi();
  const { language } = useApp();
  const sw = language === 'sw';
  const [items, setItems] = useState<Inspiration[]>([]);
  const [active, setActive] = useState('');
  const [error, setError] = useState('');
  const [failed, setFailed] = useState('');
  const hasFresh = useRef(false);
  useLiveRefresh(
    useCallback(async (signal) => {
      const fresh = await api<Inspiration[]>('/inspirations', { signal, cache: 'no-store' });
      if (signal.aborted) return;
      hasFresh.current = true;
      setItems(fresh);
      setError('');
      await setPreference('inspirations-cache', JSON.stringify(fresh));
    }, []),
    {
      onError: () =>
        setError('Fresh videos are unavailable right now. Saved titles are shown when available.'),
    },
  );
  useEffect(() => {
    let alive = true;
    (async () => {
      const cache = await getPreference('inspirations-cache');
      if (cache && alive && !hasFresh.current) {
        try {
          setItems(JSON.parse(cache));
        } catch {
          /* keep empty */
        }
      }
    })().catch(() => {
      if (alive)
        setError('Fresh videos are unavailable right now. Saved titles are shown when available.');
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Screen>
      <View style={{ gap: 10 }}>
        <Title>
          {sw ? 'Msukumo mdogo.\nTumaini zaidi.' : 'A little inspiration.\nA little more hope.'}
        </Title>
        <Body muted>
          {sw
            ? 'Video zilizochaguliwa kwa moyo na kwa siku yako.'
            : 'Thoughtfully chosen moments of faith and encouragement.'}
        </Body>
      </View>
      <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
        <Icon name="leaf-outline" size={15} color={colors.green} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.green }}>
          {sw ? 'Zimechaguliwa na wahariri wetu' : 'Curated by our editorial team'}
        </Text>
      </View>
      {error ? <Body muted>{error}</Body> : null}
      {items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Label>{item.category}</Label>
            <Text
              style={{ fontFamily: fonts.serif, fontSize: 25, lineHeight: 35, color: colors.ink }}
            >
              {sw ? item.titleSw || item.title : item.title}
            </Text>
            {active === item.id && failed !== item.id ? (
              <TikTokPlayer url={item.url} onError={() => setFailed(item.id)} />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Watch ${item.title}`}
                onPress={() => {
                  setFailed('');
                  setActive(item.id);
                }}
                style={{
                  height: 170,
                  borderRadius: 18,
                  backgroundColor: colors.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.ink,
                  }}
                >
                  <Icon name="play" color="#F7F6E8" size={24} />
                </View>
                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>
                  {failed === item.id
                    ? 'Try the video again'
                    : sw
                      ? 'Gusa kutazama'
                      : 'A moment to watch'}
                </Text>
              </Pressable>
            )}
            <Body muted>{sw ? item.descriptionSw || item.description : item.description}</Body>
            {failed === item.id ? (
              <Body muted>
                This video could not play here. You can open the original on TikTok.
              </Body>
            ) : null}
            <Button
              secondary
              icon="open-outline"
              onPress={() => {
                void Linking.openURL(item.url).catch(() =>
                  setError('The original video could not be opened.'),
                );
              }}
            >
              {sw ? 'Fungua video TikTok' : 'Open original video'}
            </Button>
          </View>
        ))
      ) : (
        <Empty
          icon="play-circle-outline"
          title={sw ? 'Maneno ya tumaini yanakuja' : 'Encouragement is on its way'}
        >
          {sw
            ? 'Video zilizochaguliwa zitaonekana hapa wahariri wetu watakapozichapisha.'
            : 'Curated videos will appear here as our editors publish them. Until then, you can visit our TikTok page.'}
        </Empty>
      )}
      <Button
        secondary
        icon="logo-tiktok"
        onPress={() => {
          void Linking.openURL('https://www.tiktok.com/@auramultipurposesoap').catch(() =>
            setError('TikTok could not be opened.'),
          );
        }}
      >
        {sw ? 'Tembelea ukurasa wetu' : 'Visit our TikTok page'}
      </Button>
      <Body muted>
        {sw
          ? 'Video zinahitaji mtandao na huchezwa kupitia TikTok.'
          : 'Videos need an internet connection and play through TikTok. You choose when playback begins.'}
      </Body>
    </Screen>
  );
}
