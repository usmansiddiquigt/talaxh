import { MaterialIcons } from '@expo/vector-icons';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = '#2C097F';

const SECTIONS = [
  {
    title: 'ACCOUNT',
    items: [
      { icon: 'lock',           label: 'Change Password',         screen: 'ChangePassword' },
      { icon: 'privacy-tip',    label: 'Manage Account Privacy',  screen: 'ManageAccountPrivacy' },
      { icon: 'notifications',  label: 'Notification Preferences', screen: 'NotificationPreferences' },
    ],
  },
  {
    title: 'LEGAL',
    items: [
      { icon: 'description', label: 'Terms & Conditions', screen: 'Terms' },
      { icon: 'shield',      label: 'Privacy Policy',     screen: 'PrivacyPolicy' },
    ],
  },
];

export default function PrivacyScreen({ navigation }) {
  const handleTap = (item) => {
    if (item.screen) navigation.navigate(item.screen);
    else Alert.alert(item.label, 'Coming soon');
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.row, i < section.items.length - 1 && styles.rowBorder]}
                  onPress={() => handleTap(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.iconWrap}>
                    <MaterialIcons name={item.icon} size={20} color={PRIMARY} />
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
    paddingTop: 22,
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0ebff',
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0d121b' },
});
