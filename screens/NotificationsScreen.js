import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import * as api from '../lib/api';

const PRIMARY = '#2C097F';

const TYPE_META = {
  listing_posted:   { icon: 'check-circle',    color: '#10b981' },
  new_message:      { icon: 'chat-bubble',     color: PRIMARY   },
  listing_viewed:   { icon: 'visibility',      color: '#3b82f6' },
  listing_pending:  { icon: 'hourglass-empty', color: '#f59e0b' },
  listing_approved: { icon: 'check-circle',    color: '#10b981' },
  listing_rejected: { icon: 'cancel',          color: '#ef4444' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState('all'); // 'all' | 'unread' | 'read'

  const unreadCount = useMemo(() => items.filter(i => !i.is_read).length, [items]);
  const readCount   = items.length - unreadCount;
  const filtered    = useMemo(() => {
    if (filter === 'unread') return items.filter(i => !i.is_read);
    if (filter === 'read')   return items.filter(i =>  i.is_read);
    return items;
  }, [items, filter]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const list = await api.fetchNotifications();
      setItems(list || []);
      // Viewing this screen clears the bell badge: mark everything read in
      // the DB, but keep this visit's local unread styling so the user can
      // still see which items are new.
      if ((list || []).some(i => !i.is_read)) {
        api.markAllNotificationsRead().catch(() => {});
      }
    } catch { setItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => {
    fetchAll();
    // Clear the app-icon badge too — the user is looking at their alerts now.
    Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [fetchAll]));

  const handleTap = async (item) => {
    // Mark as read
    if (!item.is_read) {
      try { await api.markNotificationRead(item.id); } catch { /* ignore */ }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_read: true } : i));
    }
    // Navigate based on the data payload (same rule as push-tap routing in
    // lib/push.js): conversation notifications → chat, any listing-related
    // notification (approved / rejected / pending / viewed / posted) → ad.
    const d = item.data || {};
    if (d.conversation_id) {
      navigation.navigate('Conversation', { conversationId: d.conversation_id });
    } else if (d.listing_id) {
      navigation.navigate('PetDetail', { listingId: d.listing_id });
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems(prev => prev.map(i => ({ ...i, is_read: true })));
    } catch { /* ignore */ }
  };

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || { icon: 'notifications', color: '#94a3b8' };
    const unread = !item.is_read;
    return (
      <TouchableOpacity
        style={[styles.row, unread && styles.rowUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={0.85}
      >
        {unread && <View style={styles.unreadStripe} />}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '20' }]}>
          <MaterialIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.title, unread && styles.titleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.body ? (
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {unread && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  const hasUnread = unreadCount > 0;

  const TABS = [
    { key: 'all',    label: 'All',    count: items.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read',   label: 'Read',   count: readCount },
  ];

  const emptyTitle = filter === 'unread'
    ? 'No unread notifications'
    : filter === 'read'
      ? 'No read notifications yet'
      : 'No notifications yet';
  const emptyMsg = filter === 'unread'
    ? "You're all caught up!"
    : filter === 'read'
      ? 'Notifications you open will show up here.'
      : "You'll see activity on your listings and messages here.";

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.headerAction}>Read all</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => {
          const active = filter === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setFilter(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
                {t.count > 0 ? ` (${t.count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length ? { paddingVertical: 8 } : { flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(true); }}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-none"
              title={emptyTitle}
              message={emptyMsg}
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
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  headerAction: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowUnread: { backgroundColor: '#f0ebff' },
  unreadStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: PRIMARY,
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
  tabText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  tabTextActive: { color: PRIMARY },
  titleUnread: { fontWeight: '900', color: '#0d121b' },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: '#0d121b' },
  body:  { fontSize: 13, color: '#64748b', marginTop: 2 },
  time:  { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  dot:   {
    width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY,
  },
});
