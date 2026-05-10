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
const STORAGE_KEY = '@talash_notif_prefs';

const DEFAULTS = {
  newMessages:        true,
  adViews:            true,
  adPostedConfirm:    true,
  pushNotifications:  true,
  emailNotifications: false,
};

const SECTIONS = [
  {
    title: 'IN-APP',
    items: [
      { key: 'newMessages',     icon: 'chat-bubble',  label: 'New Messages',         desc: 'Get notified when someone sends you a message' },
      { key: 'adViews',         icon: 'visibility',   label: 'Ad Views',             desc: 'Get notified when someone views your listing' },
      { key: 'adPostedConfirm', icon: 'check-circle', label: 'Ad Posted Confirmation', desc: 'Confirmation when your listing goes live' },
    ],
  },
  {
    title: 'CHANNELS',
    items: [
      { key: 'pushNotifications',  icon: 'notifications', label: 'Push Notifications',  desc: 'Receive alerts on your device' },
      { key: 'emailNotifications', icon: 'mail',          label: 'Email Notifications', desc: 'Receive a summary by email' },
    ],
  },
];

export default function NotificationPreferencesScreen({ navigation }) {
  const [prefs, setPrefs] = useState(DEFAULTS);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch { /* ignore */ }
    })();
  }, []);

  const toggle = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
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
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <View
                  key={item.key}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconWrap}>
                    <MaterialIcons name={item.icon} size={20} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowDesc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={!!prefs[item.key]}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ true: PRIMARY, false: '#cbd5e1' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footnote}>
          Preferences are saved on this device.
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
