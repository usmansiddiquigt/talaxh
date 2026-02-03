import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen({ navigation }) {
  const [tab, setTab] = useState('My Ads');

  const listings = useMemo(
    () => [
      {
        id: '1',
        title: 'iPhone 14 Pro - 128GB',
        price: '$850',
        metaIcon: 'visibility',
        metaText: '124 views',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDddnX8pXXFmYaxRrPjxM-2JPKDjCwdNXXvDL3OLiqqY_QYkwWv88eIZTVIJN6_9kuPfWML7noMNa7tI6aFsFxSepno3P7nTnZfM73pdKN6JykfIFzbE2rHOqLlim6Ydi_VIFGMgGRYUGsREG68VIG2QcDjYNgQGuLD8hshGRtFL8ppX0Nw3bj8qlLaZ7DIKOP42OdYDAvkKeBlmc8IcAgweFqDm6PY0Xacxsx0ysGwUq-TaEX0a1NbNjJ_hxR2UbaF7BZhoZuphIw',
        badge: null,
      },
      {
        id: '2',
        title: 'MacBook Air M2 Silver',
        price: '$1,100',
        metaIcon: 'visibility',
        metaText: '89 views',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDix9nGN6MRnW_gfEUDYeMth_OgwWXuhwB_gmo4jezBNg83kz7bo30ZQtZEuO07pFBVSMzcZtiDIwk0OR217wA_7IAHK3mEinH4NDDLZ2HAGURLmr7lOplMXSYTZPBCM7QuuXfxKmj3GqRcf61r_TSygH9A6Yy0-Qx0MdJ2N5SG0WPOkqPcv8-QSDj5LzjJQngfaxLhfIyVKB3zaGQWc3dxWkzV6AkZKl3yNKdc2lnUTe0P6GEIyR6QebTvAFq1yI0PVEWnoS4hGyM',
        badge: null,
      },
      {
        id: '3',
        title: 'Found: Car Keys (BMW)',
        price: null,
        metaIcon: 'location-on',
        metaText: 'Downtown Area',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuB-OGQWRsmnvJ_07nMY-Pb9CNkrKXNN4hTacftpakL90qa3VGb9XuR0uoGncKeRyZ2lFTgjIfVl1IPA4ihxp_rzs4rDPp9NDRMz_GI3s7ONugbctOEdItcz2sir7ymV80ujsXUYtnQW7Agl2he8KiRsW0fNVGfzbmK-k8DluPFUtp9VvMhl4MoINbeDPQNi0ezuxJ112RDLqe2PhtrxShagE4GX5U1cdhM_zYSS0JW4HNn_ED7sLIU_QCJPlBuoF1kRtZDw7w6-s3U',
        badge: 'MISSING ITEM',
      },
    ],
    [],
  );

  const stats = useMemo(
    () => [
      { label: 'Active Ads', value: '5' },
      { label: 'Total Views', value: '1.2k' },
    ],
    [],
  );

  const onEdit = (id) => alert(`Edit listing: ${id}`);
  const onDelete = (id) => alert(`Delete listing: ${id}`);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => navigation?.goBack?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name='arrow-back-ios' size={18} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Dashboard</Text>
        </View>

        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => alert('Settings')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name='settings' size={20} color={TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuyl1c5aeLb0tRAdAZyojkCJXGr2Qs3oVc9fmYL5zZx8pkMn-sT4ViEBHvJkD4fQP8BthMHfRZ37IN-TrnQaj7kp7iISYJASuZEbiO_CfzCnhf2YLeKgm6jve8g7e55VuyYomxDBel08SPgURtPQiTUSquSsMQg4ET9DrZX6vqGahHhAnO9aw4zxHGFCbo5JdVVCpvRuGCM6rSJoMyd2R34KmKo8u3KqV8bDQE5niWQ_5TsyqWTLHuCV3fpVCpp9ML6PRvGx3KKlw',
              }}
              style={styles.avatar}
            />
            <View style={styles.verifiedBadge}>
              <MaterialIcons name='verified' size={16} color='#fff' />
            </View>
          </View>

          <Text style={styles.name}>John Doe</Text>

          <View style={styles.subRow}>
            <Text style={styles.joined}>Joined: Oct 2023</Text>
            <View style={styles.bullet} />
            <Text style={styles.subMuted}>Verified User</Text>
          </View>

          <View style={styles.chipsRow}>
            <Chip icon='check-circle' text='Phone Verified' />
            <Chip icon='check-circle' text='Email Verified' />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrap}>
          <TabBtn
            title='My Ads'
            active={tab === 'My Ads'}
            onPress={() => setTab('My Ads')}
          />
          <TabBtn
            title='Messages'
            active={tab === 'Messages'}
            onPress={() => setTab('Messages')}
          />
          <TabBtn
            title='Alerts'
            active={tab === 'Alerts'}
            onPress={() => setTab('Alerts')}
          />
        </View>

        {/* Content */}
        <View style={styles.listWrap}>
          {tab !== 'My Ads' ? (
            <View style={styles.emptyState}>
              <MaterialIcons name='info-outline' size={22} color='#94a3b8' />
              <Text style={styles.emptyText}>
                {tab === 'Messages' ? 'No messages yet.' : 'No alerts yet.'}
              </Text>
            </View>
          ) : (
            listings.map((item) => (
              <View key={item.id} style={styles.listing}>
                <Image source={{ uri: item.image }} style={styles.listingImg} />

                <View style={{ flex: 1, justifyContent: 'space-between' }}>
                  <View>
                    <View style={styles.listingTopRow}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {item.title}
                      </Text>

                      {item.price ? (
                        <Text style={styles.price}>{item.price}</Text>
                      ) : item.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.metaRow}>
                      <MaterialIcons
                        name={item.metaIcon}
                        size={14}
                        color='#94a3b8'
                      />
                      <Text style={styles.metaText}>{item.metaText}</Text>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => onEdit(item.id)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.delBtn}
                      onPress={() => onDelete(item.id)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.delText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom Nav (UI only, same as HTML) */}
    </SafeAreaView>
  );
}

/* ---------------- Small Components ---------------- */

function Chip({ icon, text }) {
  return (
    <View style={styles.chip}>
      <MaterialIcons name={icon} size={16} color={SUCCESS} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function TabBtn({ title, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      activeOpacity={0.9}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function BottomItem({ icon, label, active }) {
  return (
    <View style={styles.bottomItem}>
      <MaterialIcons
        name={icon}
        size={24}
        color={active ? PRIMARY : '#94a3b8'}
      />
      <Text style={[styles.bottomText, active && { color: PRIMARY }]}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------- Theme ---------------- */

const PRIMARY = '#135bec';
const BG = '#f6f6f8';
const TEXT = '#0d121b';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: { paddingBottom: 120 },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BG,
  },
  name: { fontSize: 24, fontWeight: '900', color: TEXT },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  joined: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#94a3b8' },
  subMuted: { color: '#64748b', fontSize: 12, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.20)',
  },
  chipText: { fontSize: 12, fontWeight: '800', color: SUCCESS },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eef2f7',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: PRIMARY },

  tabsWrap: {
    marginTop: 14,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: PRIMARY },
  tabText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#64748b',
  },
  tabTextActive: { color: PRIMARY },

  listWrap: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },
  listing: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef2f7',
    flexDirection: 'row',
    gap: 12,
  },
  listingImg: { width: 96, height: 96, borderRadius: 14 },

  listingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  listingTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: TEXT },
  price: { fontSize: 12, fontWeight: '900', color: PRIMARY },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(19,91,236,0.10)',
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: PRIMARY },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: 11, fontWeight: '700', color: '#64748b' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 7,
    alignItems: 'center',
  },
  editText: { color: PRIMARY, fontSize: 12, fontWeight: '900' },
  delBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 999,
    paddingVertical: 7,
    alignItems: 'center',
  },
  delText: { color: DANGER, fontSize: 12, fontWeight: '900' },

  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { color: '#64748b', fontWeight: '800' },

  //   bottomNav: {
  //     position: 'absolute',
  //     left: 0,
  //     right: 0,
  //     bottom: 0,
  //     backgroundColor: 'rgba(255,255,255,0.95)',
  //     borderTopWidth: 1,
  //     borderColor: '#e5e7eb',
  //     paddingHorizontal: 24,
  //     paddingTop: 10,
  //     paddingBottom: 22,
  //     flexDirection: 'row',
  //     justifyContent: 'space-between',
  //     alignItems: 'flex-end',
  //   },
  //   bottomItem: { alignItems: 'center', gap: 4, width: 64 },
  bottomText: { fontSize: 10, fontWeight: '900', color: '#94a3b8' },

  sellWrap: { width: 64, alignItems: 'center' },
  sellBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: BG,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    marginBottom: 6,
  },
});
