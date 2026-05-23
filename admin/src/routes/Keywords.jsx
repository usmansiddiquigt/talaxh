import { useCallback, useEffect, useState } from 'react';

import { addKeyword, fetchKeywords, removeKeyword, updateKeyword } from '../lib/api';
import { formatDate } from '../lib/format';

const CATEGORIES = ['', 'contact', 'social', 'link', 'abuse', 'scam', 'other'];

export default function Keywords() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [draft, setDraft]       = useState({ keyword: '', category: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setKeywords(await fetchKeywords()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.keyword.trim()) return;
    setSaving(true);
    try {
      await addKeyword(draft);
      setDraft({ keyword: '', category: '', notes: '' });
      await load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const startEdit = (k) => {
    setEditingId(k.id);
    setEditDraft({ keyword: k.keyword, category: k.category || '', notes: k.notes || '' });
  };
  const saveEdit = async () => {
    try {
      await updateKeyword(editingId, editDraft);
      setEditingId(null);
      await load();
    } catch (err) { alert(err.message); }
  };
  const handleRemove = async (k) => {
    if (!confirm(`Remove "${k.keyword}" from the blocked list?`)) return;
    try { await removeKeyword(k.id); await load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Blocked keywords</h1>
      <p className="text-sm text-slate-500 mt-1">
        Any message containing one of these (case-insensitive substring) is held for review
        instead of being delivered to the recipient.
      </p>

      <form onSubmit={handleAdd} className="mt-6 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr_auto] gap-2 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Keyword</label>
            <input
              required
              value={draft.keyword}
              onChange={(e) => setDraft(d => ({ ...d, keyword: e.target.value }))}
              placeholder="e.g. whatsapp"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              value={draft.category}
              onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes (optional)</label>
            <input
              value={draft.notes}
              onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
              placeholder="Why is this blocked?"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Keyword</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Notes</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Added</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">Loading…</td></tr>
            )}
            {!loading && keywords.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-slate-500">No blocked keywords yet.</td></tr>
            )}
            {keywords.map(k => editingId === k.id ? (
              <tr key={k.id} className="bg-slate-50">
                <td className="px-4 py-3">
                  <input value={editDraft.keyword}
                         onChange={(e) => setEditDraft(d => ({ ...d, keyword: e.target.value }))}
                         className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-3">
                  <select value={editDraft.category}
                          onChange={(e) => setEditDraft(d => ({ ...d, category: e.target.value }))}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c || '—'}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <input value={editDraft.notes}
                         onChange={(e) => setEditDraft(d => ({ ...d, notes: e.target.value }))}
                         className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm" />
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{formatDate(k.created_at)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={saveEdit} className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded ring-1 ring-slate-300">Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={k.id}>
                <td className="px-4 py-3 font-mono">{k.keyword}</td>
                <td className="px-4 py-3 text-slate-600">{k.category || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">{k.notes || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-500">{formatDate(k.created_at)}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => startEdit(k)} className="text-xs px-2 py-1 rounded ring-1 ring-slate-300 hover:bg-slate-50">Edit</button>
                  <button onClick={() => handleRemove(k)} className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
