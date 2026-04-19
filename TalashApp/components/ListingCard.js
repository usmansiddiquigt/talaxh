import { MaterialIcons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PRIMARY = '#2C097F';

function formatAge(months) {
  if (!months) return null;
  if (months < 12) return `${months}mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}yr ${m}mo` : `${y}yr`;
}

function formatPrice(listing) {
  if (listing.is_free) return 'Free';
  if (listing.is_adoption) return 'Adoption';
  if (listing.is_swap) return 'Swap';
  if (listing.price) return `PKR ${Number(listing.price).toLocaleString('en-PK')}`;
  return 'POA';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ListingCard({ listing, onPress, onFavorite, isFavorited, style }) {
  const coverPhoto = listing.photos?.[0];
  const price = formatPrice(listing);
  const priceColor = listing.is_free || listing.is_adoption ? '#10b981' : PRIMARY;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {coverPhoto ? (
          <Image source={{ uri: coverPhoto }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="pets" size={36} color="#cbd5e1" />
          </View>
        )}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={onFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={isFavorited ? 'favorite' : 'favorite-border'}
            size={20}
            color={isFavorited ? '#ef4444' : '#fff'}
          />
        </TouchableOpacity>
        {listing.status === 'sold' && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
        <View style={styles.metaRow}>
          {listing.breed ? (
            <Text style={styles.breed} numberOfLines={1}>{listing.breed}</Text>
          ) : null}
          {listing.age_months ? (
            <Text style={styles.age}>{formatAge(listing.age_months)}</Text>
          ) : null}
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.price, { color: priceColor }]}>{price}</Text>
          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={11} color="#94a3b8" />
            <Text style={styles.location} numberOfLines={1}>
              {listing.city || listing.location || 'Unknown'}
            </Text>
          </View>
        </View>
        <Text style={styles.time}>{timeAgo(listing.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: { position: 'relative' },
  image: { width: '100%', height: 140 },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  soldText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  info: { padding: 10 },
  title: { fontSize: 13, fontWeight: '700', color: '#0d121b', marginBottom: 3 },
  metaRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  breed: { fontSize: 11, color: '#64748b', flex: 1 },
  age: { fontSize: 11, color: '#64748b' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 14, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'flex-end' },
  location: { fontSize: 10, color: '#94a3b8', maxWidth: 80 },
  time: { fontSize: 10, color: '#cbd5e1', marginTop: 4 },
});
