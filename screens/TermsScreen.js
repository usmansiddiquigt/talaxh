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
    heading: '1. Acceptance of Terms',
    body: 'By creating an account or using the Talash app, you agree to these Terms & Conditions. If you do not agree, please do not use the service.',
  },
  {
    heading: '2. Eligibility',
    body: 'You must be at least 13 years old to use Talash. If you are under 18, a parent or legal guardian must consent to your use of the platform.',
  },
  {
    heading: '3. User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.',
  },
  {
    heading: '4. Listings & Content',
    body: 'You retain ownership of the content you post (photos, descriptions, listings) but grant Talash a worldwide, non-exclusive license to display, distribute, and promote that content within the service. Listings must be accurate, lawful, and respectful.',
  },
  {
    heading: '5. Prohibited Activities',
    body: 'You may not use Talash to engage in fraud, harassment, or the sale of stolen, unhealthy, or endangered animals. Listings violating Pakistani law or our Community Guidelines will be removed.',
  },
  {
    heading: '6. Transactions',
    body: 'Talash provides a marketplace; we are not a party to transactions between users. You are responsible for verifying the seller, the animal\'s health and condition, and complying with applicable laws.',
  },
  {
    heading: '7. Fees',
    body: 'Posting basic listings on Talash is free. Premium features may carry fees, which will be clearly disclosed before purchase.',
  },
  {
    heading: '8. Termination',
    body: 'We may suspend or terminate your account at our discretion if these terms are violated. You may delete your account at any time through the Account screen.',
  },
  {
    heading: '9. Disclaimer of Warranties',
    body: 'The service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of listings or the conduct of users.',
  },
  {
    heading: '10. Limitation of Liability',
    body: 'To the maximum extent permitted by law, Talash will not be liable for indirect, incidental, or consequential damages arising from your use of the service.',
  },
  {
    heading: '11. Changes to Terms',
    body: 'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the revised terms.',
  },
  {
    heading: '12. Governing Law',
    body: 'These Terms are governed by the laws of the Islamic Republic of Pakistan. Any disputes will be resolved in courts located in Karachi, Pakistan.',
  },
  {
    heading: '13. Contact',
    body: 'Questions about these Terms? Email us at legal@talash.pk.',
  },
];

export default function TermsScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Welcome to Talash — Pakistan's largest online pet selling platform.
          Please read these Terms carefully before using the app.
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
