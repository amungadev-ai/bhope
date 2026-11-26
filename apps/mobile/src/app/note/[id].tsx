import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { extractReferences, formatReference, type Note, type Reference } from '@bhope/shared';
import { deleteNote, getNote, saveNote } from '../../lib/storage';
import { useApp } from '../../lib/context';
import { api } from '../../lib/api';
import { PassageSheet } from '../../components/passage-sheet';
import {
  Body,
  Button,
  colors,
  fonts,
  Icon,
  IconButton,
  Input,
  Label,
  Screen,
  Sheet,
  styles,
} from '../../components/ui';
export default function NoteScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { language } = useApp();
  const sw = language === 'sw';
  const [note, setNote] = useState<Note | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [passage, setPassage] = useState<Reference | null>(null);
  const [dialog, setDialog] = useState<'ai' | 'delete' | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const current = useRef<Note | null>(null);
  const mounted = useRef(true);
  const deleted = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function enqueue(snapshot: Note) {
    queue.current = queue.current.catch(() => undefined).then(() => saveNote(snapshot));
    return queue.current;
  }
  useEffect(() => {
    mounted.current = true;
    deleted.current = false;
    (async () => {
      const now = new Date().toISOString();
      const item: Note | null =
        id === 'new'
          ? {
              id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
              title: '',
              body: '',
              kind: kind === 'sermon' ? 'sermon' : 'reflection',
              preacher: '',
              church: '',
              sermonDate: new Date().toLocaleDateString('en-CA'),
              createdAt: now,
              updatedAt: now,
            }
          : await getNote(id);
      if (!item) throw new Error('This note could not be found on this device.');
      if (mounted.current) {
        current.current = item;
        setNote(item);
      }
    })().catch((failure) => {
      if (mounted.current) setError(failure.message);
    });
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (current.current && !deleted.current) void enqueue(current.current).catch(() => undefined);
    };
  }, [id, kind]);
  useEffect(() => {
    if (!note || deleted.current) return;
    current.current = note;
    setStatus(sw ? 'Inahifadhi…' : 'Saving…');
    timer.current = setTimeout(() => {
      void enqueue(note)
        .then(() => {
          if (mounted.current && current.current?.updatedAt === note.updatedAt)
            setStatus(sw ? 'Imehifadhiwa' : 'Saved on device');
        })
        .catch(() => {
          if (mounted.current) {
            setStatus('Not saved');
            setError('Your latest changes could not be saved. Keep this note open and try again.');
          }
        });
    }, 450);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [note, sw]);
  const references = useMemo(
    () => [
      ...new Map(
        extractReferences(note?.body ?? '').map((reference) => [reference.key, reference]),
      ).values(),
    ],
    [note?.body],
  );
  const update = (changes: Partial<Note>) =>
    setNote((old) => {
      if (!old) return old;
      const next = { ...old, ...changes, updatedAt: new Date().toISOString() };
      current.current = next;
      return next;
    });
  async function finish() {
    try {
      if (timer.current) clearTimeout(timer.current);
      if (current.current) await enqueue(current.current);
      router.back();
    } catch {
      setError('Your note could not be saved. Please try again before leaving.');
    }
  }
  async function remove() {
    try {
      if (timer.current) clearTimeout(timer.current);
      deleted.current = true;
      await queue.current.catch(() => undefined);
      if (note) await deleteNote(note.id);
      router.replace('/notes');
    } catch {
      deleted.current = false;
      setDialog(null);
      setError('Your note could not be deleted.');
    }
  }
  async function assist(action: 'summarize' | 'questions') {
    if (!note) return;
    setBusy(true);
    setAiError('');
    setAiText('');
    const selected =
      selection.end > selection.start ? note.body.slice(selection.start, selection.end) : note.body;
    try {
      const result = await api<{ text: string }>('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ action, text: selected, language, consent: true }),
      });
      setAiText(result.text);
    } catch (failure) {
      setAiError(failure instanceof Error ? failure.message : 'AI assistance is unavailable.');
    } finally {
      setBusy(false);
    }
  }
  if (!note)
    return (
      <Screen>
        <IconButton name="arrow-back" label="Back" onPress={() => router.back()} />
        {error ? <Body>{error}</Body> : <ActivityIndicator color={colors.ink} />}
      </Screen>
    );
  return (
    <Screen>
      <View style={styles.row}>
        <IconButton name="arrow-back" label="Save and go back" onPress={() => void finish()} />
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Label>{sw ? 'DAFTARI LAKO' : 'YOUR NOTEBOOK'}</Label>
          <Text style={{ fontFamily: fonts.body, fontSize: 10, color: colors.muted }}>
            {status}
          </Text>
        </View>
        <IconButton
          name="share-outline"
          label="Export note"
          onPress={() => {
            void Share.share({
              title: note.title || 'Beacon of Hope note',
              message: `${note.title}\n${[note.preacher, note.church, note.sermonDate].filter(Boolean).join(' · ')}\n\n${note.body}`,
            }).catch(() => setError('Your note could not be shared on this device.'));
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['reflection', 'sermon'] as const).map((value) => (
          <Pressable
            accessibilityRole="button"
            key={value}
            onPress={() => update({ kind: value })}
            style={[styles.chip, note.kind === value && { backgroundColor: colors.ink }]}
          >
            <Icon
              name={value === 'sermon' ? 'mic-outline' : 'leaf-outline'}
              size={13}
              color={note.kind === value ? '#fff' : colors.ink}
            />
            <Text style={[styles.chipText, note.kind === value && { color: '#fff' }]}>
              {value === 'sermon' ? (sw ? 'Mahubiri' : 'Sermon') : sw ? 'Tafakari' : 'Reflection'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Input
        accessibilityLabel="Note title"
        placeholder={sw ? 'Wazo lako linaanza hapa…' : 'Give this moment a title…'}
        value={note.title}
        onChangeText={(title) => update({ title })}
        maxLength={200}
        multiline
        style={{
          fontFamily: fonts.serif,
          fontSize: 29,
          lineHeight: 40,
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
        }}
      />
      {note.kind === 'sermon' ? (
        <View style={{ gap: 10 }}>
          <Input
            accessibilityLabel="Preacher"
            placeholder={sw ? 'Mhubiri' : 'Preacher / speaker'}
            value={note.preacher}
            onChangeText={(preacher) => update({ preacher })}
            maxLength={150}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Input
              accessibilityLabel="Church"
              placeholder={sw ? 'Kanisa' : 'Church'}
              value={note.church}
              onChangeText={(church) => update({ church })}
              maxLength={200}
              style={{ flex: 1 }}
            />
            <Input
              accessibilityLabel="Sermon date"
              value={note.sermonDate}
              onChangeText={(sermonDate) => update({ sermonDate })}
              maxLength={30}
              style={{ width: 125 }}
            />
          </View>
        </View>
      ) : null}
      <View
        style={{
          gap: 10,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.line,
        }}
      >
        <View style={styles.row}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Icon name="sparkles-outline" size={14} color={colors.green} />
            <Label>{sw ? 'MAREJEO YA BIBLIA' : 'SCRIPTURE, CONNECTED'}</Label>
          </View>
          <Text style={{ fontFamily: fonts.body, fontSize: 9, color: colors.muted }}>OFFLINE</Text>
        </View>
        {references.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {references.map((reference) => (
              <Pressable
                accessibilityRole="button"
                key={reference.key}
                onPress={() => setPassage(reference)}
                style={styles.chip}
              >
                <Icon name="book-outline" size={13} />
                <Text style={styles.chipText}>{formatReference(reference, language)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text
            style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 20, color: colors.muted }}
          >
            {sw
              ? 'Andika Yohana 3:16 au Zaburi 23. Gusa rejeo kusoma kifungu.'
              : 'Type John 3:16 or Yohana 3:16. Tap a recognized reference to read the passage.'}
          </Text>
        )}
      </View>
      <Input
        accessibilityLabel="Note body"
        testID="note-body"
        placeholder={
          sw
            ? 'Andika unachojifunza, swali, au sala…'
            : 'What is stirring in your heart?\n\nCapture a thought, a verse, a prayer…'
        }
        value={note.body}
        onChangeText={(body) => update({ body })}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        multiline
        textAlignVertical="top"
        maxLength={100000}
        style={{
          minHeight: 300,
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
          fontSize: 17,
          lineHeight: 29,
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        secondary
        icon="sparkles-outline"
        disabled={note.body.trim().length < 10}
        onPress={() => {
          setAiText('');
          setAiError('');
          setDialog('ai');
        }}
      >
        {sw ? 'Msaada wa kutafakari' : 'Reflect with AI'}
      </Button>
      <View style={styles.row}>
        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 11 }}>
          {note.body.trim() ? note.body.trim().split(/\s+/).length : 0} words · {references.length}{' '}
          references
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setDialog('delete')}>
          <Text style={{ color: colors.danger, fontFamily: fonts.medium, fontSize: 12 }}>
            {sw ? 'Futa' : 'Delete note'}
          </Text>
        </Pressable>
      </View>
      <PassageSheet
        reference={passage}
        onClose={() => setPassage(null)}
        onInsert={(text) => update({ body: `${note.body}\n\n${text}\n` })}
      />
      <Sheet
        visible={dialog === 'delete'}
        title="Delete this note?"
        onClose={() => setDialog(null)}
      >
        <Body>
          This removes the note from this device. Export a copy first if you want to keep it.
        </Body>
        <Button onPress={() => void remove()} icon="trash-outline">
          Delete note
        </Button>
        <Button secondary onPress={() => setDialog(null)}>
          Keep my note
        </Button>
      </Sheet>
      <Sheet
        visible={dialog === 'ai'}
        title={sw ? 'Nafasi ya kutafakari' : 'A little help reflecting'}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
      >
        <Body>
          {selection.end > selection.start ? 'Your selected text' : 'This note’s text'} will be sent
          to DeepSeek when you choose an action below. Suggestions are shown for you to review
          before adding them to your note.
        </Body>
        {aiText ? (
          <>
            <Text selectable style={styles.body}>
              {aiText}
            </Text>
            <Button
              icon="add"
              onPress={() => {
                update({ body: `${note.body}\n\nAI-assisted reflection\n${aiText}\n` });
                setDialog(null);
              }}
            >
              Add suggestion to note
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={busy}
              busy={busy}
              icon="sparkles-outline"
              onPress={() => void assist('summarize')}
            >
              Send and summarize
            </Button>
            <Button secondary disabled={busy} onPress={() => void assist('questions')}>
              Send for reflection questions
            </Button>
          </>
        )}
        {aiError ? (
          <>
            <Text style={styles.error}>{aiError}</Text>
            <Button
              secondary
              onPress={() => {
                setDialog(null);
                router.push('/account');
              }}
            >
              Open account
            </Button>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
