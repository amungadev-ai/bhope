import { useEffect, useState } from 'react';
import { Download, Heart, RefreshCw } from 'lucide-react';
import type { Donation } from '@bhope/shared';
import { api } from './api';
type Report = {
  items: Donation[];
  totals: { status: string; amount: number; count: number }[];
  capabilities: { mpesa: boolean; card: boolean };
  mode: string;
};
export function GivingStudio() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      setReport(await api<Report>('/studio/donations'));
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Giving records could not be loaded.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const total = (status: string) => report?.totals.find((item) => item.status === status);
  const visible = report?.items.filter((item) => filter === 'all' || item.status === filter) ?? [];
  function exportRows() {
    const rows = [
      ['Reference', 'Created', 'Amount KES', 'Method', 'Status'],
      ...visible.map((item) => [
        item.reference ?? '',
        item.createdAt,
        item.amount,
        item.method,
        item.status,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'beacon-of-hope-giving.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GIVING & ACCOUNTABILITY</span>
          <h1>A record of kindness.</h1>
          <p>Confirmed payments contribute to totals. Pending attempts do not.</p>
        </div>
        <button className="secondary" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw size={15} />
          {busy ? 'Refreshing…' : 'Refresh records'}
        </button>
      </div>
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="stats">
        <section className="stat">
          <div>
            <span className="eyebrow">CONFIRMED GIVING · KES</span>
            <strong>{Number(total('success')?.amount ?? 0).toLocaleString()}</strong>
            <small>{total('success')?.count ?? 0} confirmed gifts</small>
          </div>
          <Heart size={23} />
        </section>
        <section className="stat">
          <div>
            <span className="eyebrow">PENDING CONFIRMATION</span>
            <strong>{total('pending')?.count ?? 0}</strong>
          </div>
        </section>
        <section className="stat">
          <div>
            <span className="eyebrow">REVERSED PAYMENTS</span>
            <strong>{total('reversed')?.count ?? 0}</strong>
          </div>
        </section>
      </div>
      <div className="service-grid" style={{ marginBottom: 25 }}>
        <section className="panel service">
          <div>
            <h3>M-Pesa · {report?.capabilities.mpesa ? 'Configured' : 'Not configured'}</h3>
            <p>
              Environment: {report?.mode ?? '—'}. A prompt request remains pending until provider
              verification.
            </p>
          </div>
        </section>
        <section className="panel service">
          <div>
            <h3>Paystack cards · {report?.capabilities.card ? 'Configured' : 'Not configured'}</h3>
            <p>
              Hosted checkout, verified amounts, and signed webhooks. Secret keys are managed on the
              server.
            </p>
          </div>
        </section>
      </div>
      <div className="library-tools">
        <div className="filters">
          {['all', 'success', 'pending', 'failed', 'reversed'].map((value) => (
            <button
              key={value}
              className={filter === value ? 'selected' : ''}
              onClick={() => setFilter(value)}
            >
              {value === 'all' ? 'All records' : value === 'success' ? 'Confirmed' : value}
            </button>
          ))}
        </div>
        <button className="text-button" onClick={exportRows} disabled={!visible.length}>
          <Download size={15} />
          Export shown records
        </button>
      </div>
      <section className="panel">
        {visible.length ? (
          visible.map((item) => (
            <div className="entry-row" key={item.id}>
              <div className="entry-title">
                <strong>
                  KES {item.amount.toLocaleString()} · {item.method === 'mpesa' ? 'M-Pesa' : 'Card'}
                </strong>
                <small>
                  {new Date(item.createdAt).toLocaleString()} · {item.reference}
                </small>
              </div>
              <span
                className={`status ${item.status === 'success' ? 'published' : item.status === 'pending' ? 'review' : 'draft'}`}
              >
                {item.status === 'success' ? 'Confirmed' : item.status}
              </span>
            </div>
          ))
        ) : (
          <p className="empty">No giving records in this view.</p>
        )}
      </section>
      <p className="muted">
        This report covers received donations. Public spending allocations and community support
        reports should be based on reviewed financial records.
      </p>
    </>
  );
}
