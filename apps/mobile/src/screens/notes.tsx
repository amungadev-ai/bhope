import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { navigate, openNote } from '../navigation/actions';
import { extractReferences, type Note } from '@bhope/shared';
import { listNotes } from '../lib/storage';
import { useApp } from '../lib/context';
import { Button, Empty, fonts, Icon, Input, Label, Screen, useUi } from '../components/ui';
export default function NotesScreen() {
  const { colors, styles } = useUi();
  const { language } = useApp();
  const sw = language === 'sw';
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'sermon' | 'reflection'>('all');
  const [error, setError] = useState('');
  useFocusEffect(
    useCallback(() => {
      let active = true;
      listNotes()
        .then((items) => {
          if (active) setNotes(items);
        })
        .catch(() => {
          if (active) setError('Your notebook could not be opened.');
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const visible = notes.filter(
    (note) =>
      (filter === 'all' || note.kind === filter) &&
      `${note.title} ${note.body} ${note.preacher} ${note.church}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <Button icon="create-outline" onPress={() => void openNote('new', 'sermon')}>
        {sw ? 'Andika maelezo ya mahubiri' : 'Take sermon notes'}
      </Button>
      <Input
        accessibilityLabel="Search notes"
        placeholder={sw ? 'Tafuta katika daftari' : 'Search your thoughts and Scripture'}
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['all', 'sermon', 'reflection'] as const).map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item === filter }}
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.chip, filter === item && { backgroundColor: colors.ink }]}
          >
            <Text style={[styles.chipText, filter === item && { color: '#fff' }]}>
              {item === 'all'
                ? sw
                  ? 'Yote'
                  : 'All notes'
                : item === 'sermon'
                  ? sw
                    ? 'Mahubiri'
                    : 'Sermons'
                  : sw
                    ? 'Tafakari'
                    : 'Reflections'}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!visible.length ? (
        <Empty
          icon="journal-outline"
          title={
            notes.length
              ? 'No matching notes'
              : sw
                ? 'Anza na wazo moja'
                : 'Start with a little thought'
          }
        >
          <Text>
            {notes.length
              ? 'Try another word or filter.'
              : sw
                ? 'Andika unachojifunza. Marejeo ya Biblia yatatambuliwa unapoandika.'
                : 'Write what you’re learning. Scripture references will find their place as you type.'}
          </Text>
        </Empty>
      ) : (
        <View style={{ gap: 14 }}>
          {visible.map((note) => {
            const references = extractReferences(note.body);
            return (
              <Pressable
                key={note.id}
                accessibilityRole="button"
                onPress={() => navigate('NoteEditor', { id: note.id })}
                style={styles.card}
              >
                <View style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon
                      name={note.kind === 'sermon' ? 'mic-outline' : 'leaf-outline'}
                      size={14}
                      color={colors.green}
                    />
                    <Label>
                      {note.kind === 'sermon'
                        ? sw
                          ? 'MAHUBIRI'
                          : 'SERMON'
                        : sw
                          ? 'TAFAKARI'
                          : 'REFLECTION'}
                    </Label>
                  </View>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 10 }}>
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.serif, fontSize: 23, color: colors.ink }}>
                  {note.title || (sw ? 'Bila kichwa' : 'Untitled note')}
                </Text>
                <Text numberOfLines={2} style={[styles.body, { color: colors.muted }]}>
                  {note.body ||
                    (sw
                      ? 'Wazo lako linalofuata lina nafasi hapa…'
                      : 'Your next thought has a home here…')}
                </Text>
                {references.length ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="book-outline" size={13} color={colors.green} />
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.green }}>
                      {new Set(references.map((reference) => reference.key)).size} Scripture{' '}
                      {references.length === 1 ? 'reference' : 'references'}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
      <View
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        <Icon name="phone-portrait-outline" size={12} color={colors.muted} />
        <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
          {sw ? 'Yamehifadhiwa kwenye kifaa hiki' : 'Saved privately on this device'}
        </Text>
      </View>
    </Screen>
  );
}
