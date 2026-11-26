import { useCallback, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { navigate, openNote } from '../navigation/actions';
import { extractReferences, type Note } from '@bhope/shared';
import { deleteNote, getNote, listNotes, saveNote } from '../lib/storage';
import { useApp } from '../lib/context';
import {
  Body,
  Button,
  Empty,
  fonts,
  Icon,
  Input,
  Label,
  Screen,
  Sheet,
  useUi,
} from '../components/ui';
export default function NotesScreen() {
  const { colors, styles } = useUi();
  const { language } = useApp();
  const sw = language === 'sw';
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'sermon' | 'reflection'>('all');
  const [error, setError] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteAction, setNoteAction] = useState<'menu' | 'rename' | 'delete'>('menu');
  const [renamedTitle, setRenamedTitle] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  function showActions(note: Note) {
    setSelectedNote(note);
    setNoteAction('menu');
    setRenamedTitle(note.title);
    setActionError('');
  }
  async function changeNote(action: 'rename' | 'delete') {
    if (!selectedNote || busy) return;
    setBusy(true);
    setActionError('');
    try {
      if (action === 'delete') await deleteNote(selectedNote.id);
      else {
        const current = await getNote(selectedNote.id);
        if (!current) throw new Error('This note is no longer available.');
        if (!renamedTitle.trim()) throw new Error('Enter a title for this note.');
        await saveNote({
          ...current,
          title: renamedTitle.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
      setNotes(await listNotes());
      setSelectedNote(null);
    } catch (failure) {
      setActionError(
        failure instanceof Error ? failure.message : 'This note could not be updated.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function shareNote(note: Note) {
    try {
      await Share.share({
        title: note.title || 'Beacon of Hope note',
        message: `${note.title}\n${[note.preacher, note.church, note.sermonDate].filter(Boolean).join(' · ')}\n\n${note.body}`,
      });
    } catch {
      setActionError('Sharing is unavailable on this device.');
    }
  }
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
                onLongPress={() => showActions(note)}
                delayLongPress={450}
                accessibilityLabel={note.title || (sw ? 'Dokezo bila kichwa' : 'Untitled note')}
                accessibilityHint={
                  sw
                    ? 'Shikilia kwa kubadili jina, kushiriki au kufuta.'
                    : 'Hold to rename, share, or delete.'
                }
                accessibilityActions={[
                  { name: 'longpress', label: sw ? 'Chaguzi za dokezo' : 'Note actions' },
                ]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'longpress') showActions(note);
                }}
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
          {sw ? 'Shikilia dokezo kwa chaguzi zaidi' : 'Hold a note for rename, share, or delete'}
        </Text>
      </View>
      <Sheet
        visible={Boolean(selectedNote)}
        title={
          noteAction === 'rename'
            ? sw
              ? 'Badili kichwa'
              : 'Rename note'
            : noteAction === 'delete'
              ? sw
                ? 'Futa dokezo?'
                : 'Delete this note?'
              : sw
                ? 'Chaguzi za dokezo'
                : 'Note actions'
        }
        onClose={() => {
          if (!busy) setSelectedNote(null);
        }}
      >
        {noteAction === 'menu' ? (
          <>
            <Text
              numberOfLines={2}
              style={{ fontFamily: fonts.serif, fontSize: 23, color: colors.ink }}
            >
              {selectedNote?.title || (sw ? 'Bila kichwa' : 'Untitled note')}
            </Text>
            {[
              {
                label: sw ? 'Badili kichwa' : 'Rename',
                icon: 'create-outline',
                run: () => setNoteAction('rename'),
              },
              {
                label: sw ? 'Shiriki' : 'Share',
                icon: 'share-outline',
                run: () => {
                  if (selectedNote) void shareNote(selectedNote);
                },
              },
              {
                label: sw ? 'Futa dokezo' : 'Delete',
                icon: 'trash-outline',
                run: () => setNoteAction('delete'),
              },
            ].map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                onPress={action.run}
                style={[styles.row, { paddingVertical: 12 }]}
              >
                <Icon
                  name={action.icon as import('../components/ui').IconName}
                  size={20}
                  color={action.icon === 'trash-outline' ? colors.danger : colors.ink}
                />
                <Text style={[styles.body, { flex: 1 }]}>{action.label}</Text>
                <Icon name="chevron-forward" size={14} />
              </Pressable>
            ))}
          </>
        ) : noteAction === 'rename' ? (
          <>
            <Input
              accessibilityLabel="Rename note title"
              value={renamedTitle}
              onChangeText={setRenamedTitle}
              maxLength={200}
              autoFocus
            />
            <Button busy={busy} onPress={() => void changeNote('rename')}>
              {sw ? 'Hifadhi kichwa' : 'Save title'}
            </Button>
          </>
        ) : (
          <>
            <Body>
              {sw
                ? 'Dokezo hili litaondolewa kwenye kifaa hiki.'
                : 'This removes the note from this device. Share a copy first if you want to keep it.'}
            </Body>
            <Button busy={busy} onPress={() => void changeNote('delete')}>
              {sw ? 'Futa dokezo' : 'Delete note'}
            </Button>
            <Button secondary onPress={() => setSelectedNote(null)}>
              {sw ? 'Weka dokezo' : 'Keep my note'}
            </Button>
          </>
        )}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </Sheet>
    </Screen>
  );
}
