import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { formatReference } from '@bhope/shared';
import { useApp } from '../../lib/context';
import { getPassage } from '../../lib/storage';
import {
  Body,
  colors,
  fonts,
  Icon,
  Label,
  LanguageSwitch,
  Screen,
  styles,
  Title,
} from '../../components/ui';
export default function Today() {
  const { language, devotionals } = useApp();
  const [verse, setVerse] = useState('');
  const devotional = devotionals[0];
  const text = devotional[language];
  const sw = language === 'sw';
  useEffect(() => {
    let active = true;
    getPassage({ bookId: 19, chapter: 23, verseStart: 1 }, language)
      .then((items) => {
        if (active) setVerse(items[0]?.text ?? '');
      })
      .catch(() => {
        if (active) setVerse('');
      });
    return () => {
      active = false;
    };
  }, [language]);
  const date = new Intl.DateTimeFormat(sw ? 'sw-KE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  return (
    <Screen>
      <View style={styles.row}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={local.logo}>
            <Icon name="sunny-outline" color={colors.green} size={25} />
          </View>
          <Text style={local.wordmark}>
            beacon of hope<Text style={{ color: colors.gold }}>.</Text>
          </Text>
        </View>
        <LanguageSwitch />
      </View>
      <View style={{ gap: 10 }}>
        <Label>{date.toUpperCase()}</Label>
        <Title>{sw ? 'Mwanga mdogo\nkwa siku yako.' : 'A little light\nfor your day.'}</Title>
        <Body muted>
          {sw ? 'Tulia. Soma. Kua katika tumaini.' : 'Slow down. Find your peace. Grow in hope.'}
        </Body>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Read today's devotional"
        onPress={() => router.push(`/devotional/${devotional.id}`)}
      >
        <LinearGradient colors={['#2B5743', '#173D32']} style={local.hero}>
          <View pointerEvents="none" style={local.orbit} />
          <View pointerEvents="none" style={local.orbit2} />
          <View pointerEvents="none" style={local.sun} />
          <View style={styles.row}>
            <View style={local.heroBadge}>
              <Icon name="sparkles-outline" color="#E7D8AD" size={13} />
              <Text style={local.heroBadgeText}>
                {sw ? 'TAFAKARI YA LEO' : 'TODAY’S DEVOTIONAL'}
              </Text>
            </View>
            <Text style={local.minutes}>
              {devotional.minutes} {sw ? 'dakika' : 'min read'}
            </Text>
          </View>
          <Text style={local.heroTitle}>{text.title}</Text>
          <Text style={local.heroSubtitle}>{text.subtitle}</Text>
          <View style={local.heroReference}>
            <Icon name="book-outline" color="#D5DCC9" size={15} />
            <Text style={local.heroReferenceText}>{formatReference(devotional, language)}</Text>
          </View>
          <View style={local.heroButton}>
            <Text style={local.heroButtonText}>
              {sw ? 'Anza kutafakari' : 'Begin your reflection'}
            </Text>
            <Icon name="arrow-forward" size={19} />
          </View>
        </LinearGradient>
      </Pressable>
      <View style={{ gap: 14 }}>
        <Label>{sw ? 'NAFASI KWA NAFSI YAKO' : 'MAKE ROOM FOR YOUR SOUL'}</Label>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/bible')}
            style={local.quickCard}
          >
            <View style={local.quickIcon}>
              <Icon name="book-outline" />
            </View>
            <Text style={local.quickTitle}>{sw ? 'Fungua Biblia' : 'Open your Bible'}</Text>
            <Text style={local.quickText}>
              {sw ? 'Neno kwa kila hatua' : 'A word for every season'}
            </Text>
            <Icon name="arrow-forward" size={17} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/notes')}
            style={[local.quickCard, { backgroundColor: '#F0EDDF' }]}
          >
            <View style={[local.quickIcon, { backgroundColor: '#E7E2CF' }]}>
              <Icon name="create-outline" />
            </View>
            <Text style={local.quickTitle}>{sw ? 'Weka mawazo' : 'Capture a thought'}</Text>
            <Text style={local.quickText}>
              {sw ? 'Nafasi ya kutafakari' : 'Your space to reflect'}
            </Text>
            <Icon name="arrow-forward" size={17} color={colors.muted} />
          </Pressable>
        </View>
      </View>
      {verse ? (
        <View style={local.verseCard}>
          <View style={styles.row}>
            <Label>{sw ? 'NENO LA KUKUBEBA' : 'A WORD TO CARRY WITH YOU'}</Label>
            <Icon name="leaf-outline" size={19} color={colors.green} />
          </View>
          <Text style={local.verse}>{verse}</Text>
          <Text style={local.verseCaption}>{sw ? 'ZABURI' : 'PSALM'} 23:1</Text>
        </View>
      ) : null}
      {devotionals[1] ? (
        <View style={{ gap: 14 }}>
          <View style={styles.row}>
            <Text style={local.sectionTitle}>{sw ? 'Endelea kukua' : 'Keep growing'}</Text>
            <Icon name="leaf-outline" size={17} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/devotional/${devotionals[1].id}`)}
            style={local.nextCard}
          >
            <View style={local.nextIcon}>
              <Icon name="water-outline" size={23} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 15 }}>
                {devotionals[1][language].title}
              </Text>
              <Text style={local.quickText}>
                {formatReference(devotionals[1], language)} · {devotionals[1].minutes} min
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}
      <Text style={local.footer}>
        {sw
          ? 'Imara katika Neno. Tunakua katika tumaini.'
          : 'Rooted in Scripture. Growing in hope.'}
      </Text>
    </Screen>
  );
}
const local = StyleSheet.create({
  logo: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EBEBD9',
  },
  wordmark: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  hero: { borderRadius: 26, padding: 24, overflow: 'hidden', gap: 15 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF12',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroBadgeText: { fontFamily: fonts.bold, fontSize: 8, letterSpacing: 1.25, color: '#E7D8AD' },
  minutes: { fontFamily: fonts.body, color: '#C6D3C2', fontSize: 10 },
  heroTitle: {
    fontFamily: fonts.serif,
    fontSize: 31,
    lineHeight: 40,
    color: '#FFFEF4',
    maxWidth: 265,
    marginTop: 10,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    color: '#D3DDCB',
    fontSize: 13,
    lineHeight: 22,
    maxWidth: 250,
  },
  heroReference: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroReferenceText: { color: '#DFE6D8', fontFamily: fonts.medium, fontSize: 12 },
  heroButton: {
    backgroundColor: '#F4F4E8',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  heroButtonText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  orbit: {
    position: 'absolute',
    height: 280,
    width: 280,
    borderWidth: 1,
    borderColor: '#DDE2A91A',
    borderRadius: 140,
    right: -135,
    top: 50,
  },
  orbit2: {
    position: 'absolute',
    height: 220,
    width: 220,
    borderWidth: 1,
    borderColor: '#DDE2A91A',
    borderRadius: 110,
    right: -105,
    top: 80,
  },
  sun: {
    position: 'absolute',
    height: 75,
    width: 75,
    borderRadius: 40,
    right: -18,
    top: 130,
    backgroundColor: '#D2B36D24',
  },
  quickCard: { flex: 1, borderRadius: 20, backgroundColor: '#E8ECDD', padding: 18, gap: 10 },
  quickIcon: {
    width: 37,
    height: 37,
    backgroundColor: '#DBE2CE',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  quickText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 17, color: colors.muted },
  verseCard: {
    backgroundColor: '#F4EFE2',
    borderRadius: 22,
    padding: 22,
    gap: 18,
    borderWidth: 1,
    borderColor: '#EAE2D1',
  },
  verse: { fontFamily: fonts.italic, fontSize: 20, lineHeight: 31, color: colors.ink },
  verseCaption: { fontFamily: fonts.bold, fontSize: 9, color: '#8C7955', letterSpacing: 2 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 23, color: colors.ink },
  nextCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF80',
  },
  nextIcon: {
    width: 45,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#E7ECE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    fontFamily: fonts.body,
    fontSize: 10,
    textAlign: 'center',
    color: '#8A9485',
    marginTop: 3,
  },
});
