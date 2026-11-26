import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Plus,
  Search,
  Send,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import {
  books,
  formatReference,
  type Devotional,
  type DevotionalText,
  type Language,
} from '@bhope/shared';
import './style.css';
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'editor' | 'admin';
}
interface Entry extends Devotional {
  status: 'draft' | 'review' | 'published';
  publishAt: string | null;
  updatedAt?: string;
}
interface Overview {
  counts: { status: string; total: number }[];
  users: number | null;
  aiEnabled: boolean;
  dailyAiLimit: number;
}
import { api } from './api';
import { InspirationStudio } from './inspirations';
import { GivingStudio } from './giving';
const emptyText = (): DevotionalText => ({
  title: '',
  subtitle: '',
  reflection: '',
  application: '',
  prayer: '',
  question: '',
});
const blankEntry = (): Entry => ({
  id: crypto.randomUUID(),
  category: 'HOPE',
  bookId: 19,
  chapter: 23,
  verseStart: 1,
  verseEnd: 3,
  minutes: 4,
  en: emptyText(),
  sw: emptyText(),
  status: 'draft',
  publishAt: null,
});
const readableDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not scheduled';
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'overview' | 'library' | 'users' | 'inspirations' | 'giving'>(
    'overview',
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  async function refresh() {
    const [items, stats] = await Promise.all([
      api<Entry[]>('/studio/devotionals'),
      api<Overview>('/studio/overview'),
    ]);
    setEntries(items);
    setOverview(stats);
  }
  useEffect(() => {
    api<User>('/auth/me')
      .then((account) => {
        if (account.role === 'user') throw new Error('Editor access is required.');
        setUser(account);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) void refresh().catch((failure) => setError(failure.message));
  }, [user]);
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.user.role === 'user') {
        await api('/auth/logout', { method: 'POST' });
        throw new Error('This account does not have editor or administrator access.');
      }
      setUser(result.user);
      setPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
      setUser(null);
      setEntries([]);
      setEditing(null);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign out.');
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Sun size={30} />
        Opening your workspace…
      </div>
    );
  if (!user)
    return (
      <main className="login">
        <section className="login-art">
          <div className="brand">
            <Sun size={29} />
            <span>
              beacon of hope<span className="gold">.</span>
            </span>
          </div>
          <div>
            <span className="eyebrow light">THE EDITORIAL STUDIO</span>
            <h1>
              Words that carry
              <br />a little light.
            </h1>
            <p>
              A quiet place to create thoughtful devotionals
              <br />
              and help hope find its way into someone’s day.
            </p>
          </div>
          <small>ROOTED IN SCRIPTURE. GROWING IN HOPE.</small>
          <div className="decorative-orbit" />
        </section>
        <section className="login-form">
          <Leaf className="login-leaf" size={32} />
          <span className="eyebrow">WELCOME TO THE STUDIO</span>
          <h2>Good to have you here.</h2>
          <p>Sign in with your editor or administrator account.</p>
          <form onSubmit={(event) => void signIn(event)}>
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@yourministry.org"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error && (
              <div role="alert" className="error">
                {error}
              </div>
            )}
            <button className="primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Enter your workspace'}
              <ArrowRight size={17} />
            </button>
          </form>
          <small>Accounts are created by your administrator.</small>
        </section>
      </main>
    );
  const count = (status: string) =>
    Number(overview?.counts.find((row) => row.status === status)?.total ?? 0);
  const filtered = entries.filter(
    (entry) =>
      (filter === 'all' || entry.status === filter) &&
      `${entry.en.title} ${entry.sw.title} ${entry.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <Sun size={25} />
          <span>
            beacon of hope<span className="gold">.</span>
          </span>
        </div>
        <span className="studio-label">EDITORIAL STUDIO</span>
        <nav>
          <button
            className={tab === 'overview' && !editing ? 'active' : ''}
            onClick={() => {
              setTab('overview');
              setEditing(null);
            }}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button
            className={tab === 'library' || editing ? 'active' : ''}
            onClick={() => {
              setTab('library');
              setEditing(null);
            }}
          >
            <BookOpen size={18} />
            Devotionals
          </button>
          <button
            className={tab === 'inspirations' ? 'active' : ''}
            onClick={() => {
              setTab('inspirations');
              setEditing(null);
            }}
          >
            <BookOpen size={18} />
            Inspirations
          </button>
          {user.role === 'admin' ? (
            <button
              className={tab === 'giving' ? 'active' : ''}
              onClick={() => {
                setTab('giving');
                setEditing(null);
              }}
            >
              <Users size={18} />
              Giving & reports
            </button>
          ) : null}
          {user.role === 'admin' && (
            <button
              className={tab === 'users' ? 'active' : ''}
              onClick={() => {
                setTab('users');
                setEditing(null);
              }}
            >
              <Users size={18} />
              People
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <Leaf size={19} />
            <p>
              A few thoughtful words
              <br />
              can change someone’s day.
            </p>
          </div>
          <div className="identity">
            <div className="avatar">{user.name[0]}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrator' : 'Editor'}</small>
            </div>
            <button aria-label="Sign out" onClick={() => void signOut()}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header>
          <div>
            <span className="eyebrow">YOUR MINISTRY, WITH CARE</span>
            <span className="breadcrumb">
              Studio <ChevronRight size={12} />{' '}
              {editing
                ? 'Writing room'
                : tab === 'library'
                  ? 'Devotionals'
                  : tab === 'users'
                    ? 'People'
                    : 'Overview'}
            </span>
          </div>
          <span className="date">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </header>
        <main className="main-content">
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError('')}>Dismiss</button>
            </div>
          )}
          {editing ? (
            <WritingRoom
              entry={editing}
              user={user}
              onClose={() => setEditing(null)}
              onSaved={async (entry) => {
                setEditing(entry);
                await refresh();
              }}
            />
          ) : tab === 'overview' ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    WELCOME BACK, {user.name.split(' ')[0].toUpperCase()}
                  </span>
                  <h1>A little hope, ready to share.</h1>
                  <p>Create with intention. Review with care. Publish a little light.</p>
                </div>
                <button className="primary" onClick={() => setEditing(blankEntry())}>
                  <Plus size={17} />
                  New devotional
                </button>
              </div>
              <div className="stats">
                <Stat
                  label="PUBLISHED REFLECTIONS"
                  value={count('published')}
                  icon={<BookOpen size={20} />}
                />
                <Stat label="AWAITING REVIEW" value={count('review')} icon={<Clock3 size={20} />} />
                <Stat
                  label="THOUGHTS IN PROGRESS"
                  value={count('draft')}
                  icon={<FileText size={20} />}
                />
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>From your writing room</h2>
                    <button className="text-button" onClick={() => setTab('library')}>
                      View all
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  {entries.slice(0, 5).map((entry) => (
                    <button
                      className="entry-row"
                      key={entry.id}
                      onClick={() => setEditing(structuredClone(entry))}
                    >
                      <div className="entry-icon">
                        <BookOpen size={18} />
                      </div>
                      <div className="entry-title">
                        <strong>{entry.en.title || 'Untitled devotional'}</strong>
                        <small>
                          {formatReference(entry)} · {entry.category}
                        </small>
                      </div>
                      <Status status={entry.status} />
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </section>
                <section className="green-panel">
                  <Leaf size={28} />
                  <span className="eyebrow light">A THOUGHT FOR THE WORK</span>
                  <h2>
                    Begin with the person
                    <br />
                    who will read it.
                  </h2>
                  <p>
                    One passage. One honest reflection. One small step they can carry into the day.
                  </p>
                  <button onClick={() => setEditing(blankEntry())}>
                    Make room for a new reflection
                    <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="service-grid">
                <section className="panel service">
                  <Sparkles size={21} />
                  <div>
                    <h3>AI writing assistance</h3>
                    <p>
                      {overview?.aiEnabled
                        ? `Connected · ${overview.dailyAiLimit} requests per account each day`
                        : 'Not connected yet · writing and publishing remain available'}
                    </p>
                  </div>
                </section>
                <section className="panel service">
                  <Users size={21} />
                  <div>
                    <h3>
                      {overview?.users === null
                        ? 'A shared editorial space'
                        : `${overview?.users ?? 0} people in your community`}
                    </h3>
                    <p>Private notebooks stay outside the editorial studio.</p>
                  </div>
                </section>
              </div>
            </>
          ) : tab === 'inspirations' ? (
            <InspirationStudio role={user.role} />
          ) : tab === 'giving' ? (
            <GivingStudio />
          ) : tab === 'users' ? (
            <People currentUser={user} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">WORDS WITH A PURPOSE</span>
                  <h1>Your devotional library.</h1>
                  <p>English and Swahili. One message of hope.</p>
                </div>
                <button className="primary" onClick={() => setEditing(blankEntry())}>
                  <Plus size={17} />
                  New devotional
                </button>
              </div>
              <div className="library-tools">
                <div className="filters">
                  {['all', 'draft', 'review', 'published'].map((value) => (
                    <button
                      className={filter === value ? 'selected' : ''}
                      key={value}
                      onClick={() => setFilter(value)}
                    >
                      {value === 'all'
                        ? 'All reflections'
                        : value === 'review'
                          ? 'In review'
                          : value[0].toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search devotionals"
                    placeholder="Search reflections"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
              </div>
              <section className="panel">
                <div className="table-heading">
                  <span>REFLECTION</span>
                  <span>STATUS</span>
                  <span>PUBLISH DATE</span>
                </div>
                {filtered.map((entry) => (
                  <button
                    className="entry-row library-row"
                    key={entry.id}
                    onClick={() => setEditing(structuredClone(entry))}
                  >
                    <div className="entry-title">
                      <strong>{entry.en.title || 'Untitled devotional'}</strong>
                      <small>
                        {entry.sw.title || 'Swahili title pending'} · {formatReference(entry)}
                      </small>
                    </div>
                    <Status status={entry.status} />
                    <small>{readableDate(entry.publishAt)}</small>
                    <ChevronRight size={15} />
                  </button>
                ))}
                {!filtered.length && (
                  <p className="empty">No reflections here yet. Begin with a new devotional.</p>
                )}
              </section>
            </>
          )}
        </main>
        <footer>
          BEACON OF HOPE <span>Thoughtfully made. Freely shared.</span>
        </footer>
      </div>
    </div>
  );
}
function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <section className="stat">
      <div>
        <span className="eyebrow">{label}</span>
        <strong>{value.toString().padStart(2, '0')}</strong>
      </div>
      <div className="stat-icon">{icon}</div>
    </section>
  );
}
function Status({ status }: { status: string }) {
  return (
    <span className={`status ${status}`}>
      <i />
      {status === 'review' ? 'In review' : status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}
function WritingRoom({
  entry,
  user,
  onClose,
  onSaved,
}: {
  entry: Entry;
  user: User;
  onClose: () => void;
  onSaved: (entry: Entry) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Entry>(structuredClone(entry));
  const [language, setLanguage] = useState<Language>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [outline, setOutline] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const text = draft[language];
  const updateText = (field: keyof DevotionalText, value: string) => {
    setNotice('');
    setDraft((old) => ({ ...old, [language]: { ...old[language], [field]: value } }));
  };
  const localDate = draft.publishAt
    ? new Date(
        new Date(draft.publishAt).getTime() - new Date(draft.publishAt).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : '';
  async function save(status: Entry['status']) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { status: _status, publishAt: _publishAt, updatedAt: _updated, ...devotional } = draft;
      const result = await api<Entry>(`/studio/devotionals/${draft.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          devotional,
          status,
          publishAt:
            status === 'published' ? draft.publishAt || new Date().toISOString() : draft.publishAt,
        }),
      });
      setDraft(result);
      await onSaved(result);
      setNotice(
        status === 'review'
          ? 'Submitted for review.'
          : status === 'published'
            ? 'Publication saved.'
            : 'Draft saved.',
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  async function assist() {
    if (
      !confirm(
        'Send this title and reflection to DeepSeek for an outline? Your existing writing will be kept.',
      )
    )
      return;
    setAiBusy(true);
    setError('');
    try {
      const result = await api<{ text: string }>('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({
          action: 'outline',
          text: `${text.title}\n${text.subtitle}\n${text.reflection}`,
          language,
          consent: true,
        }),
      });
      setOutline(result.text);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'AI is unavailable.');
    } finally {
      setAiBusy(false);
    }
  }
  return (
    <>
      <button className="text-button back" onClick={onClose}>
        <ArrowLeft size={15} />
        Back to your library
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE WRITING ROOM</span>
          <h1>{text.title || 'A new seed of hope.'}</h1>
          <p>Thoughtful words, in two languages.</p>
        </div>
        <Status status={draft.status} />
      </div>
      <div className="writing-grid">
        <section className="panel editor">
          <div className="editor-top">
            <div className="filters">
              {(['en', 'sw'] as const).map((value) => (
                <button
                  key={value}
                  className={language === value ? 'selected' : ''}
                  onClick={() => setLanguage(value)}
                >
                  {value === 'en' ? 'English' : 'Kiswahili'}
                </button>
              ))}
            </div>
            <button className="text-button" disabled={aiBusy} onClick={() => void assist()}>
              <Sparkles size={15} />
              {aiBusy ? 'Thinking…' : 'Draft with AI'}
            </button>
          </div>
          <label>
            Title
            <input
              maxLength={180}
              value={text.title}
              onChange={(event) => updateText('title', event.target.value)}
              placeholder="Where does this reflection begin?"
            />
          </label>
          <label>
            A short invitation
            <input
              maxLength={500}
              value={text.subtitle}
              onChange={(event) => updateText('subtitle', event.target.value)}
            />
          </label>
          <div className="field-row">
            <label>
              Book
              <select
                value={draft.bookId}
                onChange={(event) =>
                  setDraft({ ...draft, bookId: Number(event.target.value), chapter: 1 })
                }
              >
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book[language]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Chapter
              <input
                type="number"
                min="1"
                max={books[draft.bookId - 1].chapters}
                value={draft.chapter}
                onChange={(event) => setDraft({ ...draft, chapter: Number(event.target.value) })}
              />
            </label>
            <label>
              From
              <input
                type="number"
                min="1"
                max="200"
                value={draft.verseStart}
                onChange={(event) => setDraft({ ...draft, verseStart: Number(event.target.value) })}
              />
            </label>
            <label>
              To
              <input
                type="number"
                min="1"
                max="200"
                value={draft.verseEnd}
                onChange={(event) => setDraft({ ...draft, verseEnd: Number(event.target.value) })}
              />
            </label>
          </div>
          {(
            [
              ['reflection', 'Reflection'],
              ['application', 'Live it out'],
              ['prayer', 'Prayer'],
              ['question', 'Reflection question'],
            ] as [keyof DevotionalText, string][]
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <textarea
                rows={field === 'reflection' ? 10 : 3}
                maxLength={field === 'reflection' ? 20000 : field === 'question' ? 1000 : 5000}
                value={text[field]}
                onChange={(event) => updateText(field, event.target.value)}
              />
            </label>
          ))}
          <div className="field-row">
            <label>
              Theme
              <select
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {['HOPE', 'PEACE', 'FAITH', 'LOVE', 'PRAYER'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Reading minutes
              <input
                type="number"
                min="1"
                max="60"
                value={draft.minutes}
                onChange={(event) => setDraft({ ...draft, minutes: Number(event.target.value) })}
              />
            </label>
          </div>
          {user.role === 'admin' && (
            <label>
              Publish date and time <small>(your local time)</small>
              <input
                type="datetime-local"
                value={localDate}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    publishAt: event.target.value
                      ? new Date(event.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice">
              <Check size={16} />
              {notice}
            </div>
          )}
          <div className="editor-actions">
            <button disabled={busy} className="secondary" onClick={() => void save('draft')}>
              Save draft
            </button>
            <button
              disabled={busy}
              className="primary"
              onClick={() => void save(user.role === 'admin' ? 'published' : 'review')}
            >
              {busy
                ? 'Saving…'
                : user.role === 'admin'
                  ? 'Publish / schedule'
                  : 'Submit for review'}
              <Send size={15} />
            </button>
          </div>
        </section>
        <aside className="preview-column">
          <span className="eyebrow">READER PREVIEW · {language.toUpperCase()}</span>
          <div className="reader-preview">
            <span className="eyebrow">
              {draft.category} · {draft.minutes} MIN READ
            </span>
            <h2>{text.title || 'Your title will appear here'}</h2>
            <p className="subtitle">{text.subtitle}</p>
            <div className="passage-label">
              <BookOpen size={15} />
              {formatReference(draft, language)}
            </div>
            <p className="reflection">{text.reflection || 'A quiet space for your reflection…'}</p>
            {text.application && (
              <section>
                <span className="eyebrow">LIVE IT OUT</span>
                <p>{text.application}</p>
              </section>
            )}
            {text.prayer && (
              <section>
                <span className="eyebrow">A MOMENT OF PRAYER</span>
                <p className="prayer">{text.prayer}</p>
              </section>
            )}
            {text.question && (
              <section className="question">
                <span className="eyebrow">TAKE IT TO HEART</span>
                <h3>{text.question}</h3>
              </section>
            )}
          </div>
          {outline && (
            <section className="panel ai-outline">
              <span className="eyebrow">AI SUGGESTION · REVIEW BEFORE USING</span>
              <p>{outline}</p>
              <button
                className="secondary"
                onClick={() => {
                  updateText('reflection', `${text.reflection}\n\n${outline}`.trim());
                  setOutline('');
                }}
              >
                <Plus size={15} />
                Add to reflection
              </button>
            </section>
          )}
          <small>
            Review both languages before publishing. The API makes scheduled content visible at its
            publication time.
          </small>
        </aside>
      </div>
    </>
  );
}
function People({ currentUser }: { currentUser: User }) {
  const [people, setPeople] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    api<User[]>('/studio/users')
      .then(setPeople)
      .catch((failure) => setError(failure.message));
  }, []);
  async function changeRole(person: User, role: User['role']) {
    setBusy(person.id);
    setError('');
    try {
      await api(`/studio/users/${person.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setPeople((old) => old.map((item) => (item.id === person.id ? { ...item, role } : item)));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update this role.');
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PEOPLE & PERMISSIONS</span>
          <h1>A community of hope.</h1>
          <p>Give editors room to write, and administrators responsibility to publish.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        {people.map((person) => (
          <div className="entry-row" key={person.id}>
            <div className="avatar">{person.name[0]}</div>
            <div className="entry-title">
              <strong>{person.name}</strong>
              <small>{person.email}</small>
            </div>
            <select
              aria-label={`Role for ${person.name}`}
              disabled={person.id === currentUser.id || busy === person.id}
              value={person.role}
              onChange={(event) => void changeRole(person, event.target.value as User['role'])}
            >
              <option value="user">Reader</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        ))}
      </section>
      <p className="muted">Private notebook content is not available in this dashboard.</p>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
