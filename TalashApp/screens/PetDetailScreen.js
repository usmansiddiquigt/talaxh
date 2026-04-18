import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Badge from '../components/Badge';
import ImageCarousel from '../components/ImageCarousel';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';
const AMBER = '#F4A724';

function formatAge(months) {
  if (!months) return 'Unknown age';
  if (months < 12) return `${months} months old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y} yr ${m} mo` : `${y} year${y > 1 ? 's' : ''} old`;
}

function formatPrice(listing) {
  if (listing.is_free) return 'Free';
  if (listing.is_adoption) return 'For Adoption';
  if (listing.is_swap) return 'Swap';
  if (listing.price) return `$${Number(listing.price).toLocaleString()}`;
  return 'POA';
}

function memberSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Member since ${d.toLocaleString('default', { month: 'short', year: 'numeric' })}`;
}

export default function PetDetailScreen({ navigation, route }) {
  const { listingId } = route.params;
  const { token, user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [safetyExpanded, setSafetyExpanded] = useState(false);

  useEffect(() => {
    fetchListing();
    if (token) checkFavorite();
  }, [listingId]);

  const fetchListing = async () => {
    try {
      const res = await fetch(`${API_URL}/listings/${listingId}`);
      const data = await res.json();
      setListing(data);
    } catch {
      Alert.alert('Error', 'Could not load listing');
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const ids = new Set((data.favorites || []).map(f => f.listing?.id));
      setIsFavorited(ids.has(listingId));
    } catch { /* ignore */ }
  };

  const toggleFavorite = async () => {
    if (!token) { navigation.navigate('Login'); return; }
    setIsFavorited(p => !p);
    try {
      await fetch(`${API_URL}/favorites/${listingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { setIsFavorited(p => !p); }
  };

  const handleMessage = async () => {
    if (!token) { navigation.navigate('Login'); return; }
    if (listing.seller_id === user?.id) {
      Alert.alert('This is your listing');
      return;
    }
    try {
      const opener = `Hi, is ${listing.title} still available?`;
      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listingId, initialMessage: opener }),
      });
      const data = await res.json();
      navigation.navigate('Conversation', {
        conversationId: data.conversation.id,
        listing,
      });
    } catch {
      Alert.alert('Error', 'Could not start conversation');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${listing?.title} on Talash!\n${listing?.description || ''}`,
      });
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingSpinner />;
  if (!listing) return null;

  const seller = listing.profiles;
  const price = formatPrice(listing);
  const priceColor = listing.is_free || listing.is_adoption ? '#10b981' : PRIMARY;

  const healthChips = [
    { key: 'is_vaccinated', label: 'Vaccinated' },
    { key: 'is_microchipped', label: 'Microchipped' },
    { key: 'is_neutered', label: 'Neutered/Spayed' },
    { key: 'is_kc_registered', label: 'KC Registered' },
    { key: 'is_vet_checked', label: 'Vet Checked' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <MaterialIcons name="share" size={22} color="#0d121b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleFavorite}>
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={24}
              color={isFavorited ? '#ef4444' : '#0d121b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Image carousel */}
        <ImageCarousel photos={listing.photos || []} height={300} />

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.breed}>{listing.breed || listing.category}</Text>
            </View>
            <Text style={[styles.price, { color: priceColor }]}>{price}</Text>
          </View>

          {/* Meta chips */}
          <View style={styles.chips}>
            {listing.gender && listing.gender !== 'unknown' && (
              <View style={styles.chip}>
                <MaterialIcons
                  name={listing.gender === 'male' ? 'male' : 'female'}
                  size={14}
                  color={PRIMARY}
                />
                <Text style={styles.chipText}>{listing.gender === 'male' ? 'Male' : 'Female'}</Text>
              </View>
            )}
            {listing.age_months && (
              <View style={styles.chip}>
                <MaterialIcons name="cake" size={14} color={PRIMARY} />
                <Text style={styles.chipText}>{formatAge(listing.age_months)}</Text>
              </View>
            )}
            {listing.color && (
              <View style={styles.chip}>
                <MaterialIcons name="palette" size={14} color={PRIMARY} />
                <Text style={styles.chipText}>{listing.color}</Text>
              </View>
            )}
            {listing.city && (
              <View style={styles.chip}>
                <MaterialIcons name="place" size={14} color={PRIMARY} />
                <Text style={styles.chipText}>{listing.city}</Text>
              </View>
            )}
          </View>

          {/* Health status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health & Details</Text>
            <View style={styles.healthRow}>
              {healthChips.map(h => (
                <View
                  key={h.key}
                  style={[styles.healthChip, listing[h.key] && styles.healthChipActive]}
                >
                  <MaterialIcons
                    name={listing[h.key] ? 'check-circle' : 'cancel'}
                    size={14}
                    color={listing[h.key] ? '#10b981' : '#cbd5e1'}
                  />
                  <Text style={[styles.healthText, listing[h.key] && styles.healthTextActive]}>
                    {h.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Description */}
          {listing.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this pet</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationCard}>
              <MaterialIcons name="place" size={20} color={PRIMARY} />
              <Text style={styles.locationText}>
                {listing.city || listing.location || 'Location not specified'}
              </Text>
            </View>
          </View>

          {/* Seller card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <TouchableOpacity
              style={styles.sellerCard}
              onPress={() => navigation.navigate('SellerProfile', { sellerId: listing.seller_id })}
            >
              <View style={styles.sellerAvatar}>
                <MaterialIcons name="person" size={28} color="#94a3b8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>{seller?.full_name || 'Seller'}</Text>
                <Text style={styles.sellerMeta}>{memberSince(seller?.created_at)}</Text>
                <View style={styles.verifiedRow}>
                  {seller?.is_email_verified && (
                    <Badge label="Email Verified" variant="verified" style={{ marginRight: 6 }} />
                  )}
                  {seller?.is_phone_verified && (
                    <Badge label="Phone Verified" variant="verified" />
                  )}
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Safety tips */}
          <View style={styles.safetyCard}>
            <TouchableOpacity
              style={styles.safetyHeader}
              onPress={() => setSafetyExpanded(p => !p)}
            >
              <MaterialIcons name="shield" size={20} color={AMBER} />
              <Text style={styles.safetyTitle}>Safety Tips</Text>
              <MaterialIcons
                name={safetyExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
            {safetyExpanded && (
              <View style={styles.safetyBody}>
                {[
                  'Meet the seller in a safe, public place',
                  'Never pay in advance or transfer money before seeing the pet',
                  'Check health certificates and vaccination records',
                  'If a deal seems too good to be true, be cautious',
                  'Report suspicious listings to us immediately',
                ].map((tip, i) => (
                  <View key={i} style={styles.safetyItem}>
                    <Text style={styles.safetyBullet}>•</Text>
                    <Text style={styles.safetyText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPrice}>
          <Text style={styles.bottomPriceLabel}>Price</Text>
          <Text style={[styles.bottomPriceValue, { color: priceColor }]}>{price}</Text>
        </View>
        <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
          <MaterialIcons name="chat-bubble-outline" size={20} color="#fff" />
          <Text style={styles.messageBtnText}>Message Seller</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  topBarRight: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f6f6f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0d121b', flex: 1, marginRight: 8 },
  breed: { fontSize: 14, color: '#64748b', marginTop: 2 },
  price: { fontSize: 24, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0ebff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0d121b', marginBottom: 10 },
  healthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  healthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  healthChipActive: { backgroundColor: '#f0fdf4' },
  healthText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  healthTextActive: { color: '#10b981' },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f6f6f8',
    padding: 14,
    borderRadius: 12,
  },
  locationText: { fontSize: 14, color: '#0d121b', fontWeight: '600' },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f6f6f8',
    padding: 14,
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#0d121b' },
  sellerMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  verifiedRow: { flexDirection: 'row', marginTop: 4 },
  safetyCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    overflow: 'hidden',
    marginBottom: 8,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  safetyTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#92400e' },
  safetyBody: { paddingHorizontal: 16, paddingBottom: 14 },
  safetyItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  safetyBullet: { color: '#d97706', fontWeight: '700' },
  safetyText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  bottomPrice: { flex: 0 },
  bottomPriceLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  bottomPriceValue: { fontSize: 20, fontWeight: '800' },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AMBER,
    height: 52,
    borderRadius: 14,
  },
  messageBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
