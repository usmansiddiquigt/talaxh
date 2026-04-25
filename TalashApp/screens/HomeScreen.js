import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { LinearGradient } from 'expo-linear-gradient';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PetCategoryChip from '../components/PetCategoryChip';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';
const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(300, SCREEN_W * 0.78);

const MENU_ITEMS = [
  { icon: 'home',                label: 'Home',           screen: null        },
  { icon: 'post-add',            label: 'Post a Listing', screen: 'PostListing' },
  { icon: 'list-alt',            label: 'My Listings',    screen: 'MyListings'  },
  { icon: 'favorite-border',     label: 'Saved Pets',     screen: 'Favorites'   },
  { icon: 'chat-bubble-outline', label: 'Messages',       screen: 'Messages'    },
  { icon: 'person-outline',      label: 'Account',        screen: 'Account'     },
];

const CATEGORIES = [
  { key: 'all',        label: 'All Pets'   },
  { key: 'dogs',       label: 'Dogs'       },
  { key: 'cats',       label: 'Cats'       },
  { key: 'birds',      label: 'Birds'      },
  { key: 'rabbits',    label: 'Rabbits'    },
  { key: 'fish',       label: 'Fish'       },
  { key: 'reptiles',   label: 'Reptiles'   },
  { key: 'small-pets', label: 'Small Pets' },
];

export default function HomeScreen({ navigation, route }) {
  const { token } = useAuth();

  const [listings, setListings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [favorites, setFavorites]         = useState(new Set());
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters]             = useState({});
  const [total, setTotal]                 = useState(0);

  // Drawer
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const drawerAnim                        = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim                       = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  };
  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim,  { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0,         duration: 220, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };
  const handleMenuNav = (screen) => {
    closeDrawer();
    if (!screen) return;
    setTimeout(() => navigation.navigate(screen), 240);
  };

  // Apply incoming route params (e.g. View All from PetDetail)
  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.category) setActiveCategory(p.category);
    if (p.breed)    setSearch(p.breed);
    else if (p.search) setSearch(p.search);
    navigation.setParams({ category: undefined, breed: undefined, search: undefined });
  }, [route?.params?.category, route?.params?.breed, route?.params?.search]);

  // Debounce: only hit API 400ms after user stops typing
  const searchTimer = useRef(null);
  const [apiSearch, setApiSearch] = useState('');
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setApiSearch(search.trim()), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ── Fetch listings ────────────────────────────────────────────────────────
  const fetchListings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60' });
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (apiSearch)        params.set('search',   apiSearch);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.sort)     params.set('sort',     filters.sort);

      const res  = await fetch(`${API_URL}/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotal(data.total   || 0);
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory, apiSearch, filters]);

  // ── Fetch favorites (only when logged in) ────────────────────────────────
  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const ids  = new Set(
        (data.favorites || []).map(f => f.listing?.id).filter(Boolean)
      );
      setFavorites(ids);
    } catch { /* ignore */ }
  }, [token]);

  // Re-fetch whenever filters / category / search change
  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  // Silently refresh whenever screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      fetchListings(true);
      fetchFavorites();
    }, [fetchListings, fetchFavorites])
  );

  const onRefresh = () => { setRefreshing(true); fetchListings(true); };

  // ── Favorite toggle ───────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (listingId) => {
    if (!token) { navigation.navigate('Login'); return; }
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(listingId) ? next.delete(listingId) : next.add(listingId);
      return next;
    });
    try {
      await fetch(`${API_URL}/favorites/${listingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { fetchFavorites(); }
  }, [token]);

  // ── Render card ───────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item, index }) => (
    <ListingCard
      listing={item}
      isFavorited={favorites.has(item.id)}
      onFavorite={() => toggleFavorite(item.id)}
      onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
      style={{ width: '48%', marginLeft: index % 2 === 0 ? 0 : '4%' }}
    />
  ), [favorites, toggleFavorite]);

  const activeLabel = CATEGORIES.find(c => c.key === activeCategory)?.label ?? 'All Pets';
  const hasFilters  = !!(filters.minPrice || filters.maxPrice || filters.sort);

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={openDrawer}>
            <MaterialIcons name="menu" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.appName}>Talash</Text>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Account')}
          >
            <MaterialIcons name="person-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search + filter row */}
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
          {activeCategory !== 'all' && (
            <TouchableOpacity
              style={[styles.filterBtn, hasFilters && styles.filterBtnActive]}
              onPress={() => setFilterVisible(true)}
            >
              <MaterialIcons name="tune" size={22} color={PRIMARY} />
              {hasFilters && <View style={styles.filterDot} />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Side drawer ── */}
      {drawerOpen && (
        <>
          <Animated.View
            style={[styles.drawerOverlay, { opacity: overlayAnim }]}
            pointerEvents={drawerOpen ? 'auto' : 'none'}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
          </Animated.View>

          <Animated.View
            style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerAvatar}>
                <MaterialIcons name="pets" size={26} color="#fff" />
              </View>
              <Text style={styles.drawerTitle}>Talash</Text>
              <Text style={styles.drawerSub}>Find your perfect pet</Text>
            </View>

            <View style={styles.drawerList}>
              {MENU_ITEMS.map(item => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.drawerItem}
                  onPress={() => handleMenuNav(item.screen)}
                >
                  <MaterialIcons name={item.icon} size={22} color={PRIMARY} />
                  <Text style={styles.drawerItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </>
      )}

      {/* ── Hero banner (only on "All Pets") ── */}
      {activeCategory === 'all' && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('PostListing')}
          style={styles.bannerWrap}
        >
          <LinearGradient
            colors={['#2C097F', '#5B21B6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerPaw1}>
              <MaterialIcons name="pets" size={22} color="rgba(255,255,255,0.15)" />
            </View>
            <View style={styles.bannerPaw2}>
              <MaterialIcons name="pets" size={16} color="rgba(255,255,255,0.18)" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.bannerEyebrow}>WELCOME TO TALASH</Text>
              <Text style={styles.bannerTitle}>Find Your Perfect{'\n'}Companion</Text>
              <Text style={styles.bannerSub}>Thousands of loving pets waiting for a home</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>Post a Listing</Text>
                <MaterialIcons name="arrow-forward" size={14} color={PRIMARY} />
              </View>
            </View>

            <View style={styles.bannerIconWrap}>
              <MaterialIcons name="pets" size={96} color="rgba(255,255,255,0.22)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Category chips ── */}
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

      {/* ── Results bar ── */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsTitle}>{activeLabel}</Text>
        <Text style={styles.resultsCount}>{total} listing{total !== 1 ? 's' : ''}</Text>
      </View>

      {/* ── Active filter pills ── */}
      {hasFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          {filters.sort && (
            <FilterPill
              label={filters.sort === 'price_asc' ? 'Price ↑' : filters.sort === 'price_desc' ? 'Price ↓' : 'Newest'}
              onRemove={() => setFilters(p => { const n = { ...p }; delete n.sort; return n; })}
            />
          )}
          {filters.minPrice && (
            <FilterPill
              label={`Min PKR ${Number(filters.minPrice).toLocaleString('en-PK')}`}
              onRemove={() => setFilters(p => { const n = { ...p }; delete n.minPrice; return n; })}
            />
          )}
          {filters.maxPrice && (
            <FilterPill
              label={`Max PKR ${Number(filters.maxPrice).toLocaleString('en-PK')}`}
              onRemove={() => setFilters(p => { const n = { ...p }; delete n.maxPrice; return n; })}
            />
          )}
          <TouchableOpacity onPress={() => setFilters({})}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Listing grid ── */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={listings}
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
              message={
                search || hasFilters
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to list a pet in this category!'
              }
              ctaLabel={search || hasFilters ? 'Clear filters' : 'Post a Listing'}
              onCta={() => {
                if (search || hasFilters) {
                  setSearch('');
                  setActiveCategory('all');
                  setFilters({});
                } else {
                  navigation.navigate('PostListing');
                }
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Filter sheet ── */}
      {filterVisible && (
        <FilterSheet
          visible={filterVisible}
          filters={filters}
          onApply={f => { setFilters(f); setFilterVisible(false); }}
          onClose={() => setFilterVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Filter pill chip ──────────────────────────────────────────────────────────
function FilterPill({ label, onRemove }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <MaterialIcons name="close" size={14} color={PRIMARY} />
      </TouchableOpacity>
    </View>
  );
}

// ── Filter bottom sheet ───────────────────────────────────────────────────────
function FilterSheet({ visible, filters, onApply, onClose }) {
  const [local, setLocal] = useState(filters);

  const SORTS = [
    { key: 'newest',     label: 'Newest First'       },
    { key: 'price_asc',  label: 'Price: Low → High'  },
    { key: 'price_desc', label: 'Price: High → Low'  },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter & Sort</Text>

          {/* Sort */}
          <Text style={styles.sectionLabel}>Sort By</Text>
          <View style={styles.sortRow}>
            {SORTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.sortChip, local.sort === s.key && styles.sortChipActive]}
                onPress={() => setLocal(p => ({ ...p, sort: local.sort === s.key ? undefined : s.key }))}
              >
                <Text style={[styles.sortChipText, local.sort === s.key && styles.sortChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price range */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Price Range</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceLabel}>Min</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="PKR 0"
                keyboardType="numeric"
                value={local.minPrice || ''}
                onChangeText={v => setLocal(p => ({ ...p, minPrice: v }))}
              />
            </View>
            <View style={styles.priceDash} />
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceLabel}>Max</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Any"
                keyboardType="numeric"
                value={local.maxPrice || ''}
                onChangeText={v => setLocal(p => ({ ...p, maxPrice: v }))}
              />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => { setLocal({}); onApply({}); }}
            >
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(local)}>
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },

  // Header
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Drawer
  drawerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 20,
  },
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: DRAWER_W,
    backgroundColor: '#fff',
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 2, height: 0 },
    elevation: 10,
  },
  drawerHeader: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  drawerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  drawerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  drawerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  drawerList:  { paddingTop: 8 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  drawerItemText: { fontSize: 15, fontWeight: '600', color: '#0d121b' },

  // Hero banner
  bannerWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 18,
    shadowColor: '#2C097F',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  banner: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 24,
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    marginBottom: 12,
  },
  bannerCta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  bannerCtaText: { color: PRIMARY, fontWeight: '800', fontSize: 12 },
  bannerIconWrap: {
    position: 'absolute',
    right: -8,
    bottom: -12,
    transform: [{ rotate: '-12deg' }],
  },
  bannerPaw1: { position: 'absolute', top: 14, right: 24 },
  bannerPaw2: { position: 'absolute', top: 50, right: 80 },

  // Search
  searchRow: { flexDirection: 'row', gap: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: '#F4A724' },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // Categories
  categoriesWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoriesScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },

  // Results bar
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  resultsTitle: { fontSize: 16, fontWeight: '800', color: '#0d121b' },
  resultsCount: { fontSize: 13, color: '#94a3b8' },

  // Active filter pills
  pillsRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0ebff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  clearAll: { fontSize: 12, color: '#ef4444', fontWeight: '700', paddingHorizontal: 4 },

  // Grid
  grid: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  row:  { justifyContent: 'flex-start', marginBottom: 14 },

  // Filter sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle:   { fontSize: 19, fontWeight: '800', color: '#0d121b', marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },

  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  sortChipActive:     { borderColor: PRIMARY, backgroundColor: '#f0ebff' },
  sortChipText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  sortChipTextActive: { color: PRIMARY },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInputWrap: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 4 },
  priceInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0d121b',
  },
  priceDash: { width: 12, height: 2, backgroundColor: '#e2e8f0', marginTop: 16 },

  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 28 },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  applyBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
