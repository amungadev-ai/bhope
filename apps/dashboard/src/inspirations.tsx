import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, PlayCircle, Plus, Send } from 'lucide-react';
import { getTikTokPlayerUrl, getTikTokVideoId, type Inspiration } from '@bhope/shared';
import { api } from './api';
const blank = (): Inspiration => ({
  id: crypto.randomUUID(),
  title: '',
  titleSw: '',
  description: '',
  descriptionSw: '',
  category: 'HOPE',
  url: '',
  status: 'draft',
  publishAt: null,
});
export function InspirationStudio({ role }: { role: string }) {
  const [items, setItems] = useState<Inspiration[]>([]);
  const [editing, setEditing] = useState<Inspiration | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const refresh = () => api<Inspiration[]>('/studio/inspirations').then(setItems);
  useEffect(() => {
    void refresh().catch((failure) => setError(failure.message));
  }, []);
  async function save(status: Inspiration['status']) {
    if (!editing) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api<Inspiration>(`/studio/inspirations/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editing,
          status,
          publishAt:
            status === 'published'
              ? editing.publishAt || new Date().toISOString()
              : editing.publishAt,
        }),
      });
      setEditing(result);
      await refresh();
      setNotice(
        status === 'published'
          ? 'Video publication saved.'
          : status === 'review'
            ? 'Video submitted for review.'
            : 'Video draft saved.',
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This video could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  const change = (field: keyof Inspiration, value: string | null) => {
    setNotice('');
    setPreview(false);
    setEditing((old) => (old ? { ...old, [field]: value } : old));
  };
  return (
    <>
      {editing ? (
        <button
          className="text-button back"
          onClick={() => {
            setEditing(null);
            setNotice('');
            setError('');
          }}
        >
          <ArrowLeft size={15} />
          Back to Inspirations
        </button>
      ) : null}
      <div className="page-heading">
        <div>
          <span className="eyebrow">CURATED ENCOURAGEMENT</span>
          <h1>{editing ? 'A moment worth sharing.' : 'Your Inspirations library.'}</h1>
          <p>
            Choose individual TikTok videos. Editors curate; administrators approve publication.
          </p>
        </div>
        {!editing ? (
          <button
            className="primary"
            onClick={() => {
              setEditing(blank());
              setError('');
              setNotice('');
            }}
          >
            <Plus size={17} />
            Add a video
          </button>
        ) : (
          <span className={`status ${editing.status}`}>{editing.status}</span>
        )}
      </div>
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="notice">
          <Check size={16} />
          {notice}
        </div>
      ) : null}
      {editing ? (
        <div className="writing-grid">
          <section className="panel editor">
            <label>
              TikTok video URL
              <input
                type="url"
                value={editing.url}
                onChange={(event) => change('url', event.target.value)}
                placeholder="https://www.tiktok.com/@yourministry/video/..."
              />
            </label>
            <small>
              {getTikTokVideoId(editing.url)
                ? `Video ID: ${getTikTokVideoId(editing.url)}`
                : 'Use the full public video link. Profile links and shortened links are not featured videos.'}
            </small>
            <label>
              English title
              <input
                maxLength={180}
                value={editing.title}
                onChange={(event) => change('title', event.target.value)}
              />
            </label>
            <label>
              Swahili title
              <input
                maxLength={180}
                value={editing.titleSw}
                onChange={(event) => change('titleSw', event.target.value)}
              />
            </label>
            <label>
              English introduction
              <textarea
                maxLength={2000}
                rows={4}
                value={editing.description}
                onChange={(event) => change('description', event.target.value)}
              />
            </label>
            <label>
              Swahili introduction
              <textarea
                maxLength={2000}
                rows={4}
                value={editing.descriptionSw}
                onChange={(event) => change('descriptionSw', event.target.value)}
              />
            </label>
            <label>
              Theme
              <select
                value={editing.category}
                onChange={(event) => change('category', event.target.value)}
              >
                {['HOPE', 'FAITH', 'PEACE', 'PRAYER', 'COMMUNITY'].map((theme) => (
                  <option key={theme}>{theme}</option>
                ))}
              </select>
            </label>
            {role === 'admin' ? (
              <label>
                Publish date and time
                <input
                  type="datetime-local"
                  value={
                    editing.publishAt
                      ? new Date(
                          new Date(editing.publishAt).getTime() -
                            new Date(editing.publishAt).getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(event) =>
                    change(
                      'publishAt',
                      event.target.value ? new Date(event.target.value).toISOString() : null,
                    )
                  }
                />
              </label>
            ) : null}
            <div className="editor-actions">
              <button className="secondary" disabled={busy} onClick={() => void save('draft')}>
                Save video draft
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void save(role === 'admin' ? 'published' : 'review')}
              >
                {role === 'admin' ? 'Publish / schedule video' : 'Submit video for review'}
                <Send size={15} />
              </button>
            </div>
          </section>
          <aside className="preview-column">
            <span className="eyebrow">FEATURED VIDEO PREVIEW</span>
            <div className="reader-preview">
              <span className="eyebrow">{editing.category}</span>
              <h2>{editing.title || 'Your video title'}</h2>
              <p className="subtitle">{editing.description}</p>
              {getTikTokPlayerUrl(editing.url) && preview ? (
                <iframe
                  title="Curated video preview"
                  src={getTikTokPlayerUrl(editing.url)!}
                  allow="fullscreen; encrypted-media"
                  allowFullScreen
                  style={{ width: '100%', height: 460, border: 0, marginTop: 20, borderRadius: 12 }}
                />
              ) : (
                <button
                  className="secondary"
                  style={{ width: '100%', marginTop: 22, minHeight: 150 }}
                  disabled={!getTikTokVideoId(editing.url)}
                  onClick={() => setPreview(true)}
                >
                  <PlayCircle size={30} />
                  Preview on TikTok
                </button>
              )}
              <h3 style={{ marginTop: 24 }}>{editing.titleSw}</h3>
              <p className="subtitle">{editing.descriptionSw}</p>
            </div>
            <small>
              Previewing loads TikTok. Confirm the video is appropriate and public before
              publishing. A removed or private video may stop playing.
            </small>
          </aside>
        </div>
      ) : (
        <section className="panel">
          {items.length ? (
            items.map((item) => (
              <button
                className="entry-row"
                key={item.id}
                onClick={() => {
                  setEditing(structuredClone(item));
                  setNotice('');
                  setPreview(false);
                }}
              >
                <div className="entry-icon">
                  <PlayCircle size={20} />
                </div>
                <div className="entry-title">
                  <strong>{item.title || 'Untitled video'}</strong>
                  <small>
                    {item.titleSw || 'Swahili title pending'} · {item.category}
                  </small>
                </div>
                <span className={`status ${item.status}`}>
                  {item.status === 'review' ? 'In review' : item.status}
                </span>
              </button>
            ))
          ) : (
            <div className="empty">
              <BookOpen size={28} />
              <h2 style={{ margin: '15px 0' }}>A thoughtful feed starts here.</h2>
              <p>Add your first video when the ministry’s links are ready.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
