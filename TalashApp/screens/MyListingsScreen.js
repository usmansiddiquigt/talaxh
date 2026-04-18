import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';
const TABS = ['active', 'draft', 'sold'];

function formatPrice(l) {
  if (l.is_free) return 'Free';
  if (l.is_adoption) return 'Adoption';
  if (l.price) return `$${Number(l.price).toLocaleString()}`;
  return 'POA';
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function MyListingsScreen({ navigation }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/my-listings?status=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, activeTab]);

  useEffect(() => { fetch_(); }, [fetch_]);
  const onRefresh = () => { setRefreshing(true); fetch_(true); };

  const handleDelete = (id) => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/listings/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            setListings(prev => prev.filter(l => l.id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete listing');
          }
        },
      },
    ]);
  };

  const handleMarkSold = async (id) => {
    try {
      await fetch(`${API_URL}/listings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'sold' }),
      });
      setListings(prev => prev.filter(l => l.id !== id));
    } catch {
      Alert.alert('Error', 'Could not update listing');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
      >
        {item.photos?.[0] ? (
          <Image source={{ uri: item.photos[0] }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <MaterialIcons name="pets" size={28} color="#cbd5e1" />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardPrice}>{formatPrice(item)}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="visibility" size={13} color="#94a3b8" />
              <Text style={styles.metaText}>{item.views_count || 0} views</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={13} color="#94a3b8" />
              <Text style={styles.metaText}>{timeAgo(item.created_at)}</Text>
            </View>
          </View>
          {item.status !== 'active' && (
            <Badge
              label={item.status.toUpperCase()}
              variant={item.status === 'sold' ? 'sold' : 'draft'}
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('PostListing', { listing: item })}
        >
          <MaterialIcons name="edit" size={16} color={PRIMARY} />
          <Text style={[styles.actionText, { color: PRIMARY }]}>Edit</Text>
        </TouchableOpacity>

        {activeTab === 'active' && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: '#10b981' }]}
            onPress={() => handleMarkSold(item.id)}
          >
            <MaterialIcons name="check-circle" size={16} color="#10b981" />
            <Text style={[styles.actionText, { color: '#10b981' }]}>Mark Sold</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: '#ef4444' }]}
          onPress={() => handleDelete(item.id)}
        >
          <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('PostListing')}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="post-add"
              title={`No ${activeTab} listings`}
              message="Your listings will appear here"
              ctaLabel="Post a Listing"
              onCta={() => navigation.navigate('PostListing')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0d121b' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: PRIMARY },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardMain: { flexDirection: 'row', padding: 12, gap: 12 },
  cardImg: { width: 88, height: 88, borderRadius: 10 },
  cardImgPlaceholder: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0d121b', lineHeight: 20 },
  cardPrice: { fontSize: 16, fontWeight: '800', color: PRIMARY, marginTop: 4 },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94a3b8' },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionText: { fontSize: 12, fontWeight: '600' },
});
