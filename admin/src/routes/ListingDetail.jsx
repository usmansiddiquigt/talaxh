import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import RejectModal from '../components/RejectModal';
import {
  approveListing, deleteListing, fetchListingById, rejectListing,
} from '../lib/api';
import { formatDate, formatPrice } from '../lib/format';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [showReject, setShowReject] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setListing(await fetchListingById(id)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!listing) return <div className="text-red-600">Not found.</div>;

  const status = listing.moderation_status || 'pending';
  const statusColor = {
    pending:  'bg-amber-100  text-amber-800',
    approved: 'bg-green-100  text-green-800',
    rejected: 'bg-red-100    text-red-800',
  }[status];

  const handleApprove = async () => {
    setBusy(true);
    try { await approveListing(listing.id); await load(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };
  const handleReject = async (reason) => {
    setShowReject(false);
    setBusy(true);
    try { await rejectListing(listing.id, reason); await load(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };
  const handleDelete = async () => {
    if (!confirm(`Delete "${listing.title}"?`)) return;
    setBusy(true);
    try { await deleteListing(listing.id); navigate('/listings'); }
    catch (err) { alert(err.message); setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/listings" className="text-sm text-indigo-600 hover:underline">← Back to listings</Link>

      <div className="mt-4 rounded-xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {/* Photos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 bg-slate-100">
          {(listing.photos || []).slice(0, 6).map((src, i) => (
            <img key={i} src={src} alt="" className="aspect-square object-cover w-full" />
          ))}
          {(!listing.photos || listing.photos.length === 0) && (
            <div className="aspect-square flex items-center justify-center text-4xl text-slate-300 col-span-3">🐾</div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{listing.title}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
              {status}
            </span>
          </div>
          <div className="mt-1 text-xl font-semibold text-slate-700">{formatPrice(listing)}</div>

          {listing.description && (
            <p className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{listing.description}</p>
          )}

          {listing.rejection_reason && status === 'rejected' && (
            <div className="mt-4 text-sm text-red-800 bg-red-50 ring-1 ring-red-200 rounded-md p-3">
              <strong>Rejection reason:</strong> {listing.rejection_reason}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Field label="Category" value={listing.category} />
            <Field label="Breed"    value={listing.breed} />
            <Field label="Gender"   value={listing.gender} />
            <Field label="Color"    value={listing.color} />
            <Field label="Age"      value={listing.age_months ? `${listing.age_months} mo` : null} />
            <Field label="City"     value={listing.city} />
            <Field label="Location" value={listing.location} />
            <Field label="Views"    value={String(listing.views_count || 0)} />
            <Field label="Posted"   value={formatDate(listing.created_at)} />
            <Field label="Reviewed" value={formatDate(listing.reviewed_at)} />
          </dl>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">Seller</h3>
            <div className="mt-1 text-sm text-slate-600">
              {listing.seller?.full_name || 'Unknown'}
              {listing.seller?.is_banned && <span className="ml-2 text-red-700 font-semibold">BANNED</span>}
              <div className="text-xs text-slate-500">{listing.seller?.phone || '—'}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {status !== 'approved' && (
              <button onClick={handleApprove} disabled={busy}
                      className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
            )}
            {status !== 'rejected' && (
              <button onClick={() => setShowReject(true)} disabled={busy}
                      className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">
                Reject
              </button>
            )}
            <button onClick={handleDelete} disabled={busy}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
              Delete
            </button>
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          title={listing.title}
          onCancel={() => setShowReject(false)}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-800 mt-0.5">{value || '—'}</dd>
    </div>
  );
}
