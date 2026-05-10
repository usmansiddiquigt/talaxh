import { MaterialIcons } from '@expo/vector-icons';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = '#2C097F';

const ITEMS = [
  { icon: 'help-outline',   color: '#3b82f6', label: 'FAQs',                 desc: 'Quick answers to common questions',     screen: 'FAQs' },
  { icon: 'support-agent',  color: '#10b981', label: 'Contact Support',      desc: 'Talk to our support team',              screen: 'ContactSupport' },
  { icon: 'report-problem', color: '#f59e0b', label: 'Report a Problem',     desc: 'Found a bug or issue? Let us know',     screen: 'ReportProblem' },
  { icon: 'rate-review',    color: PRIMARY,   label: 'App Feedback',         desc: 'Share ideas to make Talash better',     screen: 'AppFeedback' },
  { icon: 'verified-user',  color: '#ef4444', label: 'Community Guidelines', desc: 'How we keep Talash safe and welcoming', screen: 'CommunityGuidelines' },
];

export default function HelpScreen({ navigation }) {

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <MaterialIcons name="support-agent" size={32} color={PRIMARY} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>How can we help?</Text>
            <Text style={styles.bannerSub}>
              We usually respond within a few hours.
            </Text>
          </View>
        </View>

        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.card}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: item.color + '20' }]}>
              <MaterialIcons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
          </TouchableOpacity>
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
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f0ebff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 6,
  },
  bannerTitle: { fontSize: 16, fontWeight: '900', color: '#0d121b' },
  bannerSub:   { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 15, fontWeight: '800', color: '#0d121b' },
  cardDesc:  { fontSize: 12, color: '#64748b', marginTop: 2 },
});
