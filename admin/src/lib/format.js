export function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatPrice(listing) {
  if (!listing) return '';
  if (listing.is_free) return 'Free';
  if (listing.is_adoption) return 'Adoption';
  if (listing.is_swap) return 'Swap';
  if (listing.price) return `PKR ${Number(listing.price).toLocaleString('en-PK')}`;
  return 'POA';
}

export function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
