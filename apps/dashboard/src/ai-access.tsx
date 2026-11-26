import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, Clock3, Search, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { api } from './api';
interface AccountAccess {
  id: string;
  name: string;
  email: string;
  role: string;
  freeUsed: number;
  paidUntil: string | null;
}
interface AccessReport {
  items: AccountAccess[];
  freeUses: number;
  monthlyPrice: number;
  dailyLimit: number;
  billingAvailable: boolean;
}
const isStaff = (item: AccountAccess) => ['admin', 'editor'].includes(item.role);
const isPaid = (item: AccountAccess) =>
  Boolean(item.paidUntil && Date.parse(item.paidUntil) > Date.now());
const localDate = (value: string) =>
  new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
function AccessAdjustment({
  account,
  onClose,
  onSaved,
}: {
  account: AccountAccess;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');
  const [expiry, setExpiry] = useState(
    localDate(
      isPaid(account) ? account.paidUntil! : new Date(Date.now() + 30 * 86400000).toISOString(),
    ),
  );
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/studio/ai-access/${account.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paidUntil: action === 'grant' ? new Date(expiry).toISOString() : null,
          reason: reason.trim(),
        }),
      });
      await onSaved();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save this adjustment.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="access-dialog"
      aria-labelledby="adjustment-title"
      onCancel={onClose}
    >
      <form className="editor" onSubmit={(event) => void save(event)}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">SUPPORT ADJUSTMENT</span>
            <h2 id="adjustment-title">Manage AI access</h2>
            <p>
              {account.name} · {account.email}
            </p>
          </div>
          <button
            type="button"
            className="icon-control"
            aria-label="Close access adjustment"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <label>
          Adjustment
          <select
            value={action}
            onChange={(event) => setAction(event.target.value as 'grant' | 'revoke')}
          >
            <option value="grant">Grant / extend access</option>
            <option value="revoke">Revoke paid access</option>
          </select>
        </label>
        {action === 'grant' && (
          <label>
            Access ends
            <input
              type="datetime-local"
              required
              value={expiry}
              min={localDate(new Date().toISOString())}
              onChange={(event) => setExpiry(event.target.value)}
            />
          </label>
        )}
        <label>
          Reason or support reference
          <textarea
            required
            minLength={10}
            maxLength={500}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Record why you are making this adjustment."
          />
        </label>
        <div className="subtle-note">
          <ShieldCheck size={18} />
          <p>
            This records an access adjustment. It does not charge the reader, record a donation, or
            reset their free uses.
            {isStaff(account) ? ' Staff access remains included with their role.' : ''}
          </p>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="action-row">
          <button className="primary" disabled={busy || reason.trim().length < 10}>
            {busy ? 'Saving…' : action === 'grant' ? 'Save access' : 'Revoke paid access'}
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
export function AiAccessStudio() {
  const [report, setReport] = useState<AccessReport | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<AccountAccess | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = () => api<AccessReport>('/studio/ai-access').then(setReport);
  useEffect(() => {
    void refresh().catch((failure) => setError(failure.message));
  }, []);
  const items =
    report?.items.filter(
      (item) =>
        `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'staff'
            ? isStaff(item)
            : filter === 'paid'
              ? !isStaff(item) && isPaid(item)
              : !isStaff(item) && !isPaid(item))),
    ) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REFLECTION, WITH A LITTLE SUPPORT</span>
          <h1>AI access & plans.</h1>
          <p>A clear view of reader allowances, continued access, and your editorial team.</p>
        </div>
        <span className="status plan-status">
          <span className="status-dot" />
          {report?.billingAvailable ? 'Checkout available' : 'Checkout not yet enabled'}
        </span>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            onClick={() =>
              void refresh()
                .then(() => setError(''))
                .catch((failure) => setError(failure.message))
            }
          >
            Retry
          </button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      <div className="access-plan-grid">
        <section className="plan-card">
          <div className="plan-symbol">
            <Sparkles size={22} />
          </div>
          <span className="eyebrow">A LITTLE HELP TO BEGIN</span>
          <h2>
            {report?.freeUses ?? 5}
            <small>free uses</small>
          </h2>
          <p>Once per reader account. Failed AI responses return the free credit.</p>
          <span className="plan-footnote">Bible, devotionals, and notes stay free.</span>
        </section>
        <section className="plan-card plan-featured">
          <div className="plan-symbol">
            <CalendarDays size={22} />
          </div>
          <span className="eyebrow">CONTINUED REFLECTION SUPPORT</span>
          <h2>
            <small>KES</small> {report?.monthlyPrice ?? 150}
            <small>/ month</small>
          </h2>
          <p>Continued access for readers who have used their free allowance.</p>
          <span className="plan-footnote">No recurring charges are currently enabled.</span>
        </section>
        <section className="plan-card">
          <div className="plan-symbol">
            <Clock3 size={22} />
          </div>
          <span className="eyebrow">A THOUGHTFUL DAILY LIMIT</span>
          <h2>
            {report?.dailyLimit ?? 10}
            <small>requests / day</small>
          </h2>
          <p>Editors and administrators have staff access within the daily limit.</p>
          <span className="plan-footnote">Donations do not change AI allowances.</span>
        </section>
      </div>
      <section className="panel access-panel">
        <div className="section-heading">
          <div>
            <h2>
              <Users size={20} />
              Account access
            </h2>
            <p>Find a reader to review their allowance or record a support adjustment.</p>
          </div>
        </div>
        <div className="access-tools">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Find account by name or email"
              placeholder="Search name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="sr-only" htmlFor="access-filter">
            Filter access
          </label>
          <select
            id="access-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All accounts</option>
            <option value="free">Free allowance</option>
            <option value="paid">Active paid access</option>
            <option value="staff">Editorial team</option>
          </select>
        </div>
        {!report && !error && <p className="empty">Loading account access…</p>}
        {report && !items.length && <p className="empty">No accounts match this search.</p>}
        <div className="access-list">
          {items.map((item) => {
            const used = Math.min(report!.freeUses, Math.max(0, Number(item.freeUsed)));
            return (
              <article className="access-account" key={item.id}>
                <div className="access-person">
                  <div className="avatar">{item.name[0]}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.email}</small>
                  </div>
                </div>
                <div className="access-allowance">
                  <span>
                    {isStaff(item)
                      ? 'Staff access'
                      : `${report!.freeUses - used} free uses remaining`}
                  </span>
                  <progress
                    aria-label={`Free uses consumed by ${item.name}`}
                    value={used}
                    max={report!.freeUses}
                  />
                  <small>
                    {used} of {report!.freeUses} used
                  </small>
                </div>
                <div className="access-expiry">
                  <span
                    className={`status ${isStaff(item) || isPaid(item) ? 'published' : 'draft'}`}
                  >
                    {isStaff(item)
                      ? 'Editorial team'
                      : isPaid(item)
                        ? 'Active access'
                        : used === report!.freeUses
                          ? 'Free uses complete'
                          : 'Free allowance'}
                  </span>
                  <small>
                    {item.paidUntil
                      ? `${isPaid(item) ? 'Until' : 'Expired'} ${new Date(item.paidUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : isStaff(item)
                        ? 'Included with their role'
                        : 'No paid access'}
                  </small>
                </div>
                <button className="secondary" onClick={() => setEditing(item)}>
                  Manage access
                </button>
              </article>
            );
          })}
        </div>
      </section>
      {editing && (
        <AccessAdjustment
          account={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refresh();
            setNotice('Access adjustment saved. No payment was recorded.');
          }}
        />
      )}
    </>
  );
}
