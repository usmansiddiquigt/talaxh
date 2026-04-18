import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesScreen({ navigation }) {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!token) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  const onRefresh = () => { setRefreshing(true); fetchConversations(true); };

  const renderItem = ({ item }) => {
    const isBuyer = item.buyer_id === user?.id;
    const otherName = isBuyer
      ? item.seller?.full_name || 'Seller'
      : item.buyer?.full_name || 'Buyer';
    const listing = item.listing;
    const lastMsg = item.lastMessage;
    const unread = item.unreadCount || 0;
    const coverPhoto = listing?.photos?.[0];

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate('Conversation', {
            conversationId: item.id,
            listing,
          })
        }
        activeOpacity={0.85}
      >
        {/* Pet thumbnail */}
        <View style={styles.thumbWrap}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <MaterialIcons name="pets" size={20} color="#94a3b8" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.contentTop}>
            <Text style={styles.otherName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.time}>{timeAgo(lastMsg?.created_at)}</Text>
          </View>
          <Text style={styles.listingTitle} numberOfLines={1}>{listing?.title || 'Listing'}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg
              ? (lastMsg.sender_id === user?.id ? 'You: ' : '') + lastMsg.body
              : 'No messages yet'}
          </Text>
        </View>

        {/* Unread badge */}
        {unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <EmptyState
          icon="chat-bubble-outline"
          title="Sign in to view messages"
          ctaLabel="Sign In"
          onCta={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="chat-bubble-outline"
              title="No messages yet"
              message="When you contact a seller, the conversation will appear here"
              ctaLabel="Browse Pets"
              onCta={() => navigation.navigate('Home')}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0d121b' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  thumbWrap: { position: 'relative' },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  contentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otherName: { fontSize: 15, fontWeight: '700', color: '#0d121b', flex: 1 },
  time: { fontSize: 12, color: '#94a3b8' },
  listingTitle: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  lastMsg: { fontSize: 13, color: '#64748b' },
  unreadBadge: {
    backgroundColor: PRIMARY,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 80 },
});
