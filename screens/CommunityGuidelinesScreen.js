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

const GUIDELINES = [
  {
    icon: 'favorite',
    color: '#ef4444',
    title: 'Animal Welfare First',
    body: 'Pets must be healthy, well cared for, and of an appropriate age to leave their mother. No exotic, endangered, or illegally bred animals.',
  },
  {
    icon: 'verified',
    color: '#10b981',
    title: 'Honest Listings',
    body: 'List only pets you actually own. Use your own photos. Describe age, breed, vaccinations, and price accurately. Misleading listings will be removed.',
  },
  {
    icon: 'chat',
    color: PRIMARY,
    title: 'Be Respectful',
    body: 'Treat every member with kindness. No harassment, hate speech, threats, or discriminatory language. We have zero tolerance for abuse.',
  },
  {
    icon: 'block',
    color: '#f59e0b',
    title: 'Prohibited Items',
    body: 'No commercial breeders posing as private sellers. No fighting or hunting animals. No accessories that cause harm. No services unrelated to pets.',
  },
  {
    icon: 'lock',
    color: '#3b82f6',
    title: 'Privacy & Safety',
    body: 'Don\'t share other people\'s personal details. Meet in safe public places when handing over a pet. Never pay before seeing the animal in person.',
  },
  {
    icon: 'gavel',
    color: '#7c3aed',
    title: 'Follow the Law',
    body: 'Comply with all Pakistani laws including animal welfare regulations and city-level pet ownership rules. Listings violating local law will be removed.',
  },
  {
    icon: 'flag',
    color: '#ef4444',
    title: 'Reporting Violations',
    body: 'If you see something wrong, tap Report a Problem under Help & Support, or email reports@talash.pk. We review every report within 24 hours.',
  },
  {
    icon: 'how-to-reg',
    color: '#10b981',
    title: 'Consequences',
    body: 'First offence: warning. Repeated or serious violations: listing removal, account suspension, or permanent ban. Decisions are final.',
  },
];

export default function CommunityGuidelinesScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>Community Guidelines</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <MaterialIcons name="diversity-3" size={28} color={PRIMARY} />
          <Text style={styles.introText}>
            Talash is a community for people who care deeply about pets. These guidelines keep
            it safe, honest, and welcoming for everyone.
          </Text>
        </View>

        {GUIDELINES.map((g) => (
          <View key={g.title} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: g.color + '20' }]}>
              <MaterialIcons name={g.icon} size={22} color={g.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{g.title}</Text>
              <Text style={styles.cardBody}>{g.body}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.footer}>
          By using Talash, you agree to follow these guidelines.{'\n'}
          Last updated: April 2026
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
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0ebff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  introText: { flex: 1, fontSize: 13, color: '#0d121b', fontWeight: '600', lineHeight: 19 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0d121b' },
  cardBody:  { fontSize: 13, color: '#475569', lineHeight: 19, marginTop: 4 },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 18,
    fontWeight: '600',
    lineHeight: 18,
  },
});
