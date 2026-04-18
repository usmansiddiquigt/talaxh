import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EmptyState from '../components/EmptyState';
import ListingCard from '../components/ListingCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

export default function FavoritesScreen({ navigation }) {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async (silent = false) => {
    if (!token) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);
  const onRefresh = () => { setRefreshing(true); fetchFavorites(true); };

  const removeFavorite = async (listingId) => {
    setFavorites(prev => prev.filter(f => f.listing?.id !== listingId));
    try {
      await fetch(`${API_URL}/favorites/${listingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { fetchFavorites(true); }
  };

  const listings = favorites.map(f => f.listing).filter(Boolean);

  const renderItem = ({ item, index }) => (
    <ListingCard
      listing={item}
      isFavorited={true}
      onFavorite={() => removeFavorite(item.id)}
      onPress={() => navigation.navigate('PetDetail', { listingId: item.id })}
      style={{ width: '48%', marginLeft: index % 2 === 0 ? 0 : '4%' }}
    />
  );

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved Pets</Text>
        </View>
        <EmptyState
          icon="favorite-border"
          title="Sign in to see your favourites"
          message="Create an account to save pets you love"
          ctaLabel="Sign In"
          onCta={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Pets</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{listings.length}</Text>
        </View>
      </View>

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
              icon="favorite-border"
              title="No saved pets yet"
              message="Tap the heart icon on any listing to save it here"
              ctaLabel="Browse Pets"
              onCta={() => navigation.navigate('Home')}
            />
          }
          showsVerticalScrollIndicator={false}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0d121b' },
  badge: {
    backgroundColor: PRIMARY,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  grid: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: 'flex-start', marginBottom: 12 },
});
