import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import {
  filterDevotionals,
  formatReference,
  isPublicationDate,
  publicationDay,
  type DevotionalArchivePage,
} from '@bhope/shared';
import { goBack, navigate } from '../navigation/actions';
import { useApp } from '../lib/context';
import { api, apiUrl } from '../lib/api';
import { publicationLabel } from '../lib/devotionals';
import {
  Body,
  Button,
  fonts,
  Icon,
  IconButton,
  Input,
  Label,
  Screen,
  Sheet,
  useUi,
} from '../components/ui';

export default function DevotionalArchive() {
  const { colors, styles } = useUi();
  const { language, devotionals, rememberDevotionals } = useApp();
  const sw = language === 'sw';
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [remote, setRemote] = useState<DevotionalArchivePage | null>(null);
  const [busy, setBusy] = useState(Boolean(apiUrl));
  const [moreBusy, setMoreBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [datesOpen, setDatesOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [dateError, setDateError] = useState('');
  const generation = useRef(0);
  const cached = useMemo(
    () => filterDevotionals(devotionals, { query, from, to, order }),
    [devotionals, query, from, to, order],
  );
  const rows = remote?.items ?? cached;
  function resetRemote() {
    generation.current += 1;
    setRemote(null);
    setFailed(false);
    setMoreBusy(false);
    setBusy(Boolean(apiUrl));
  }
  function url(page: number) {
    const params = new URLSearchParams({ q: query.trim(), order, page: String(page), limit: '20' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return `/devotionals/archive?${params}`;
  }
  useEffect(() => {
    const current = ++generation.current;
    if (!apiUrl) return;
    const params = new URLSearchParams({ q: query.trim(), order, page: '1', limit: '20' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const timer = setTimeout(() => {
      void api<DevotionalArchivePage>(`/devotionals/archive?${params}`)
        .then((page) => {
          if (generation.current !== current) return;
          setRemote(page);
          rememberDevotionals(page.items);
        })
        .catch(() => {
          if (generation.current === current) setFailed(true);
        })
        .finally(() => {
          if (generation.current === current) setBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      generation.current += 1;
    };
  }, [query, from, to, order, retry, rememberDevotionals]);
  async function loadMore() {
    if (!remote?.hasMore || moreBusy) return;
    const current = generation.current;
    setMoreBusy(true);
    try {
      const page = await api<DevotionalArchivePage>(url(remote.page + 1));
      if (generation.current !== current) return;
      setRemote((previous) => ({
        ...page,
        items: [
          ...new Map(
            [...(previous?.items ?? []), ...page.items].map((item) => [item.id, item]),
          ).values(),
        ],
      }));
      rememberDevotionals(page.items);
      setFailed(false);
    } catch {
      if (generation.current === current) setFailed(true);
    } finally {
      if (generation.current === current) setMoreBusy(false);
    }
  }
  function reset() {
    resetRemote();
    setQuery('');
    setFrom('');
    setTo('');
  }
  const header = (
    <View
      testID="devotional-archive-header"
      style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
        gap: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconButton name="arrow-back" label="Go back" onPress={goBack} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{ fontFamily: fonts.serif, fontSize: 23, lineHeight: 31, color: colors.ink }}
          >
            {sw ? 'Maktaba ya tafakari' : 'Devotional library'}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>
            {sw ? 'Rudia usomaji uliokupa tumaini.' : 'Revisit a little hope from days gone by.'}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 12,
            borderRadius: 13,
            backgroundColor: colors.soft,
          }}
        >
          <Icon name="search-outline" size={18} color={colors.muted} />
          <Input
            accessibilityLabel="Search devotional titles"
            placeholder={sw ? 'Tafuta kichwa…' : 'Search titles…'}
            value={query}
            onChangeText={(value) => {
              if (value !== query) {
                resetRemote();
                setQuery(value);
              }
            }}
            maxLength={120}
            autoCorrect={false}
            style={{
              flex: 1,
              minWidth: 0,
              borderWidth: 0,
              backgroundColor: 'transparent',
              fontSize: 14,
              paddingVertical: 11,
            }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter publication dates"
          accessibilityState={{ selected: Boolean(from || to) }}
          onPress={() => {
            setDraftFrom(from);
            setDraftTo(to);
            setDateError('');
            setDatesOpen(true);
          }}
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            borderRadius: 12,
            backgroundColor: colors.soft,
          }}
        >
          <Icon name="calendar-outline" size={19} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>
            {sw ? 'Tarehe' : 'Dates'}
            {from || to ? ' •' : ''}
          </Text>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>
          {remote
            ? `${remote.total} ${sw ? 'tafakari' : remote.total === 1 ? 'reading' : 'readings'}`
            : `${cached.length} ${sw ? (cached.length === 1 ? 'iliyohifadhiwa' : 'zilizohifadhiwa') : cached.length === 1 ? 'saved reading' : 'saved readings'}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={order === 'newest' ? 'Show oldest first' : 'Show newest first'}
          onPress={() => {
            resetRemote();
            setOrder(order === 'newest' ? 'oldest' : 'newest');
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 30 }}
        >
          <Icon name="swap-vertical-outline" size={15} color={colors.muted} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.ink }}>
            {order === 'newest'
              ? sw
                ? 'Mpya kwanza'
                : 'Newest first'
              : sw
                ? 'Za zamani kwanza'
                : 'Oldest first'}
          </Text>
        </Pressable>
      </View>
      {from || to ? (
        <View style={styles.row}>
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 11, color: colors.muted }}>
            {from || '…'} — {to || '…'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              resetRemote();
              setFrom('');
              setTo('');
            }}
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.green }}>
              {sw ? 'Ondoa tarehe' : 'Clear dates'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
  return (
    <Screen scroll={false} safeTop safeBottom header={header}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          busy ? (
            <View style={{ paddingBottom: 16 }}>
              <ActivityIndicator color={colors.green} accessibilityLabel="Loading devotionals" />
            </View>
          ) : failed ? (
            <View style={{ gap: 10, paddingBottom: 16 }}>
              <Body muted>
                {sw
                  ? 'Tunaonyesha usomaji uliohifadhiwa. Jaribu tena kupata zaidi.'
                  : 'Showing saved readings. Try again to check for more.'}
              </Body>
              <Button
                secondary
                onPress={() => {
                  resetRemote();
                  setRetry(retry + 1);
                }}
              >
                {sw ? 'Jaribu tena' : 'Try again'}
              </Button>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item[language].title}
            onPress={() => {
              rememberDevotionals([item]);
              navigate('Devotional', { id: item.id });
            }}
            style={[styles.card, { padding: 18, gap: 10 }]}
          >
            <View style={styles.row}>
              <Label>{item.category}</Label>
              <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
                {item.minutes} {sw ? 'dakika' : 'min read'}
              </Text>
            </View>
            <Text
              style={{ fontFamily: fonts.serif, fontSize: 23, lineHeight: 31, color: colors.ink }}
            >
              {item[language].title}
            </Text>
            <Text
              numberOfLines={2}
              style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: colors.muted }}
            >
              {item[language].subtitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="book-outline" size={13} color={colors.green} />
              <Text
                style={{ flex: 1, fontFamily: fonts.medium, fontSize: 11, color: colors.green }}
              >
                {formatReference(item, language)}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
                {publicationLabel(item.publishAt, language)}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !busy ? (
            <View
              style={{ minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 16 }}
            >
              <Icon name="book-outline" color={colors.green} size={34} />
              <Text style={{ fontFamily: fonts.serif, fontSize: 23, color: colors.ink }}>
                {sw ? 'Hakuna tafakari zilizopatikana' : 'No readings found'}
              </Text>
              <Body muted>
                {sw ? 'Jaribu kichwa au tarehe nyingine.' : 'Try a different title or date range.'}
              </Body>
              {query || from || to ? (
                <Button secondary onPress={reset}>
                  {sw ? 'Ondoa vichujio' : 'Clear filters'}
                </Button>
              ) : null}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          remote?.hasMore ? (
            <View style={{ paddingTop: 18 }}>
              <Button secondary busy={moreBusy} onPress={() => void loadMore()}>
                {sw ? 'Onyesha zaidi' : 'Load more devotionals'}
              </Button>
            </View>
          ) : undefined
        }
      />
      <Sheet
        visible={datesOpen}
        onClose={() => setDatesOpen(false)}
        title={sw ? 'Chagua tarehe' : 'Publication dates'}
      >
        <Body muted>
          {sw
            ? 'Tarehe zinatumia saa za Nairobi. Andika YYYY-MM-DD.'
            : 'Dates follow Nairobi time. Enter dates as YYYY-MM-DD.'}
        </Body>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() => {
                setDraftFrom('');
                setDraftTo('');
              }}
            >
              {sw ? 'Wakati wote' : 'All time'}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() => {
                const today = publicationDay(new Date().toISOString())!;
                setDraftTo(today);
                setDraftFrom(
                  new Date(Date.parse(`${today}T12:00:00Z`) - 29 * 86400000)
                    .toISOString()
                    .slice(0, 10),
                );
              }}
            >
              {sw ? 'Siku 30' : 'Last 30 days'}
            </Button>
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Label>{sw ? 'KUANZIA' : 'FROM'}</Label>
          <Input
            accessibilityLabel="From publication date"
            value={draftFrom}
            onChangeText={setDraftFrom}
            placeholder="YYYY-MM-DD"
            maxLength={10}
            autoCorrect={false}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Label>{sw ? 'HADI' : 'TO'}</Label>
          <Input
            accessibilityLabel="To publication date"
            value={draftTo}
            onChangeText={setDraftTo}
            placeholder="YYYY-MM-DD"
            maxLength={10}
            autoCorrect={false}
          />
        </View>
        {dateError ? <Text style={styles.error}>{dateError}</Text> : null}
        <Button
          onPress={() => {
            const start = draftFrom.trim(),
              end = draftTo.trim();
            if ((start && !isPublicationDate(start)) || (end && !isPublicationDate(end))) {
              setDateError(
                sw
                  ? 'Tumia tarehe halali ya YYYY-MM-DD.'
                  : 'Enter a valid date in YYYY-MM-DD format.',
              );
              return;
            }
            if (start && end && start > end) {
              setDateError(
                sw
                  ? 'Tarehe ya kuanzia lazima itangulie ya mwisho.'
                  : 'The start date must be before the end date.',
              );
              return;
            }
            if (start !== from || end !== to) {
              resetRemote();
              setFrom(start);
              setTo(end);
            }
            setDatesOpen(false);
          }}
        >
          {sw ? 'Tumia tarehe' : 'Apply dates'}
        </Button>
      </Sheet>
    </Screen>
  );
}
