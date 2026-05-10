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
const LAST_UPDATED = 'April 2026';

const SECTIONS = [
  {
    heading: '1. User Data',
    body: 'When you create an account, we collect your name, email address, phone number, and city. When you post a listing, we also store the photos, descriptions, and pricing you provide. We do not sell your personal data to third parties.',
  },
  {
    heading: '2. Security',
    body: 'Your password is hashed and never stored in plain text. Connections to Talash use HTTPS encryption. Photos and listings are stored on Supabase, which encrypts data at rest. We restrict employee access to user data on a strict need-to-know basis.',
  },
  {
    heading: '3. Information Usage',
    body: 'We use your data to operate Talash, surface relevant listings, deliver notifications you opted into, and communicate important updates. Aggregated, anonymised analytics help us improve the product. We never read your private messages.',
  },
  {
    heading: '4. Cookies & Tracking',
    body: 'The mobile app uses minimal device identifiers to keep you signed in and to detect crashes. We do not use third-party advertising trackers. If you contact us via the website, basic analytics cookies measure page traffic only.',
  },
  {
    heading: '5. Sharing With Third Parties',
    body: 'We share data only with service providers necessary to run the app — for example, our database host (Supabase) and email provider — under strict confidentiality agreements. We may disclose data if compelled by Pakistani law.',
  },
  {
    heading: '6. Data Retention',
    body: 'Your account data is retained until you delete your account. Listings remain visible until you remove them or mark them sold. Deleted accounts are purged from our active systems within 30 days; backup copies are deleted within 90 days.',
  },
  {
    heading: '7. Your Rights',
    body: 'You can view, edit, or delete your profile at any time from the Account screen. To request a copy of all data we hold about you, or to permanently delete your account, email privacy@talash.pk.',
  },
  {
    heading: '8. Children',
    body: 'Talash is not directed at children under 13. We do not knowingly collect data from children. If we learn that a child has provided personal information, we will delete it.',
  },
  {
    heading: '9. Changes to This Policy',
    body: 'We may update this policy as the product evolves. Material changes will be highlighted via in-app notification. Your continued use of Talash after the update constitutes acceptance.',
  },
  {
    heading: '10. Contact Information',
    body: 'For privacy questions, contact us at privacy@talash.pk or by post to: Talash Pvt. Ltd., Karachi, Pakistan.',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Talash respects your privacy. This policy explains what information we collect,
          how we use it, and the choices you have.
        </Text>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map(s => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.heading}>{s.heading}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
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
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, color: '#0d121b', lineHeight: 22, fontWeight: '600' },
  updated: { fontSize: 12, color: '#94a3b8', marginTop: 6, marginBottom: 20, fontWeight: '700' },
  section: { marginBottom: 18 },
  heading: { fontSize: 15, fontWeight: '900', color: PRIMARY, marginBottom: 6 },
  body: { fontSize: 14, color: '#475569', lineHeight: 22 },
});
