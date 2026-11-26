import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { goBack, navigate, openTab, openBible, type RootRoutes } from '../navigation/actions';
import {
  extractReferences,
  formatReference,
  type AiAccess,
  type Note,
  type Reference,
} from '@bhope/shared';
import { deleteNote, getNote, saveNote } from '../lib/storage';
import { useApp } from '../lib/context';
import { api } from '../lib/api';
import { ScriptureSheet } from '../components/scripture-sheet';
import { RichEditor } from '../components/rich-editor';
import { EditorToolbar } from '../components/editor-toolbar';
import type { RichEditorHandle } from '../components/rich-editor-types';
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
export default function NoteScreen() {
  const { colors, styles } = useUi();
  const params = useRoute().params as RootRoutes['NoteEditor'];
  const { id, kind } = params;
  const { language, user } = useApp();
  const sw = language === 'sw';
  const [note, setNote] = useState<Note | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [passageActions, setPassageActions] = useState(false);
  const [passage, setPassage] = useState<Reference | null>(null);
  const [dialog, setDialog] = useState<'ai' | 'delete' | 'menu' | 'details' | 'references' | null>(
    null,
  );
  const [aiAccess, setAiAccess] = useState<AiAccess | null>(null);
  useEffect(() => {
    let active = true;
    if (dialog === 'ai' && user)
      void api<AiAccess>('/ai/access')
        .then((value) => {
          if (active) setAiAccess(value);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [dialog, user]);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const editor = useRef<RichEditorHandle>(null);
  const lastInsert = useRef('');
  useEffect(() => {
    if (note?.id === id && params.insert && lastInsert.current !== params.insert.nonce) {
      lastInsert.current = params.insert.nonce;
      editor.current?.appendText(params.insert.text);
    }
  }, [id, note?.id, params.insert]);
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
      goBack();
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
      openTab('Notebook');
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
    const selected = selectedText.trim() || note.body;
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
      void api<AiAccess>('/ai/access')
        .then(setAiAccess)
        .catch(() => undefined);
    }
  }
  if (!note)
    return (
      <Screen safeTop>
        <IconButton name="arrow-back" label="Back" onPress={() => goBack()} />
        {error ? <Body>{error}</Body> : <ActivityIndicator color={colors.ink} />}
      </Screen>
    );
  function openCompanionBible() {
    void (async () => {
      if (timer.current) clearTimeout(timer.current);
      if (current.current) await enqueue(current.current);
      openBible(references[0] || { bookId: 19, chapter: 23 }, note!.id);
    })().catch(() => setError('Save this note before opening the Bible.'));
  }
  function showMenu() {
    Keyboard.dismiss();
    setDialog('menu');
  }
  const header = (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        paddingHorizontal: 12,
        paddingBottom: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconButton name="arrow-back" label="Save and go back" onPress={() => void finish()} />
        <Input
          accessibilityLabel="Note title"
          placeholder={sw ? 'Kichwa cha dokezo…' : 'Untitled note…'}
          value={note.title}
          onChangeText={(title) => update({ title })}
          maxLength={200}
          style={{
            flex: 1,
            minHeight: 48,
            fontFamily: fonts.serif,
            fontSize: 21,
            borderWidth: 0,
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          }}
        />
        <IconButton name="ellipsis-vertical" label="Note options" onPress={showMenu} />
      </View>
      <View style={{ flexDirection: 'row', paddingLeft: 54, alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 10 }}>
          {note.kind === 'sermon' ? (sw ? 'Mahubiri' : 'Sermon') : sw ? 'Tafakari' : 'Reflection'} ·{' '}
          {status}
        </Text>
      </View>
    </View>
  );
  return (
    <Screen scroll={false} safeTop safeBottom header={header}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={Platform.OS !== 'web'}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 12 }}>
          <RichEditor
            key={note.id}
            ref={editor}
            initialHtml={note.html}
            initialText={note.body}
            placeholder={
              sw ? 'Andika wazo, rejeo, au sala…' : 'Capture a thought, a verse, a prayer…'
            }
            onChange={(html, body) => update({ html, body })}
            onSelection={setSelectedText}
            onReference={(reference, intent) => {
              Keyboard.dismiss();
              setPassageActions(intent === 'actions');
              setPassage(reference);
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: colors.line,
            paddingHorizontal: 16,
            minHeight: 46,
          }}
        >
          <Text style={{ flex: 1, fontFamily: fonts.body, color: colors.muted, fontSize: 10 }}>
            {note.body.trim() ? note.body.trim().split(/\s+/).length : 0} {sw ? 'maneno' : 'words'}{' '}
            · {references.length} {sw ? 'marejeo' : 'references'}
          </Text>
          <IconButton
            name="book-outline"
            label="Open Bible beside this note"
            onPress={openCompanionBible}
          />
          <IconButton
            name="sparkles-outline"
            label="Reflection tools"
            onPress={() => {
              Keyboard.dismiss();
              setAiText('');
              setAiError('');
              setDialog('ai');
            }}
          />
        </View>
        {error ? <Text style={[styles.error, { paddingHorizontal: 20 }]}>{error}</Text> : null}
      </KeyboardAvoidingView>
      <Sheet
        visible={dialog !== null}
        title={
          dialog === 'menu'
            ? sw
              ? 'Chaguzi za dokezo'
              : 'Note options'
            : dialog === 'details'
              ? sw
                ? 'Maelezo ya dokezo'
                : 'Note details'
              : dialog === 'references'
                ? sw
                  ? 'Marejeo katika dokezo'
                  : 'References in this note'
                : dialog === 'delete'
                  ? sw
                    ? 'Futa dokezo hili?'
                    : 'Delete this note?'
                  : sw
                    ? 'Tafakari zaidi'
                    : 'A moment to reflect'
        }
        onClose={() => {
          if (dialog !== 'ai' || !busy) setDialog(null);
        }}
      >
        {dialog === 'menu' ? (
          <>
            <Label>{sw ? 'MPANGILIO WA MAANDISHI' : 'FORMAT YOUR WORDS'}</Label>
            <EditorToolbar
              onCommand={(command) => {
                setDialog(null);
                editor.current?.command(command);
              }}
            />
            <View style={{ gap: 2 }}>
              {[
                {
                  label: sw ? 'Maelezo ya dokezo' : 'Note details',
                  icon: 'options-outline',
                  run: () => setDialog('details'),
                },
                {
                  label: `${sw ? 'Marejeo katika dokezo' : 'References in this note'} (${references.length})`,
                  icon: 'book-outline',
                  run: () => setDialog('references'),
                },
                {
                  label: sw ? 'Shiriki dokezo' : 'Export note',
                  icon: 'share-outline',
                  run: () => {
                    setDialog(null);
                    void Share.share({
                      title: note.title || 'Beacon of Hope note',
                      message: `${note.title}\n${[note.preacher, note.church, note.sermonDate].filter(Boolean).join(' · ')}\n\n${note.body}`,
                    }).catch(() => setError('Your note could not be shared.'));
                  },
                },
                {
                  label: sw ? 'Futa dokezo' : 'Delete note',
                  icon: 'trash-outline',
                  run: () => setDialog('delete'),
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={item.run}
                  style={[styles.row, { paddingVertical: 12 }]}
                >
                  <Icon name={item.icon as import('../components/ui').IconName} size={19} />
                  <Text style={[styles.body, { flex: 1 }]}>{item.label}</Text>
                  <Icon name="chevron-forward" size={14} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        {dialog === 'details' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['reflection', 'sermon'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  onPress={() => update({ kind: value })}
                  style={[styles.chip, note.kind === value && { backgroundColor: colors.ink }]}
                >
                  <Text style={[styles.chipText, note.kind === value && { color: '#fff' }]}>
                    {value === 'sermon'
                      ? sw
                        ? 'Mahubiri'
                        : 'Sermon'
                      : sw
                        ? 'Tafakari'
                        : 'Reflection'}
                  </Text>
                </Pressable>
              ))}
            </View>
            {note.kind === 'sermon' ? (
              <>
                <Input
                  accessibilityLabel="Preacher"
                  placeholder={sw ? 'Mhubiri' : 'Preacher / speaker'}
                  value={note.preacher}
                  onChangeText={(preacher) => update({ preacher })}
                  maxLength={150}
                />
                <Input
                  accessibilityLabel="Church"
                  placeholder={sw ? 'Kanisa' : 'Church'}
                  value={note.church}
                  onChangeText={(church) => update({ church })}
                  maxLength={200}
                />
                <Input
                  accessibilityLabel="Sermon date"
                  value={note.sermonDate}
                  onChangeText={(sermonDate) => update({ sermonDate })}
                  maxLength={30}
                />
              </>
            ) : (
              <Body muted>
                {sw ? 'Weka mawazo yako kwa uhuru.' : 'A space for your personal reflections.'}
              </Body>
            )}
          </>
        ) : null}
        {dialog === 'references' ? (
          <>
            {references.length ? (
              references.map((reference) => (
                <Pressable
                  key={reference.key}
                  accessibilityRole="button"
                  onPress={() => {
                    setDialog(null);
                    setPassageActions(false);
                    setPassage(reference);
                  }}
                  style={{ paddingVertical: 12 }}
                >
                  <Body>{formatReference(reference, language)}</Body>
                </Pressable>
              ))
            ) : (
              <Body muted>
                {sw
                  ? 'Andika rejeo kama Yohana 3:16.'
                  : 'Type a reference such as John 3:16. It becomes a blue link as you write.'}
              </Body>
            )}
          </>
        ) : null}
        {dialog === 'delete' ? (
          <>
            <Body>
              This removes the note from this device. Export a copy first if you want to keep it.
            </Body>
            <Button onPress={() => void remove()} icon="trash-outline">
              Delete note
            </Button>
            <Button secondary onPress={() => setDialog(null)}>
              Keep my note
            </Button>
          </>
        ) : null}
        {dialog === 'ai' ? (
          <>
            <Body>
              {selectedText.trim() ? 'Your selected words' : 'This note’s words'} will be sent to
              DeepSeek when you choose an action below. Suggestions are shown for you to review
              before adding them to your note.
            </Body>
            {user && aiAccess ? (
              <Body muted>
                {aiAccess.active
                  ? sw
                    ? 'Mpango wa AI unapatikana'
                    : 'AI access active'
                  : `${aiAccess.freeRemaining} ${sw ? 'kati ya matumizi 5 bure yamebaki' : 'of 5 free uses remaining'}`}
              </Body>
            ) : null}
            {!user ? (
              <>
                <Body>
                  Sign in when you want optional study help. Your notebook remains available without
                  an account.
                </Body>
                <Button
                  onPress={() => {
                    setDialog(null);
                    navigate('Account');
                  }}
                >
                  Sign in to continue
                </Button>
              </>
            ) : aiText ? (
              <>
                <Text selectable style={styles.body}>
                  {aiText}
                </Text>
                <Button
                  icon="add"
                  onPress={() => {
                    editor.current?.appendText(`Study suggestions (AI-assisted)\n${aiText}`);
                    setDialog(null);
                  }}
                >
                  Add to my note
                </Button>
              </>
            ) : aiAccess && !aiAccess.active && aiAccess.freeRemaining === 0 ? (
              <>
                <Body>
                  {sw
                    ? 'Matumizi yako 5 bure yamekamilika. Mpango wa AI ni KES 150/mwezi.'
                    : 'Your 5 free uses are complete. Continue with the AI plan at KES 150/month.'}
                </Body>
                <Button
                  onPress={() => {
                    setDialog(null);
                    navigate('AiPlan');
                  }}
                >
                  {sw ? 'Angalia mpango wa AI' : 'View AI plan'}
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
                  Summarize my words
                </Button>
                <Button secondary disabled={busy} onPress={() => void assist('questions')}>
                  Suggest reflection questions
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
                    navigate('Account');
                  }}
                >
                  Open account
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>

      <ScriptureSheet
        reference={passage}
        showActionsOnOpen={passageActions}
        onClose={() => setPassage(null)}
        onInsert={(text) => editor.current?.appendText(text)}
        sourceNoteId={note.id}
        onOpenBible={async (reference) => {
          if (timer.current) clearTimeout(timer.current);
          if (current.current) await enqueue(current.current);
          openBible(reference, note.id);
        }}
      />
    </Screen>
  );
}
