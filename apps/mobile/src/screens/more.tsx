import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { DrawerActions, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import { formatReference, type Language, type Note, type Reference } from '@bhope/shared';
import { useApp } from '../lib/context';
import { listBookmarks, listNotes, type Bookmark } from '../lib/storage';
import { openMore, openNote, openTab, type DrawerRoutes } from '../navigation/actions';
import { Body, Button, Icon, Label, Screen, fonts, useUi } from '../components/ui';
import { ScriptureSheet } from '../components/scripture-sheet';
export default function More() {
  const { colors, styles } = useUi();
  const { user, language } = useApp();
  const sw = language === 'sw';
  const navigation = useNavigation<DrawerNavigationProp<DrawerRoutes>>();
  const params = useRoute().params as DrawerRoutes['MoreHome'];
  const [library, setLibrary] = useState<{ notes: Note[]; saved: Bookmark[] } | null>(null);
  const [passageVersion, setPassageVersion] = useState<Language>('en');
  const [passage, setPassage] = useState<Reference | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (params?.openDrawer) {
      navigation.dispatch(DrawerActions.openDrawer());
      navigation.setParams({ openDrawer: undefined });
    }
  }, [params?.openDrawer, navigation]);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([listNotes(), listBookmarks()])
        .then(([notes, saved]) => {
          if (active) {
            setLibrary({ notes, saved });
            setError('');
          }
        })
        .catch(() => {
          if (active) setError('Your saved moments could not be loaded.');
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const recent = library?.notes[0],
    savedVerse = library?.saved[0];
  function startReflection() {
    void openNote().catch(() => setError('Your reflection could not be opened.'));
  }
  return (
    <Screen contentStyle={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Label>{sw ? 'NAFASI NDOGO KWA AJILI YAKO' : 'A LITTLE ROOM FOR YOU'}</Label>
        <Text style={{ fontFamily: fonts.serif, color: colors.ink, fontSize: 33, lineHeight: 43 }}>
          {user
            ? sw
              ? `Karibu, ${user.name.split(' ')[0]}.`
              : `Come as you are,\n${user.name.split(' ')[0]}.`
            : sw
              ? 'Njoo ulivyo.'
              : 'Come as you are.'}
        </Text>
        <Body muted>
          {sw
            ? 'Mawazo uliyoweka. Maneno unayobeba. Safari yako ya tumaini.'
            : 'The thoughts you keep. The words you carry. Your own journey of hope.'}
        </Body>
      </View>
      <LinearGradient
        colors={[colors.hero, colors.heroEnd]}
        style={{ borderRadius: 24, padding: 24, gap: 16 }}
      >
        <View style={styles.row}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 9,
              letterSpacing: 1.6,
              color: colors.heroMuted,
            }}
          >
            {sw ? 'SIMAMA KIDOGO NA KUTULIA' : 'A PAUSE FOR YOUR SOUL'}
          </Text>
          <Icon name="leaf-outline" color={colors.heroMuted} size={22} />
        </View>
        <Text
          style={{ fontFamily: fonts.serif, fontSize: 25, lineHeight: 35, color: colors.onHero }}
        >
          {sw
            ? 'Ni jambo gani dogo\nlimekupa tumaini leo?'
            : 'What small thing\ngave you hope today?'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a reflection"
          onPress={startReflection}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            alignSelf: 'flex-start',
            paddingVertical: 9,
          }}
        >
          <Text style={{ fontFamily: fonts.medium, color: colors.onHero, fontSize: 13 }}>
            {sw ? 'Weka wazo hilo' : 'Give that thought a home'}
          </Text>
          <Icon name="arrow-forward" color={colors.onHero} size={18} />
        </Pressable>
      </LinearGradient>
      {library ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            {
              count: library.notes.length,
              label: sw ? 'mawazo yamehifadhiwa' : 'thoughts captured',
              icon: 'journal-outline',
              run: () => openTab('Notebook'),
            },
            {
              count: library.saved.length,
              label: sw ? 'mistari ya kukubeba' : 'verses to carry',
              icon: 'bookmark-outline',
              run: () => openMore('SavedVerses'),
            },
          ].map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={item.run}
              style={{
                flex: 1,
                padding: 18,
                gap: 10,
                borderRadius: 18,
                backgroundColor: colors.soft,
              }}
            >
              <Icon
                name={item.icon as import('../components/ui').IconName}
                color={colors.green}
                size={20}
              />
              <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.ink }}>
                {item.count}
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 11 }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : !error ? (
        <ActivityIndicator color={colors.green} />
      ) : null}
      {recent ? (
        <View style={{ gap: 12 }}>
          <Label>{sw ? 'ENDELEA ULIPOISHIA' : 'PICK UP WHERE YOU LEFT OFF'}</Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue latest note"
            onPress={() => {
              void openNote(recent.id).catch(() => setError('Your note could not be opened.'));
            }}
            style={[styles.card, { padding: 20, gap: 10 }]}
          >
            <Text
              numberOfLines={2}
              style={{ fontFamily: fonts.serif, fontSize: 24, color: colors.ink }}
            >
              {recent.title || (sw ? 'Wazo linalokua' : 'A thought in progress')}
            </Text>
            <Text numberOfLines={2} style={[styles.body, { color: colors.muted }]}>
              {recent.body ||
                (sw
                  ? 'Kuna nafasi ya kuandika zaidi.'
                  : 'There is a little more room for your words.')}
            </Text>
            <View style={styles.row}>
              <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
                {new Date(recent.updatedAt).toLocaleDateString(sw ? 'sw-KE' : 'en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
              <Icon name="arrow-forward" size={17} />
            </View>
          </Pressable>
        </View>
      ) : null}
      {savedVerse ? (
        <View style={{ gap: 12 }}>
          <Label>{sw ? 'NENO ULILOHIFADHI' : 'A WORD YOU KEPT'}</Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read your saved verse"
            onPress={() => {
              setPassageVersion(savedVerse.version);
              setPassage({
                bookId: savedVerse.bookId,
                chapter: savedVerse.chapter,
                verseStart: savedVerse.verse,
                verseEnd: savedVerse.verse,
              });
            }}
            style={{ backgroundColor: colors.peach, borderRadius: 22, padding: 22, gap: 14 }}
          >
            <Text
              numberOfLines={4}
              style={{ fontFamily: fonts.italic, fontSize: 20, lineHeight: 30, color: colors.ink }}
            >
              {savedVerse.text}
            </Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, fontSize: 11 }}>
              {formatReference({ ...savedVerse, verseStart: savedVerse.verse }, savedVerse.version)}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingVertical: 4, gap: 8 }}>
          <Body muted>
            {sw
              ? 'Mistari utakayohifadhi itakuwa na nafasi hapa.'
              : 'The verses you save will find a little home here.'}
          </Body>
          <Button secondary icon="book-outline" onPress={() => openTab('Bible')}>
            {sw ? 'Wakati wa kusoma' : 'Make room for a word'}
          </Button>
        </View>
      )}
      <Text
        style={{
          fontFamily: fonts.body,
          color: colors.muted,
          fontSize: 11,
          textAlign: 'center',
          paddingVertical: 8,
        }}
      >
        {sw
          ? 'Polepole. Kwa imani. Siku moja baada ya nyingine.'
          : 'At your own pace. One faithful day at a time.'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScriptureSheet
        reference={passage}
        version={passageVersion}
        onBookmarkChange={() => {
          void listBookmarks()
            .then((saved) => setLibrary((current) => (current ? { ...current, saved } : current)))
            .catch(() => setError('Your saved verses could not be refreshed.'));
        }}
        onClose={() => setPassage(null)}
      />
    </Screen>
  );
}
