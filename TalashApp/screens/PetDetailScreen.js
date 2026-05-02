import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  if (listing.price)
    return `PKR ${Number(listing.price).toLocaleString('en-PK')}`;
  return 'POA';
}

function memberSince(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Member since ${d.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min${m !== 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h !== 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d !== 1 ? 's' : ''} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w !== 1 ? 's' : ''} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo !== 1 ? 's' : ''} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y !== 1 ? 's' : ''} ago`;
}

export default function PetDetailScreen({ navigation, route }) {
  const { listingId } = route.params;
  const { token, user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [safetyExpanded, setSafetyExpanded] = useState(false);
  const [similar, setSimilar] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchListing();
    if (token) checkFavorite();
  }, [listingId]);

  useEffect(() => {
    if (!listing?.category) return;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/listings?category=${listing.category}&limit=10`,
        );
        const data = await res.json();
        setSimilar(
          (data.listings || []).filter((l) => l.id !== listing.id).slice(0, 8),
        );
      } catch {
        setSimilar([]);
      }
    })();
  }, [listing?.category, listing?.id]);

  useEffect(() => {
    if (!listing) return;
    const name = listing.profiles?.full_name?.split(' ')[0] || 'there';
    setMessage(`Hi ${name}, is this still available?`);
  }, [listing?.id, listing?.profiles?.full_name]);

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
      const ids = new Set((data.favorites || []).map((f) => f.listing?.id));
      setIsFavorited(ids.has(listingId));
    } catch {
      /* ignore */
    }
  };

  const toggleFavorite = async () => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    setIsFavorited((p) => !p);
    try {
      await fetch(`${API_URL}/favorites/${listingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setIsFavorited((p) => !p);
    }
  };

  const handleMessage = async (override) => {
    if (!token) {
      navigation.navigate('Login');
      return;
    }
    if (listing.seller_id === user?.id) {
      Alert.alert('This is your listing');
      return;
    }
    const text =
      typeof override === 'string' && override.trim()
        ? override.trim()
        : `Hi, is ${listing.title} still available?`;
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ listingId, initialMessage: text }),
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

  const handleCall = async () => {
    const phone = (listing?.contact_phone || listing?.profiles?.phone || '').trim();
    console.log('[handleCall] listing.profiles =', listing?.profiles, 'resolved phone =', phone);
    if (!phone) {
      Alert.alert(
        'No phone number',
        'Seller has not shared a phone number for this listing.',
      );
      return;
    }
    const url = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) Linking.openURL(url);
      else
        Alert.alert(
          'Cannot place call',
          'Calling is not available on this device.',
        );
    } catch {
      Alert.alert('Cannot place call', 'Something went wrong.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${listing?.title} on Talash!\n${listing?.description || ''}`,
      });
    } catch {
      /* ignore */
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!listing) return null;

  const seller = listing.profiles;
  const sellerPhone = (listing.contact_phone || seller?.phone || '').trim();
  const price = formatPrice(listing);
  const priceColor =
    listing.is_free || listing.is_adoption ? '#10b981' : PRIMARY;

  const healthChips = [
    { key: 'is_vaccinated', label: 'Vaccinated' },
    { key: 'is_microchipped', label: 'Microchipped' },
    { key: 'is_neutered', label: 'Neutered/Spayed' },
    { key: 'is_kc_registered', label: 'KC Registered' },
    { key: 'is_vet_checked', label: 'Vet Checked' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name='arrow-back' size={24} color='#fff' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Talash</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleShare}>
            <MaterialIcons name='share' size={20} color='#fff' />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Account' })}
          >
            <MaterialIcons name='person-outline' size={22} color='#fff' />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Image carousel */}
        <ImageCarousel photos={listing.photos || []} height={300} />

        {/* Quick action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isFavorited && styles.actionBtnActive]}
            onPress={toggleFavorite}
          >
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={18}
              color={isFavorited ? '#ef4444' : PRIMARY}
            />
            <Text
              style={[styles.actionText, isFavorited && { color: '#ef4444' }]}
            >
              {isFavorited ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              navigation.navigate('Main', {
                screen: 'Home',
                params: {
                  category: listing.category,
                  breed: listing.breed || undefined,
                },
              })
            }
          >
            <MaterialIcons name='grid-view' size={16} color={PRIMARY} />
            <Text style={styles.actionText} numberOfLines={1}>
              View All {listing.breed || 'Breed'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('PostListing')}
          >
            <MaterialIcons name='add' size={18} color={PRIMARY} />
            <Text style={styles.actionText}>Post an Ad</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Title + price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.breed}>
                {listing.breed || listing.category}
              </Text>
              {listing.created_at ? (
                <View style={styles.postedRow}>
                  <MaterialIcons name='schedule' size={13} color='#94a3b8' />
                  <Text style={styles.postedText}>
                    Posted {timeAgo(listing.created_at)}
                  </Text>
                </View>
              ) : null}
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
                <Text style={styles.chipText}>
                  {listing.gender === 'male' ? 'Male' : 'Female'}
                </Text>
              </View>
            )}
            {listing.age_months && (
              <View style={styles.chip}>
                <MaterialIcons name='cake' size={14} color={PRIMARY} />
                <Text style={styles.chipText}>
                  {formatAge(listing.age_months)}
                </Text>
              </View>
            )}
            {listing.color && (
              <View style={styles.chip}>
                <MaterialIcons name='palette' size={14} color={PRIMARY} />
                <Text style={styles.chipText}>{listing.color}</Text>
              </View>
            )}
            {listing.city && (
              <View style={styles.chip}>
                <MaterialIcons name='place' size={14} color={PRIMARY} />
                <Text style={styles.chipText}>{listing.city}</Text>
              </View>
            )}
          </View>

          {/* Health status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health & Details</Text>
            <View style={styles.healthRow}>
              {healthChips.map((h) => (
                <View
                  key={h.key}
                  style={[
                    styles.healthChip,
                    listing[h.key] && styles.healthChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={listing[h.key] ? 'check-circle' : 'cancel'}
                    size={14}
                    color={listing[h.key] ? '#10b981' : '#cbd5e1'}
                  />
                  <Text
                    style={[
                      styles.healthText,
                      listing[h.key] && styles.healthTextActive,
                    ]}
                  >
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

          {/* Quick message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send a message</Text>
            <View style={styles.msgRow}>
              <TextInput
                style={styles.msgInput}
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder='Write a message...'
                placeholderTextColor='#94a3b8'
              />
              <TouchableOpacity
                style={[styles.msgSendBtn, !message.trim() && { opacity: 0.5 }]}
                disabled={!message.trim()}
                onPress={() => handleMessage(message)}
              >
                <MaterialIcons name='send' size={18} color='#fff' />
                <Text style={styles.msgSendText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Seller card */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <TouchableOpacity
              style={styles.sellerCard}
              onPress={() =>
                navigation.navigate('SellerProfile', {
                  sellerId: listing.seller_id,
                })
              }
            >
              <View style={styles.sellerAvatar}>
                <MaterialIcons name='person' size={28} color='#94a3b8' />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerName}>
                  {seller?.full_name || 'Seller'}
                </Text>
                <Text style={styles.sellerMeta}>
                  {memberSince(seller?.created_at)}
                </Text>
                {seller?.last_seen_at ? (
                  <View style={styles.activeRow}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>
                      Active {timeAgo(seller.last_seen_at)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.verifiedRow}>
                  {seller?.is_email_verified && (
                    <Badge
                      label='Email Verified'
                      variant='verified'
                      style={{ marginRight: 6 }}
                    />
                  )}
                  {seller?.is_phone_verified && (
                    <Badge label='Phone Verified' variant='verified' />
                  )}
                </View>
              </View>
              <MaterialIcons name='chevron-right' size={22} color='#94a3b8' />
            </TouchableOpacity>
          </View>

          {/* Safety tips */}
          <View style={styles.safetyCard}>
            <TouchableOpacity
              style={styles.safetyHeader}
              onPress={() => setSafetyExpanded((p) => !p)}
            >
              <MaterialIcons name='shield' size={20} color={AMBER} />
              <Text style={styles.safetyTitle}>Safety Tips</Text>
              <MaterialIcons
                name={
                  safetyExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'
                }
                size={20}
                color='#64748b'
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

          {/* Similar Ads */}
          {similar.length > 0 && (
            <View style={styles.section}>
              <View style={styles.simHeader}>
                <Text style={styles.sectionTitle}>Similar Ads</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Main', {
                      screen: 'Home',
                      params: {
                        category: listing.category,
                        breed: listing.breed || undefined,
                      },
                    })
                  }
                >
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingRight: 4 }}
              >
                {similar.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.simCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.push('PetDetail', { listingId: item.id })
                    }
                  >
                    {item.photos?.[0] ? (
                      <Image
                        source={{ uri: item.photos[0] }}
                        style={styles.simImg}
                      />
                    ) : (
                      <View style={[styles.simImg, styles.simImgPlaceholder]}>
                        <MaterialIcons name='pets' size={28} color='#cbd5e1' />
                      </View>
                    )}
                    <View style={styles.simBody}>
                      <Text style={styles.simTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.simPrice} numberOfLines={1}>
                        {formatPrice(item)}
                      </Text>
                      {item.city ? (
                        <View style={styles.simMeta}>
                          <MaterialIcons
                            name='place'
                            size={11}
                            color='#94a3b8'
                          />
                          <Text style={styles.simMetaText} numberOfLines={1}>
                            {item.city}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {sellerPhone ? (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
            <MaterialIcons name='phone' size={20} color={PRIMARY} />
            <View style={{ alignItems: 'flex-start' }}>
              <Text style={styles.callBtnText}>Call</Text>
              <Text style={styles.callBtnPhone} numberOfLines={1}>{sellerPhone}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
          <MaterialIcons name='chat-bubble-outline' size={20} color='#fff' />
          <Text style={styles.messageBtnText}>Message Seller</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  postedText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  actionBtnActive: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  actionText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#f6f6f8',
    borderRadius: 12,
    padding: 8,
  },
  msgInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0d121b',
  },
  msgSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
  },
  msgSendText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  activeText: { fontSize: 12, color: '#10b981', fontWeight: '700' },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewAll: { fontSize: 13, color: PRIMARY, fontWeight: '800' },
  body: { padding: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d121b',
    flex: 1,
    marginRight: 8,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d121b',
    marginBottom: 10,
  },
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
  sellerMeta: { fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 3 },
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
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0ebff',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    height: 52,
    borderRadius: 14,
  },
  callBtnText: { color: PRIMARY, fontSize: 14, fontWeight: '800', lineHeight: 16 },
  callBtnPhone: { color: PRIMARY, fontSize: 11, fontWeight: '700', opacity: 0.8 },
  messageBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AMBER,
    height: 52,
    borderRadius: 14,
  },
  messageBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Similar ads
  simCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  simImg: { width: '100%', height: 110 },
  simImgPlaceholder: {
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBody: { padding: 10 },
  simTitle: { fontSize: 13, fontWeight: '700', color: '#0d121b' },
  simPrice: { fontSize: 13, fontWeight: '800', color: PRIMARY, marginTop: 2 },
  simMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  simMetaText: { fontSize: 11, color: '#94a3b8', flex: 1 },
});
