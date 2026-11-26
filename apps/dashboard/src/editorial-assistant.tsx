import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { api } from './api';

export function EditorialAssistant({
  kind,
  language = 'en',
  reference = '',
  current,
  onApply,
}: {
  kind: 'devotional' | 'inspiration';
  language?: 'en' | 'sw';
  reference?: string;
  current: Record<string, string>;
  onApply: (fields: Record<string, string>) => void;
}) {
  const [mode, setMode] = useState<'draft' | 'refine'>('draft');
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [previous, setPrevious] = useState<Record<string, string> | null>(null);
  const hasWriting = Object.values(current).some((value) => value.trim().length >= 10);
  async function generate() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await api<{ fields: Record<string, string> }>('/studio/ai/draft', {
        method: 'POST',
        body: JSON.stringify({
          kind,
          mode,
          brief,
          reference,
          language,
          current: hasWriting ? JSON.stringify(current) : '',
          consent: true,
        }),
      });
      setResult(response.fields);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The assistant could not finish.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="editorial-assistant">
      <summary>
        <Sparkles size={17} />
        Writing assistant<span>Optional</span>
      </summary>
      <div className="assistant-body">
        <div className="filters" aria-label="Writing task">
          <button
            type="button"
            className={mode === 'draft' ? 'selected' : ''}
            onClick={() => setMode('draft')}
          >
            Draft from a brief
          </button>
          <button
            type="button"
            className={mode === 'refine' ? 'selected' : ''}
            onClick={() => setMode('refine')}
          >
            Refine my writing
          </button>
        </div>
        <label>
          {mode === 'draft'
            ? 'What message would you like to share?'
            : 'What would you like to improve? (optional)'}
          <textarea
            rows={3}
            maxLength={3000}
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder={
              kind === 'devotional'
                ? 'For example: finding peace during uncertainty, rooted in Philippians 4:6–7.'
                : 'Describe the video’s actual message and the encouragement you want readers to take away.'
            }
          />
        </label>
        <p className="assistant-note">
          Your brief{mode === 'refine' ? ' and current writing' : ''} will be sent to DeepSeek in{' '}
          {language === 'sw' ? 'Swahili' : 'English'}. Review the suggestion before applying it.
          Saving and publishing remain in your hands.
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <button
          type="button"
          className="secondary"
          disabled={busy || (mode === 'draft' ? brief.trim().length < 10 : !hasWriting)}
          onClick={() => void generate()}
        >
          <Sparkles size={16} />
          {busy
            ? 'Preparing a suggestion…'
            : mode === 'draft'
              ? 'Generate draft'
              : 'Suggest improvements'}
        </button>
        {result && (
          <section className="assistant-result" aria-label="Suggested writing">
            <span className="eyebrow">SUGGESTION · REVIEW BEFORE APPLYING</span>
            {Object.entries(result).map(([key, value]) => (
              <div key={key}>
                <h3>
                  {key === 'application'
                    ? 'Live it out'
                    : key.charAt(0).toUpperCase() + key.slice(1)}
                </h3>
                <p>{value}</p>
              </div>
            ))}
            <div className="action-row">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setPrevious({ ...current });
                  onApply(result);
                  setResult(null);
                }}
              >
                <Check size={16} />
                Use this suggestion
              </button>
              <button type="button" className="secondary" onClick={() => setResult(null)}>
                <X size={16} />
                Discard
              </button>
            </div>
          </section>
        )}
        {previous && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onApply(previous);
              setPrevious(null);
            }}
          >
            Restore writing from before the last suggestion
          </button>
        )}
      </div>
    </details>
  );
}
