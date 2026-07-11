// Dedicated listing page for one pet category (Dogs, Cats, ...).
//
// Reached from the Home page's category chips (and from PetDetail's
// "View All <breed>" shortcut, which pre-applies a breed filter).
//
//  - Tapping the search bar opens a breed dropdown for this category;
//    typing narrows the breed list AND searches titles.
//  - The filter sheet adds Gender / Breed / Location on top of the
//    existing Sort + Price options. All filters combine (AND).
//  - Tapping the "Talash" heading returns to the Home page.

import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppDrawer from '../components/AppDrawer';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PetCategoryChip from '../components/PetCategoryChip';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';
import { BREEDS } from '../lib/breeds';

const PRIMARY = '#2C097F';

const CATEGORIES = [
  { key: 'all',      label: 'All Pets' },
  { key: 'dogs',     label: 'Dogs'     },
  { key: 'cats',     label: 'Cats'     },
  { key: 'birds',    label: 'Birds'    },
  { key: 'rabbits',  label: 'Rabbits'  },
  { key: 'fish',     label: 'Fish'     },
  { key: 'reptiles', label: 'Reptiles' },
];


export default function CategoryListingScreen({ navigation, route }) {
  const { token } = useAuth();
  const [category, setCategory] = useState(route.params?.category || 'dogs');

  const [listings, setListings]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites]   = useState(new Set());

  const [search, setSearch]           = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  // Upfront quick-filter bar: which inline panel is expanded.
  const [quickPanel, setQuickPanel] = useState(null); // null | 'breed' | 'gender' | 'price'
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [quickBreedSearch, setQuickBreedSearch] = useState('');
  const [filters, setFilters] = useState(() =>
    route.params?.breed ? { breed: route.params.breed } : {},
  );

  const label = CATEGORIES.find(c => c.key === category)?.label || 'Pets';
  const breeds = BREEDS[category] || [];

  // Breed dropdown suggestions: narrow by whatever is typed in the search bar.
  const breedSuggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? breeds.filter(b => b.toLowerCase().includes(term)) : breeds;
  }, [breeds, search]);

  // Quick-filter breed dropdown list, filtered in real time as the user
  // types. NOTE: must come after `breeds` is defined above.
  const quickBreeds = useMemo(() => {
    const term = quickBreedSearch.trim().toLowerCase();
    return term ? breeds.filter(b => b.toLowerCase().includes(term)) : breeds;
  }, [breeds, quickBreedSearch]);

  // If we're re-navigated with a new category/breed (e.g. from PetDetail).
  useEffect(() => {
    const p = route?.params;
    if (!p) return;
    if (p.category && p.category !== category) {
      setCategory(p.category);
      setFilters(p.breed ? { breed: p.breed } : {});
      setSearch('');
    } else if (p.breed) {
      setFilters(prev => ({ ...prev, breed: p.breed }));
    }
    navigation.setParams({ category: undefined, breed: undefined });
  }, [route?.params?.category, route?.params?.breed]);

  // Debounced title search
  const searchTimer = useRef(null);
  const [apiSearch, setApiSearch] = useState('');
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setApiSearch(search.trim()), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchListings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.fetchListings({
        limit: 60,
        category,
        search:   apiSearch || undefined,
        breed:    filters.breed  || undefined,
        gender:   filters.gender || undefined,
        city:     filters.city   || undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort:     filters.sort,
      });
      setListings(data.listings || []);
      setTotal(data.total || 0);
    } catch {
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, apiSearch, filters]);

  const fetchFavorites = useCallback(async () => {
    if (!token) return;
    try {
      const favs = await api.fetchFavorites();
      setFavorites(new Set((favs || []).map(f => f.listing?.id).filter(Boolean)));
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);
  useFocusEffect(useCallback(() => { fetchListings(true); fetchFavorites(); }, [fetchListings, fetchFavorites]));

  const onRefresh = () => { setRefreshing(true); fetchListings(true); };

  const toggleFavorite = useCallback(async (listingId) => {
    if (!token) { navigation.navigate('Login'); return; }
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(listingId) ? next.delete(listingId) : next.add(listingId);
      return next;
    });
    try { await api.toggleFavorite(listingId); } catch { fetchFavorites(); }
  }, [token, fetchFavorites]);

  const setFilter    = (key, value) => setFilters(p => ({ ...p, [key]: value }));
  const removeFilter = (key) => setFilters(p => { const n = { ...p }; delete n[key]; return n; });

  const selectBreed = (breed) => {
    setFilter('breed', breed);
    setSearch('');
    setSearchFocused(false);
  };

  // This screen sits inside the tab navigator, so tab screens (Home,
  // Favorites, ...) are siblings and stack screens (PostListing, ...)
  // resolve by bubbling up to the root stack.
  const goHome = () => navigation.navigate('Home');

  const handleMenuNav = (screen) => {
    navigation.navigate(screen || 'Home');
  };

  // Sync the price panel's inputs with applied filters when it opens,
  // and start the breed panel with an empty search each time.
  useEffect(() => {
    if (quickPanel === 'price') {
      setPriceMin(filters.minPrice || '');
      setPriceMax(filters.maxPrice || '');
    }
    if (quickPanel === 'breed') setQuickBreedSearch('');
  }, [quickPanel]);

  const hasFilters = !!(filters.breed || filters.gender || filters.city ||
                        filters.minPrice || filters.maxPrice || filters.sort);

  const renderCard = (item, index) => (
    <ListingCard
      key={item.id}
      listing={item}
      isFavorited={favorites.has(item.id)}
      onFavorite={() => toggleFavorite(item.id)}
      onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
      style={{ width: '48%', marginLeft: index % 2 === 0 ? 0 : '4%' }}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Burger menu — listing pages are top-level screens, not sub-pages */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setDrawerOpen(true)}
          >
            <MaterialIcons name="menu" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Tapping the app name always returns to the Home page */}
          <TouchableOpacity onPress={goHome} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
            <Text style={styles.appName}>Talash</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications-none" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search + filter row */}
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <MaterialIcons name="search" size={20} color="#94a3b8" />
            <TextInput
              placeholder={`Search ${label.toLowerCase()} or pick a breed...`}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              returnKeyType="search"
              onSubmitEditing={() => setSearchFocused(false)}
            />
            {(search.length > 0 || searchFocused) && (
              <TouchableOpacity onPress={() => { setSearch(''); setSearchFocused(false); }}>
                <MaterialIcons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, hasFilters && styles.filterBtnActive]}
            onPress={() => setFilterVisible(true)}
          >
            <MaterialIcons name="tune" size={22} color={PRIMARY} />
            {hasFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Side drawer ── */}
      <AppDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleMenuNav}
      />

      {/* ── Breed dropdown (appears when the search bar is focused) ── */}
      {searchFocused && breeds.length > 0 && (
        <View style={styles.breedPanel}>
          <View style={styles.breedPanelHeader}>
            <Text style={styles.breedPanelTitle}>Filter {label} by breed</Text>
            <TouchableOpacity onPress={() => setSearchFocused(false)}>
              <MaterialIcons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
            {breedSuggestions.map(b => (
              <TouchableOpacity key={b} style={styles.breedItem} onPress={() => selectBreed(b)}>
                <MaterialIcons name="pets" size={16} color={PRIMARY} />
                <Text style={styles.breedItemText}>{b}</Text>
                {filters.breed === b && <MaterialIcons name="check" size={18} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
            {breedSuggestions.length === 0 && (
              <Text style={styles.breedEmpty}>No breeds match "{search}"</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Category chips (switch listing page / back to Home) ── */}
      <View style={styles.categoriesWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map(cat => (
            <PetCategoryChip
              key={cat.key}
              category={cat.key}
              label={cat.label}
              active={category === cat.key}
              onPress={() => {
                if (cat.key === 'all') { goHome(); return; }
                if (cat.key !== category) {
                  setCategory(cat.key);
                  setFilters({});
                  setSearch('');
                }
              }}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Upfront quick filters: Breed / Gender / Price ── */}
      <View style={styles.quickBar}>
        <QuickFilterBtn
          icon="pets"
          label={filters.breed || 'Breed'}
          applied={!!filters.breed}
          open={quickPanel === 'breed'}
          onPress={() => setQuickPanel(p => (p === 'breed' ? null : 'breed'))}
        />
        <QuickFilterBtn
          icon="wc"
          label={filters.gender ? (filters.gender === 'male' ? 'Male' : 'Female') : 'Gender'}
          applied={!!filters.gender}
          open={quickPanel === 'gender'}
          onPress={() => setQuickPanel(p => (p === 'gender' ? null : 'gender'))}
        />
        <QuickFilterBtn
          icon="payments"
          label={
            filters.minPrice || filters.maxPrice
              ? `${filters.minPrice ? Number(filters.minPrice).toLocaleString('en-PK') : '0'}–${filters.maxPrice ? Number(filters.maxPrice).toLocaleString('en-PK') : 'Any'}`
              : 'Price'
          }
          applied={!!(filters.minPrice || filters.maxPrice)}
          open={quickPanel === 'price'}
          onPress={() => setQuickPanel(p => (p === 'price' ? null : 'price'))}
        />
      </View>

      {/* Inline quick-filter panels */}
      {quickPanel === 'breed' && (
        <View style={styles.quickPanel}>
          {/* Search inside the dropdown — filters the list as you type */}
          <View style={styles.quickBreedSearchWrap}>
            <View style={styles.breedSearchBox}>
              <MaterialIcons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.breedSearchInput}
                placeholder="Search breed..."
                placeholderTextColor="#94a3b8"
                value={quickBreedSearch}
                onChangeText={setQuickBreedSearch}
                autoFocus
                autoCorrect={false}
              />
              {quickBreedSearch.length > 0 && (
                <TouchableOpacity onPress={() => setQuickBreedSearch('')}>
                  <MaterialIcons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {quickBreeds.map(b => (
              <TouchableOpacity
                key={b}
                style={styles.breedItem}
                onPress={() => {
                  setFilters(p => (p.breed === b
                    ? (() => { const n = { ...p }; delete n.breed; return n; })()
                    : { ...p, breed: b }));
                  setQuickPanel(null);
                }}
              >
                <MaterialIcons name="pets" size={16} color={PRIMARY} />
                <Text style={styles.breedItemText}>{b}</Text>
                {filters.breed === b && <MaterialIcons name="check" size={18} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
            {quickBreeds.length === 0 && (
              <Text style={styles.breedEmpty}>No breeds found</Text>
            )}
          </ScrollView>
        </View>
      )}

      {quickPanel === 'gender' && (
        <View style={[styles.quickPanel, styles.quickPanelPad]}>
          <View style={styles.chipRow}>
            {[{ key: 'male', label: 'Male', icon: 'male' }, { key: 'female', label: 'Female', icon: 'female' }].map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.choiceChip, filters.gender === g.key && styles.choiceChipActive]}
                onPress={() => {
                  setFilters(p => (p.gender === g.key
                    ? (() => { const n = { ...p }; delete n.gender; return n; })()
                    : { ...p, gender: g.key }));
                  setQuickPanel(null);
                }}
              >
                <MaterialIcons
                  name={g.icon}
                  size={16}
                  color={filters.gender === g.key ? PRIMARY : '#64748b'}
                />
                <Text style={[styles.choiceChipText, filters.gender === g.key && styles.choiceChipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {quickPanel === 'price' && (
        <View style={[styles.quickPanel, styles.quickPanelPad]}>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceLabel}>Min</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="PKR 0"
                keyboardType="numeric"
                value={priceMin}
                onChangeText={setPriceMin}
              />
            </View>
            <View style={styles.priceDash} />
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceLabel}>Max</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Any"
                keyboardType="numeric"
                value={priceMax}
                onChangeText={setPriceMax}
              />
            </View>
            <TouchableOpacity
              style={styles.priceApplyBtn}
              onPress={() => {
                setFilters(p => {
                  const n = { ...p };
                  if (priceMin) n.minPrice = priceMin; else delete n.minPrice;
                  if (priceMax) n.maxPrice = priceMax; else delete n.maxPrice;
                  return n;
                });
                setQuickPanel(null);
              }}
            >
              <Text style={styles.priceApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Listings ── */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.resultsBar}>
            <Text style={styles.resultsTitle}>{label}</Text>
            <Text style={styles.resultsCount}>{total} listing{total !== 1 ? 's' : ''}</Text>
          </View>

          {/* Active filter pills */}
          {hasFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {filters.breed && (
                <FilterPill label={filters.breed} onRemove={() => removeFilter('breed')} />
              )}
              {filters.gender && (
                <FilterPill
                  label={filters.gender === 'male' ? 'Male' : 'Female'}
                  onRemove={() => removeFilter('gender')}
                />
              )}
              {filters.city && (
                <FilterPill label={filters.city} onRemove={() => removeFilter('city')} />
              )}
              {filters.sort && (
                <FilterPill
                  label={filters.sort === 'price_asc' ? 'Price ↑' : filters.sort === 'price_desc' ? 'Price ↓' : 'Newest'}
                  onRemove={() => removeFilter('sort')}
                />
              )}
              {filters.minPrice && (
                <FilterPill
                  label={`Min PKR ${Number(filters.minPrice).toLocaleString('en-PK')}`}
                  onRemove={() => removeFilter('minPrice')}
                />
              )}
              {filters.maxPrice && (
                <FilterPill
                  label={`Max PKR ${Number(filters.maxPrice).toLocaleString('en-PK')}`}
                  onRemove={() => removeFilter('maxPrice')}
                />
              )}
              <TouchableOpacity onPress={() => setFilters({})}>
                <Text style={styles.clearAll}>Clear all</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {listings.length === 0 ? (
            <EmptyState
              icon="search"
              title={`No ${label.toLowerCase()} found`}
              message={
                search || hasFilters
                  ? 'Try adjusting your search or filters'
                  : `Be the first to list a ${label.toLowerCase().replace(/s$/, '')}!`
              }
              ctaLabel={search || hasFilters ? 'Clear filters' : 'Post a Listing'}
              onCta={() => {
                if (search || hasFilters) { setSearch(''); setFilters({}); }
                else navigation.navigate('PostListing');
              }}
            />
          ) : (
            <View style={styles.grid}>
              {Array.from({ length: Math.ceil(listings.length / 2) }).map((_, rowIdx) => (
                <View key={rowIdx} style={styles.row}>
                  {listings[rowIdx * 2]     && renderCard(listings[rowIdx * 2], rowIdx * 2)}
                  {listings[rowIdx * 2 + 1] && renderCard(listings[rowIdx * 2 + 1], rowIdx * 2 + 1)}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Filter sheet ── */}
      {filterVisible && (
        <CategoryFilterSheet
          visible={filterVisible}
          filters={filters}
          breeds={breeds}
          onApply={f => { setFilters(f); setFilterVisible(false); }}
          onClose={() => setFilterVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ── Quick filter button (upfront bar) ─────────────────────────────────────────
function QuickFilterBtn({ icon, label, applied, open, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.quickBtn, (applied || open) && styles.quickBtnActive]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={15} color={applied || open ? PRIMARY : '#64748b'} />
      <Text
        style={[styles.quickBtnText, (applied || open) && styles.quickBtnTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <MaterialIcons
        name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
        size={18}
        color={applied || open ? PRIMARY : '#94a3b8'}
      />
    </TouchableOpacity>
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

// ── Filter bottom sheet: Sort / Gender / Breed / Location / Price ────────────
function CategoryFilterSheet({ visible, filters, breeds, onApply, onClose }) {
  const [local, setLocal] = useState(filters);
  const [breedSearch, setBreedSearch] = useState('');

  const SORTS = [
    { key: 'newest',     label: 'Newest First'      },
    { key: 'price_asc',  label: 'Price: Low → High' },
    { key: 'price_desc', label: 'Price: High → Low' },
  ];

  const toggle = (key, value) =>
    setLocal(p => ({ ...p, [key]: p[key] === value ? undefined : value }));

  const visibleBreeds = breedSearch.trim()
    ? breeds.filter(b => b.toLowerCase().includes(breedSearch.trim().toLowerCase()))
    : breeds;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter & Sort</Text>

          <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
            {/* Gender */}
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.chipRow}>
              {[{ key: 'male', label: 'Male', icon: 'male' }, { key: 'female', label: 'Female', icon: 'female' }].map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.choiceChip, local.gender === g.key && styles.choiceChipActive]}
                  onPress={() => toggle('gender', g.key)}
                >
                  <MaterialIcons
                    name={g.icon}
                    size={16}
                    color={local.gender === g.key ? PRIMARY : '#64748b'}
                  />
                  <Text style={[styles.choiceChipText, local.gender === g.key && styles.choiceChipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Breed */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Breed</Text>
            <View style={styles.breedSearchBox}>
              <MaterialIcons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.breedSearchInput}
                placeholder="Search breed..."
                placeholderTextColor="#94a3b8"
                value={breedSearch}
                onChangeText={setBreedSearch}
              />
            </View>
            <View style={styles.breedChips}>
              {visibleBreeds.map(b => (
                <TouchableOpacity
                  key={b}
                  style={[styles.choiceChip, local.breed === b && styles.choiceChipActive]}
                  onPress={() => toggle('breed', b)}
                >
                  <Text style={[styles.choiceChipText, local.breed === b && styles.choiceChipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Location / Area</Text>
            <View style={styles.breedSearchBox}>
              <MaterialIcons name="place" size={18} color="#94a3b8" />
              <TextInput
                style={styles.breedSearchInput}
                placeholder="e.g. Karachi, Lahore, DHA..."
                placeholderTextColor="#94a3b8"
                value={local.city || ''}
                onChangeText={v => setLocal(p => ({ ...p, city: v || undefined }))}
              />
            </View>

            {/* Sort */}
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Sort By</Text>
            <View style={styles.chipRow}>
              {SORTS.map(s => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.choiceChip, local.sort === s.key && styles.choiceChipActive]}
                  onPress={() => toggle('sort', s.key)}
                >
                  <Text style={[styles.choiceChipText, local.sort === s.key && styles.choiceChipTextActive]}>
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
                  onChangeText={v => setLocal(p => ({ ...p, minPrice: v || undefined }))}
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
                  onChangeText={v => setLocal(p => ({ ...p, maxPrice: v || undefined }))}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={() => { setLocal({}); onApply({}); }}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                const clean = Object.fromEntries(
                  Object.entries(local).filter(([, v]) => v !== undefined && v !== ''),
                );
                onApply(clean);
              }}
            >
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
  appName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  // Breed dropdown panel
  breedPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 10,
  },
  breedPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  breedPanelTitle: { fontSize: 13, fontWeight: '800', color: '#0d121b' },
  breedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  breedItemText: { flex: 1, fontSize: 14, color: '#0d121b' },
  breedEmpty: { padding: 16, fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  categoriesWrap: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoriesScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },

  // Upfront quick-filter bar
  quickBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  quickBtnActive:     { borderColor: PRIMARY, backgroundColor: '#f0ebff' },
  quickBtnText:       { flexShrink: 1, fontSize: 12, fontWeight: '700', color: '#64748b' },
  quickBtnTextActive: { color: PRIMARY },
  quickPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    zIndex: 5,
  },
  quickPanelPad: { paddingHorizontal: 16, paddingVertical: 12 },
  quickBreedSearchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  priceApplyBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  priceApplyText: { color: '#fff', fontSize: 13, fontWeight: '800' },

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

  grid: { paddingHorizontal: 16, paddingTop: 8 },
  row:  { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 14 },

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
  sheetTitle:   { fontSize: 19, fontWeight: '800', color: '#0d121b', marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  choiceChipActive:     { borderColor: PRIMARY, backgroundColor: '#f0ebff' },
  choiceChipText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  choiceChipTextActive: { color: PRIMARY },

  breedSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f6f6f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  breedSearchInput: { flex: 1, fontSize: 14, color: '#0d121b' },
  breedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, maxHeight: 130, overflow: 'hidden' },

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

  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
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
