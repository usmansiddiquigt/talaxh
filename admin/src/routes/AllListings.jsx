import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ListingCard from '../components/ListingCard';
import { approveListing, deleteListing, fetchListings, rejectListing } from '../lib/api';

const CATEGORIES = ['all', 'dogs', 'cats', 'birds', 'rabbits', 'fish', 'reptiles', 'small-pets'];
const STATUSES   = ['all', 'pending', 'approved', 'rejected'];

export default function AllListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const moderation = searchParams.get('moderation') || 'all';
  const category   = searchParams.get('category')   || 'all';
  const search     = searchParams.get('search')     || '';
  const dateFrom   = searchParams.get('from')       || '';
  const dateTo     = searchParams.get('to')         || '';

  const [searchDraft, setSearchDraft] = useState(search);
  const [listings, setListings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [busyId, setBusyId]           = useState(null);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all' && value !== '') next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchListings({
        moderation, category, search,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
      });
      setListings(data);
    } finally {
      setLoading(false);
    }
  }, [moderation, category, search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (l) => {
    setBusyId(l.id);
    try { await approveListing(l.id); load(); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const handleReject = async (l, reason) => {
    setBusyId(l.id);
    try { await rejectListing(l.id, reason); load(); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };
  const handleDelete = async (l) => {
    if (!confirm(`Delete "${l.title}" permanently?`)) return;
    setBusyId(l.id);
    try { await deleteListing(l.id); setListings(prev => prev.filter(x => x.id !== l.id)); }
    catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">All listings</h1>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            value={moderation}
            onChange={(e) => setParam('moderation', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setParam('category', e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setParam('from', e.target.value)}
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setParam('to', e.target.value)}
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Search title</label>
          <form onSubmit={(e) => { e.preventDefault(); setParam('search', searchDraft); }}>
            <input
              placeholder="e.g. labrador"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </form>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {loading ? 'Loading…' : `${listings.length} result${listings.length === 1 ? '' : 's'}`}
      </div>

      <div className="mt-4 space-y-4">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            busy={busyId === l.id}
            onApprove={handleApprove}
            onReject={handleReject}
            onDelete={handleDelete}
          />
        ))}
        {!loading && listings.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center text-sm text-slate-500 ring-1 ring-slate-200 shadow-sm">
            No listings match these filters.
          </div>
        )}
      </div>
    </div>
  );
}
