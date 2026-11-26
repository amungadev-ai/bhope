import { useEffect, useState } from 'react';
import { api } from './api';
interface AccountAccess {
  id: string;
  name: string;
  email: string;
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
export function AiAccessStudio() {
  const [report, setReport] = useState<AccessReport | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AccountAccess | null>(null);
  const [expiry, setExpiry] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => api<AccessReport>('/studio/ai-access').then(setReport);
  useEffect(() => {
    void refresh().catch((failure) => setError(failure.message));
  }, []);
  async function save() {
    if (!editing) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/studio/ai-access/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ paidUntil: expiry ? new Date(expiry).toISOString() : null, reason }),
      });
      await refresh();
      setEditing(null);
      setNotice('Access adjustment saved and audited. No payment was recorded.');
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'The access adjustment could not be saved.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPTIONAL REFLECTION SUPPORT</span>
          <h1>AI access & plans.</h1>
          <p>
            Five free uses once per account, then KES 150/month. Reading and personal notes remain
            free.
          </p>
        </div>
      </div>
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      {notice ? <div className="notice">{notice}</div> : null}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>KES {report?.monthlyPrice ?? 150} / month</h3>
        <p>
          {report?.freeUses ?? 5} free lifetime uses · {report?.dailyLimit ?? 10} requests per day.
          Failed AI responses restore the free credit. Editorial staff retain access within the
          daily request limit.
        </p>
        <p>
          Store checkout is not configured. Support adjustments below do not create subscription
          charges or donation records.
        </p>
      </div>
      {editing ? (
        <section className="panel editor" style={{ marginBottom: 20 }}>
          <h3>Adjust access for {editing.email}</h3>
          <label>
            Access expiry (leave empty to revoke)
            <input
              type="datetime-local"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
            />
          </label>
          <label>
            Reason / verified support reference
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={10}
              maxLength={500}
            />
          </label>
          <p>
            Use this for documented support or complimentary access. The free allowance is not
            reset.
          </p>
          <button
            className="primary"
            disabled={busy || reason.trim().length < 10}
            onClick={() => void save()}
          >
            Save access adjustment
          </button>
          <button className="text-button" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </section>
      ) : null}
      <section className="panel">
        <label>
          Find account
          <input
            placeholder="Name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reader</th>
                <th>Free uses</th>
                <th>Access expiry</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {report?.items
                .filter((item) =>
                  `${item.name} ${item.email}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      <br />
                      <small>{item.email}</small>
                    </td>
                    <td>
                      {Number(item.freeUsed)} / {report.freeUses}
                    </td>
                    <td>
                      {item.paidUntil
                        ? new Date(item.paidUntil).toLocaleString()
                        : 'No paid access'}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => {
                          setEditing(item);
                          setReason('');
                          setExpiry(
                            item.paidUntil
                              ? new Date(
                                  Date.parse(item.paidUntil) -
                                    new Date(item.paidUntil).getTimezoneOffset() * 60000,
                                )
                                  .toISOString()
                                  .slice(0, 16)
                              : '',
                          );
                        }}
                      >
                        Adjust access
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
