import { useState } from 'react';
import { Link } from 'react-router-dom';

import { formatDate, formatPrice } from '../lib/format';
import RejectModal from './RejectModal';

const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-800 ring-amber-200',
  approved: 'bg-green-100 text-green-800 ring-green-200',
  rejected: 'bg-red-100   text-red-800   ring-red-200',
};

export default function ListingCard({
  listing, onApprove, onReject, onDelete, busy = false,
}) {
  const [showReject, setShowReject] = useState(false);
  const status = listing.moderation_status || 'pending';
  const cover = listing.photos?.[0];

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Cover photo */}
        <div className="md:w-48 md:flex-shrink-0 bg-slate-100">
          {cover ? (
            <img src={cover} alt={listing.title}
                 className="h-48 w-full md:h-full object-cover" />
          ) : (
            <div className="h-48 md:h-full w-full flex items-center justify-center text-slate-300 text-4xl">
              🐾
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-4 md:p-5 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 truncate">
                {listing.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{listing.category}</span>
                {listing.breed && <><span>·</span><span>{listing.breed}</span></>}
                {listing.city && <><span>·</span><span>{listing.city}</span></>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${STATUS_COLORS[status]}`}>
                {status}
              </span>
              <span className="text-sm font-bold text-slate-900">{formatPrice(listing)}</span>
            </div>
          </div>

          {listing.description && (
            <p className="mt-3 text-sm text-slate-700 line-clamp-3">{listing.description}</p>
          )}

          {listing.rejection_reason && status === 'rejected' && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-md p-2">
              <strong>Reason:</strong> {listing.rejection_reason}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <div>
                Seller:&nbsp;
                <span className="font-medium text-slate-700">
                  {listing.seller?.full_name || 'Unknown'}
                </span>
                {listing.seller?.is_banned && (
                  <span className="ml-2 text-red-700 font-semibold">BANNED</span>
                )}
              </div>
              <div>Posted: {formatDate(listing.created_at)}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to={`/listings/${listing.id}`}
                className="px-3 py-1.5 text-xs rounded-md ring-1 ring-slate-300 hover:bg-slate-50 transition"
              >
                View Full
              </Link>
              {status !== 'approved' && onApprove && (
                <button
                  disabled={busy}
                  onClick={() => onApprove(listing)}
                  className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                >
                  Approve
                </button>
              )}
              {status !== 'rejected' && onReject && (
                <button
                  disabled={busy}
                  onClick={() => setShowReject(true)}
                  className="px-3 py-1.5 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition"
                >
                  Reject
                </button>
              )}
              {onDelete && (
                <button
                  disabled={busy}
                  onClick={() => onDelete(listing)}
                  className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReject && (
        <RejectModal
          title={listing.title}
          onCancel={() => setShowReject(false)}
          onConfirm={async (reason) => {
            setShowReject(false);
            await onReject(listing, reason);
          }}
        />
      )}
    </div>
  );
}
