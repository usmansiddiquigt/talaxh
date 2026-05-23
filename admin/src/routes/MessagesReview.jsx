import { useCallback, useEffect, useState } from 'react';

import RejectModal from '../components/RejectModal';
import { approveMessage, fetchHeldMessages, rejectMessage } from '../lib/api';
import { formatDate } from '../lib/format';

const STATUS_OPTIONS = ['under_review', 'rejected', 'all'];

export default function MessagesReview() {
  const [status, setStatus]     = useState('under_review');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setMessages(await fetchHeldMessages({ status })); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (m) => {
    setBusyId(m.id);
    try { await approveMessage(m.id); setMessages(prev => prev.filter(x => x.id !== m.id)); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const doReject = async (reason) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectMessage(rejectTarget.id, reason);
      setMessages(prev => prev.filter(x => x.id !== rejectTarget.id));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); setRejectTarget(null); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message review</h1>
          <p className="text-sm text-slate-500 mt-1">
            Messages held by the keyword scanner. The recipient cannot see them until you approve.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="text-sm text-indigo-600 hover:underline">Refresh</button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {loading ? 'Loading…' : `${messages.length} message${messages.length === 1 ? '' : 's'}`}
      </div>

      <div className="mt-4 space-y-3">
        {!loading && messages.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center ring-1 ring-slate-200 shadow-sm text-sm text-slate-500">
            Nothing to review.
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {m.sender?.full_name || 'Unknown sender'}
                  {m.sender?.is_banned && (
                    <span className="ml-2 text-xs font-semibold text-red-700">BANNED</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(m.created_at)} · conversation {m.conversation_id.slice(0, 8)}…
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(m.matched_keywords || []).map(kw => (
                  <span key={kw} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 ring-1 ring-slate-100 rounded-md p-3">
              {m.body}
            </p>

            {m.rejection_reason && (
              <div className="mt-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md p-2">
                <strong>Rejected:</strong> {m.rejection_reason}
              </div>
            )}

            {status !== 'rejected' && (
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <button onClick={() => handleApprove(m)} disabled={busyId === m.id}
                        className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                  Approve & deliver
                </button>
                <button onClick={() => setRejectTarget(m)} disabled={busyId === m.id}
                        className="px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rejectTarget && (
        <RejectModal
          title={rejectTarget.body.slice(0, 60)}
          onCancel={() => setRejectTarget(null)}
          onConfirm={doReject}
        />
      )}
    </div>
  );
}
