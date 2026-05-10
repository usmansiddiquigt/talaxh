import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = '#2C097F';

const FAQS = [
  {
    q: 'How do I post a listing?',
    a: 'Tap the “+” button in the bottom tab bar, fill in the details across the steps (category, breed, photos, price, location), and tap Publish. Your ad goes live immediately on the Home feed.',
  },
  {
    q: 'Is Talash free to use?',
    a: 'Posting basic listings, browsing pets, and messaging sellers are all completely free. Premium promotion features may be added in the future and will always be clearly priced.',
  },
  {
    q: 'How do I contact a seller?',
    a: 'Open any listing and tap the Call button to dial them directly, or tap Message Seller to start a chat. The seller will be notified instantly.',
  },
  {
    q: 'Can I edit a listing after posting?',
    a: 'Yes. Go to Account → My Listings, tap the listing you want to edit, and choose Edit. Changes take effect immediately.',
  },
  {
    q: 'How do I save pets I like?',
    a: 'Tap the heart icon on any listing card or detail page. Saved pets are accessible from Account → Saved Pets.',
  },
  {
    q: 'Why aren\'t my photos uploading?',
    a: 'Make sure you have a stable internet connection and that each photo is under 10 MB in JPG or PNG format. If the issue persists, restart the app and try again.',
  },
  {
    q: 'How do I change my password?',
    a: 'Go to Account → Privacy & Security → Change Password. You\'ll need to enter your current password to set a new one.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Email support@talash.pk from the address registered with your account. We\'ll process the deletion within 30 days, in line with our Privacy Policy.',
  },
];

export default function FAQsScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

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
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Quick answers to the questions we hear most often.</Text>

        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <View key={i} style={[styles.card, open && styles.cardOpen]}>
              <TouchableOpacity
                style={styles.qRow}
                onPress={() => setOpenIndex(open ? null : i)}
                activeOpacity={0.85}
              >
                <Text style={styles.q}>{item.q}</Text>
                <MaterialIcons
                  name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={22}
                  color={PRIMARY}
                />
              </TouchableOpacity>
              {open && <Text style={styles.a}>{item.a}</Text>}
            </View>
          );
        })}
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
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: { fontSize: 14, color: '#475569', marginBottom: 6, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardOpen: { borderColor: PRIMARY },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  q: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0d121b', lineHeight: 20 },
  a: { fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 10 },
});
