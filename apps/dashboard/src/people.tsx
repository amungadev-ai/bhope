import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Search, Users, X } from 'lucide-react';
import { api } from './api';
interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'editor' | 'admin';
}
export function PeopleStudio({ currentUser }: { currentUser: User }) {
  const [people, setPeople] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    void api<User[]>('/studio/users')
      .then(setPeople)
      .catch((failure) => setError(failure.message));
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy('create');
    setError('');
    setNotice('');
    try {
      const person = await api<User>('/studio/editors', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      setPeople((old) => [person, ...old]);
      setCreating(false);
      setName('');
      setEmail('');
      setPassword('');
      setVisible(false);
      setNotice(
        `${person.name} has been added as an editor. Share their sign-in details privately.`,
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not add this editor.');
    } finally {
      setBusy('');
    }
  }
  async function changeRole(person: User, role: User['role']) {
    setBusy(person.id);
    setError('');
    setNotice('');
    try {
      await api(`/studio/users/${person.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setPeople((old) => old.map((item) => (item.id === person.id ? { ...item, role } : item)));
      setNotice(`Role updated for ${person.name}.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not update this role.');
    } finally {
      setBusy('');
    }
  }
  const filtered = people.filter((person) =>
    `${person.name} ${person.email}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PEOPLE & PERMISSIONS</span>
          <h1>Your people. Your team.</h1>
          <p>
            Add editors to help create devotionals and inspirations. Administrators approve
            publication.
          </p>
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          <Plus size={17} />
          Add editor
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {creating && (
        <form className="panel editor team-form" onSubmit={(event) => void create(event)}>
          <div className="section-heading">
            <div>
              <h2>A new voice on your team.</h2>
              <p>The editor can sign in as soon as you create their account.</p>
            </div>
            <button
              type="button"
              aria-label="Close editor form"
              className="icon-control"
              onClick={() => {
                setCreating(false);
                setPassword('');
              }}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid">
            <label>
              Full name
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>
          <label>
            Initial password
            <div className="password-field">
              <input
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((old) => !old)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small>
              Use at least 10 characters and share the password with this editor privately.
            </small>
          </label>
          <div className="action-row">
            <button className="primary" disabled={busy === 'create'}>
              {busy === 'create' ? 'Adding editor…' : 'Create editor account'}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setCreating(false);
                setPassword('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <section className="panel people-panel">
        <div className="section-heading">
          <h2>
            <Users size={19} />
            Community & team
          </h2>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Find a person"
              placeholder="Name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        {filtered.map((person) => (
          <div className="entry-row person-row" key={person.id}>
            <div className="avatar">{person.name[0]}</div>
            <div className="entry-title">
              <strong>
                {person.name}
                {person.id === currentUser.id ? ' · You' : ''}
              </strong>
              <small>{person.email}</small>
            </div>
            <select
              aria-label={`Role for ${person.name}`}
              disabled={person.id === currentUser.id || Boolean(busy)}
              value={person.role}
              onChange={(event) => void changeRole(person, event.target.value as User['role'])}
            >
              <option value="user">Reader</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        ))}
        {!filtered.length && (
          <p className="empty">
            {query ? 'No matching accounts.' : 'Your community accounts will appear here.'}
          </p>
        )}
      </section>
      <p className="muted">
        Existing readers can join your team by changing their role to Editor. Private notebook
        content stays with its owner.
      </p>
    </>
  );
}
