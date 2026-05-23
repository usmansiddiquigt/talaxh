import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import StatCard from '../components/StatCard';
import { fetchActivityLogs, fetchDashboardCounts, fetchHeldCount } from '../lib/api';
import { timeAgo } from '../lib/format';

export default function Dashboard() {
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, users: 0 });
  const [heldMessages, setHeldMessages] = useState(0);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, held, logs] = await Promise.all([
          fetchDashboardCounts(),
          fetchHeldCount(),
          fetchActivityLogs({ limit: 10 }),
        ]);
        setCounts(c);
        setHeldMessages(held);
        setRecent(logs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-500 mt-1">Moderation queue at a glance.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mt-6">
        <Link to="/pending">
          <StatCard label="Pending ads"     value={loading ? '—' : counts.pending}  accent="amber"  icon="⏳" />
        </Link>
        <Link to="/listings?moderation=approved">
          <StatCard label="Approved ads"    value={loading ? '—' : counts.approved} accent="green"  icon="✓" />
        </Link>
        <Link to="/listings?moderation=rejected">
          <StatCard label="Rejected ads"    value={loading ? '—' : counts.rejected} accent="red"    icon="×" />
        </Link>
        <Link to="/messages-review">
          <StatCard label="Held messages"   value={loading ? '—' : heldMessages}    accent="amber"  icon="💬" />
        </Link>
        <Link to="/users">
          <StatCard label="Users"           value={loading ? '—' : counts.users}    accent="indigo" icon="👥" />
        </Link>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent activity</h2>
          <Link to="/logs" className="text-sm text-indigo-600 hover:underline">View all →</Link>
        </div>
        <div className="mt-3 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm divide-y divide-slate-100">
          {loading && (
            <div className="px-4 py-6 text-sm text-slate-500">Loading…</div>
          )}
          {!loading && recent.length === 0 && (
            <div className="px-4 py-6 text-sm text-slate-500">No activity yet.</div>
          )}
          {recent.map((log) => (
            <div key={log.id} className="px-4 py-3 text-sm flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-700">
                  {log.admin?.full_name || 'Admin'}
                </span>
                <span className="text-slate-500"> · {log.action.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-xs text-slate-400">{timeAgo(log.created_at)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
