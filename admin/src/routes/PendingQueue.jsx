import { useCallback, useEffect, useState } from 'react';

import ListingCard from '../components/ListingCard';
import { approveListing, deleteListing, fetchListings, rejectListing } from '../lib/api';

export default function PendingQueue() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [error, setError]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings({ moderation: 'pending' });
      setListings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (l) => {
    setBusyId(l.id);
    try {
      await approveListing(l.id);
      setListings(prev => prev.filter(x => x.id !== l.id));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const handleReject = async (l, reason) => {
    setBusyId(l.id);
    try {
      await rejectListing(l.id, reason);
      setListings(prev => prev.filter(x => x.id !== l.id));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (l) => {
    if (!confirm(`Delete "${l.title}" permanently? This cannot be undone.`)) return;
    setBusyId(l.id);
    try {
      await deleteListing(l.id);
      setListings(prev => prev.filter(x => x.id !== l.id));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pending queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading…' : `${listings.length} listing${listings.length === 1 ? '' : 's'} awaiting review.`}
          </p>
        </div>
        <button
          onClick={load}
          className="text-sm text-indigo-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {!loading && listings.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center ring-1 ring-slate-200 shadow-sm">
            <div className="text-4xl">🎉</div>
            <div className="mt-3 text-base font-semibold text-slate-900">Queue is empty</div>
            <div className="mt-1 text-sm text-slate-500">No listings are waiting for review.</div>
          </div>
        )}

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
      </div>
    </div>
  );
}
