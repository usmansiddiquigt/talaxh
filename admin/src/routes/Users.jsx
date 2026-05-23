import { useCallback, useEffect, useState } from 'react';

import { banUser, demoteAdmin, fetchUsers, promoteToAdmin, unbanUser } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDateShort, timeAgo } from '../lib/format';

export default function Users() {
  const { profile: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [busyId, setBusyId]   = useState(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try { setUsers(await fetchUsers({ search: q || undefined })); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doBan = async (u) => {
    const reason = prompt(`Ban ${u.full_name || 'this user'}? Optional reason:`);
    if (reason === null) return;
    setBusyId(u.id);
    try { await banUser(u.id, reason); await load(search); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const doUnban = async (u) => {
    setBusyId(u.id);
    try { await unbanUser(u.id); await load(search); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const doPromote = async (u) => {
    if (!confirm(`Make ${u.full_name || 'this user'} an admin?`)) return;
    setBusyId(u.id);
    try { await promoteToAdmin(u.id); await load(search); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const doDemote = async (u) => {
    if (!confirm(`Remove admin from ${u.full_name || 'this user'}?`)) return;
    setBusyId(u.id);
    try { await demoteAdmin(u.id); await load(search); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>

      <form
        onSubmit={(e) => { e.preventDefault(); load(search); }}
        className="mt-4 flex gap-2"
      >
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
          Search
        </button>
      </form>

      <div className="mt-6 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Phone</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Last seen</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-slate-500">No users.</td></tr>
            )}
            {users.map(u => {
              const isMe = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{u.full_name || '—'}</div>
                    <div className="text-xs text-slate-500 font-mono">{u.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">{u.phone || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">{formatDateShort(u.created_at)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                    {u.last_seen_at ? timeAgo(u.last_seen_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 mr-1">
                        admin
                      </span>
                    )}
                    {u.is_banned && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        banned
                      </span>
                    )}
                    {!u.is_admin && !u.is_banned && (
                      <span className="text-xs text-slate-500">active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    {!isMe && (u.is_banned
                      ? <button onClick={() => doUnban(u)} disabled={busyId === u.id}
                                className="text-xs px-2 py-1 rounded ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                          Unban
                        </button>
                      : <button onClick={() => doBan(u)} disabled={busyId === u.id}
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                          Ban
                        </button>
                    )}
                    {!isMe && (u.is_admin
                      ? <button onClick={() => doDemote(u)} disabled={busyId === u.id}
                                className="text-xs px-2 py-1 rounded ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                          Demote
                        </button>
                      : <button onClick={() => doPromote(u)} disabled={busyId === u.id}
                                className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                          Make admin
                        </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
