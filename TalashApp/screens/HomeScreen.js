import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PetCategoryChip from '../components/PetCategoryChip';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

const CATEGORIES = [
  { key: 'all', label: 'All Pets' },
  { key: 'dogs', label: 'Dogs' },
  { key: 'cats', label: 'Cats' },
  { key: 'birds', label: 'Birds' },
  { key: 'rabbits', label: 'Rabbits' },
  { key: 'fish', label: 'Fish' },
  { key: 'reptiles', label: 'Reptiles' },
  { key: 'small-pets', label: 'Small Pets' },
];

const LOCATIONS = ['New York, NY', 'Brooklyn, NY', 'Queens, NY', 'Los Angeles, CA', 'Chicago, IL'];

export default function HomeScreen({ navigation }) {
  const { token, user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [location, setLocation] = useState('New York, NY');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({});

  const fetchListings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (search.trim()) params.set('search', search.trim());
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.sort) params.set('sort', filters.sort);

      const res = await fetch(`${API_URL}/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, search, filters]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const ids = new Set((data.favorites || []).map(f => f.listing?.id).filter(Boolean));
      setFavorites(ids);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const onRefresh = () => { setRefreshing(true); fetchListings(true); };

  const toggleFavorite = async (listingId) => {
    if (!token) { navigation.navigate('Login'); return; }
    const prev = new Set(favorites);
    if (prev.has(listingId)) prev.delete(listingId); else prev.add(listingId);
    setFavorites(prev);
    try {
      await fetch(`${API_URL}/favorites/${listingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { setFavorites(favorites); }
  };

  const displayedListings = useMemo(() => {
    if (!search.trim()) return listings;
    return listings.filter(l =>
      l.title?.toLowerCase().includes(search.toLowerCase()) ||
      l.breed?.toLowerCase().includes(search.toLowerCase())
    );
  }, [listings, search]);

  const renderItem = useCallback(({ item, index }) => (
    <ListingCard
      listing={item}
      isFavorited={favorites.has(item.id)}
      onFavorite={() => toggleFavorite(item.id)}
      onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
      style={{ width: '48%', marginLeft: index % 2 === 0 ? 0 : '4%' }}
    />
  ), [favorites]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.locationBtn} onPress={() => setShowLocationModal(true)}>
            <MaterialIcons name="place" size={16} color={PRIMARY} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Account')}
          >
            <MaterialIcons name="person-outline" size={24} color="#0d121b" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder="Search pets, breeds..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
            <MaterialIcons name="tune" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map(cat => (
            <PetCategoryChip
              key={cat.key}
              category={cat.key}
              label={cat.label}
              active={activeCategory === cat.key}
              onPress={() => setActiveCategory(cat.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Results header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {activeCategory === 'all' ? 'All Listings' : CATEGORIES.find(c => c.key === activeCategory)?.label}
        </Text>
        <Text style={styles.resultsCount}>{displayedListings.length} found</Text>
      </View>

      {/* Listings grid */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={displayedListings}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="No listings found"
              message="Try adjusting your search or filters"
              ctaLabel="Clear filters"
              onCta={() => { setSearch(''); setActiveCategory('all'); setFilters({}); }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLocationModal(false)}>
          <View style={styles.locationSheet}>
            <Text style={styles.sheetTitle}>Select Location</Text>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.locItem, location === loc && styles.locItemActive]}
                onPress={() => { setLocation(loc); setShowLocationModal(false); }}
              >
                <MaterialIcons name="place" size={18} color={location === loc ? PRIMARY : '#64748b'} />
                <Text style={[styles.locText, location === loc && { color: PRIMARY, fontWeight: '700' }]}>
                  {loc}
                </Text>
                {location === loc && <MaterialIcons name="check" size={18} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Modal (imported separately) */}
      {filterVisible && (
        <FilterSheet
          visible={filterVisible}
          filters={filters}
          onApply={(f) => { setFilters(f); setFilterVisible(false); }}
          onClose={() => setFilterVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// Inline simple filter sheet (full FilterModal is in FilterModal.js)
function FilterSheet({ visible, filters, onApply, onClose }) {
  const [local, setLocal] = useState(filters);
  const SORTS = [
    { key: 'newest', label: 'Newest first' },
    { key: 'price_asc', label: 'Price: Low to High' },
    { key: 'price_desc', label: 'Price: High to Low' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.filterSheet}>
          <Text style={styles.sheetTitle}>Filters</Text>

          <Text style={styles.filterLabel}>Sort By</Text>
          {SORTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.locItem, local.sort === s.key && styles.locItemActive]}
              onPress={() => setLocal(p => ({ ...p, sort: s.key }))}
            >
              <Text style={[styles.locText, local.sort === s.key && { color: PRIMARY, fontWeight: '700' }]}>
                {s.label}
              </Text>
              {local.sort === s.key && <MaterialIcons name="check" size={18} color={PRIMARY} />}
            </TouchableOpacity>
          ))}

          <Text style={[styles.filterLabel, { marginTop: 16 }]}>Price Range</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min $"
              keyboardType="numeric"
              value={local.minPrice || ''}
              onChangeText={v => setLocal(p => ({ ...p, minPrice: v }))}
            />
            <Text style={{ color: '#94a3b8' }}>—</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max $"
              keyboardType="numeric"
              value={local.maxPrice || ''}
              onChangeText={v => setLocal(p => ({ ...p, maxPrice: v }))}
            />
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={() => { setLocal({}); onApply({}); }}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(local)}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '70%' },
  locationText: { fontSize: 14, fontWeight: '700', color: '#0d121b', flex: 1 },
  notifBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f6f6f8', alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f6f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0d121b' },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  categoriesScroll: { paddingHorizontal: 16, paddingVertical: 10 },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsTitle: { fontSize: 16, fontWeight: '700', color: '#0d121b' },
  resultsCount: { fontSize: 13, color: '#94a3b8' },
  grid: { paddingHorizontal: 16, paddingBottom: 100 },
  row: { justifyContent: 'flex-start', marginBottom: 12 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  locationSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0d121b', marginBottom: 16 },
  filterLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  locItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locItemActive: { backgroundColor: '#f5f3ff' },
  locText: { flex: 1, fontSize: 15, color: '#0d121b' },
  priceRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0d121b',
  },
  filterActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
