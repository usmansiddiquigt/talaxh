import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = '#2C097F';
const STORAGE_KEY = '@talash_privacy_settings';

const DEFAULTS = {
  profileVisible:    true,   // Show profile to other users
  showPhoneNumber:   false,  // Show phone on listings
  allowMessages:     true,   // Anyone can message
  showActivityStatus: true,  // "Active 5m ago" visible
};

const ITEMS = [
  {
    key: 'profileVisible',
    icon: 'visibility',
    label: 'Profile Visibility',
    desc:  'Allow other users to view your profile',
  },
  {
    key: 'showPhoneNumber',
    icon: 'phone',
    label: 'Show Phone Number',
    desc:  'Display your phone on your listings',
  },
  {
    key: 'allowMessages',
    icon: 'chat',
    label: 'Allow Messages',
    desc:  'Let other users start chats with you',
  },
  {
    key: 'showActivityStatus',
    icon: 'circle',
    label: 'Activity Status',
    desc:  'Show when you were last online',
  },
];

export default function ManageAccountPrivacyScreen({ navigation }) {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch { /* ignore */ }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Privacy</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>WHO CAN SEE WHAT</Text>
        <View style={styles.card}>
          {ITEMS.map((item, i) => (
            <View
              key={item.key}
              style={[styles.row, i < ITEMS.length - 1 && styles.rowBorder]}
            >
              <View style={styles.iconWrap}>
                <MaterialIcons name={item.icon} size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowDesc}>{item.desc}</Text>
              </View>
              <Switch
                value={!!settings[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ true: PRIMARY, false: '#cbd5e1' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          Changes are saved on this device. Some settings will be enforced server-side in a future update.
        </Text>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0ebff',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 14, fontWeight: '800', color: '#0d121b' },
  rowDesc:  { fontSize: 12, color: '#64748b', marginTop: 2 },
  footnote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    fontWeight: '600',
  },
});
