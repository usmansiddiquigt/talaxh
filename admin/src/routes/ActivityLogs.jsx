import { useEffect, useState } from 'react';

import { fetchActivityLogs } from '../lib/api';
import { formatDate } from '../lib/format';

const ACTION_LABEL = {
  approve_listing: 'Approved listing',
  reject_listing:  'Rejected listing',
  delete_listing:  'Deleted listing',
  ban_user:        'Banned user',
  unban_user:      'Unbanned user',
  promote_admin:   'Promoted admin',
  demote_admin:    'Demoted admin',
  approve_message: 'Approved message',
  reject_message:  'Rejected message',
  add_keyword:     'Added keyword',
  edit_keyword:    'Edited keyword',
  remove_keyword:  'Removed keyword',
};

const ACTION_COLOR = {
  approve_listing: 'bg-green-100 text-green-800',
  reject_listing:  'bg-amber-100 text-amber-800',
  delete_listing:  'bg-red-100   text-red-800',
  ban_user:        'bg-red-100   text-red-800',
  unban_user:      'bg-slate-100 text-slate-700',
  promote_admin:   'bg-indigo-100 text-indigo-800',
  demote_admin:    'bg-slate-100 text-slate-700',
  approve_message: 'bg-green-100 text-green-800',
  reject_message:  'bg-amber-100 text-amber-800',
  add_keyword:     'bg-indigo-100 text-indigo-800',
  edit_keyword:    'bg-slate-100 text-slate-700',
  remove_keyword:  'bg-red-100   text-red-800',
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { setLogs(await fetchActivityLogs({ limit: 200 })); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Activity log</h1>
      <p className="text-sm text-slate-500 mt-1">Last 200 admin actions.</p>

      <div className="mt-6 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">Admin</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">Target</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">No activity yet.</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id}>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(l.created_at)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{l.admin?.full_name || 'Admin'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLOR[l.action] || 'bg-slate-100 text-slate-700'}`}>
                    {ACTION_LABEL[l.action] || l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                  {l.target_type ? `${l.target_type}:${(l.target_id || '').slice(0, 8)}` : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 font-mono">
                  {l.metadata && Object.keys(l.metadata).length
                    ? JSON.stringify(l.metadata)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
