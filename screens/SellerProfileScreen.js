import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Badge from '../components/Badge';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

function memberSince(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function SellerProfileScreen({ navigation, route }) {
  const { sellerId } = route.params;
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/profile/${sellerId}`)
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile);
        setListings(d.listings || []);
      })
      .catch(() => Alert.alert('Error', 'Could not load profile'))
      .finally(() => setLoading(false));
  }, [sellerId]);

  const handleMessage = async () => {
    if (!token) { navigation.navigate('Login'); return; }
    if (sellerId === user?.id) { Alert.alert("That's your own profile"); return; }
    navigation.navigate('Messages');
  };

  if (loading) return <LoadingSpinner />;
  if (!profile) return null;

  const initials = (profile.full_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const ListHeader = () => (
    <View>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile.full_name || 'Seller'}</Text>
        {profile.location ? (
          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={14} color="#64748b" />
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>
        ) : null}
        <Text style={styles.memberSince}>Member since {memberSince(profile.created_at)}</Text>

        {/* Verification badges */}
        <View style={styles.badgeRow}>
          {profile.is_email_verified && (
            <Badge label="Email Verified" variant="verified" style={styles.badgeGap} />
          )}
          {profile.is_phone_verified && (
            <Badge label="Phone Verified" variant="verified" />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{listings.length}</Text>
            <Text style={styles.statLabel}>Active Ads</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {listings.reduce((sum, l) => sum + (l.views_count || 0), 0)}
            </Text>
            <Text style={styles.statLabel}>Total Views</Text>
          </View>
        </View>

        {/* Action button */}
        {sellerId !== user?.id && (
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
            <MaterialIcons name="chat-bubble-outline" size={18} color="#fff" />
            <Text style={styles.msgBtnText}>Send Message</Text>
          </TouchableOpacity>
        )}
      </View>

      {listings.length > 0 && (
        <Text style={styles.sectionTitle}>Active Listings ({listings.length})</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Seller Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        numColumns={2}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        renderItem={({ item, index }) => (
          <ListingCard
            listing={item}
            isFavorited={false}
            onFavorite={() => {}}
            onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
            style={{ width: '48%', marginLeft: index % 2 === 0 ? 0 : '4%' }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MaterialIcons name="pets" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No active listings</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f6f6f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#0d121b' },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#0d121b' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 14, color: '#64748b' },
  memberSince: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  badgeRow: { flexDirection: 'row', marginTop: 12 },
  badgeGap: { marginRight: 6 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    width: '70%',
    backgroundColor: '#f6f6f8',
    borderRadius: 14,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0d121b' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#F4A724',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  msgBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0d121b',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: 'flex-start', marginBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});
