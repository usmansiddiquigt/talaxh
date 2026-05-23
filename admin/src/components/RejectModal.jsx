import { useState } from 'react';

export default function RejectModal({ title, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try { await onConfirm(reason.trim() || null); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Reject listing</h3>
        <p className="mt-1 text-sm text-slate-600 truncate">"{title}"</p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Reason <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Photos are too blurry, please re-upload."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          The reason is shown to the seller in their notification and on the rejected listing.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md ring-1 ring-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-50"
          >
            {submitting ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
