import { MaterialIcons } from '@expo/vector-icons';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY = '#2C097F';
const APP_VERSION = '1.0.0';

const SOCIAL = [
  { icon: 'language',  label: 'talash.pk',           url: 'https://talash.pk' },
  { icon: 'mail',      label: 'hello@talash.pk',     url: 'mailto:hello@talash.pk' },
  { icon: 'facebook',  label: 'facebook.com/talash', url: 'https://facebook.com/talash' },
];

export default function AboutScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>About Talash</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <LinearGradient
          colors={['#2C097F', '#5B21B6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.logoWrap}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Talash</Text>
          <Text style={styles.appTag}>Pet adoption & marketplace</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </View>
        </LinearGradient>

        {/* Headline */}
        <View style={styles.headlineCard}>
          <MaterialIcons name="pets" size={28} color={PRIMARY} />
          <Text style={styles.headline}>
            This is Pakistan’s largest online pet selling platform.
          </Text>
        </View>

        {/* Mission */}
        <Text style={styles.sectionTitle}>OUR MISSION</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            Talash connects pet owners, breeders, and adopters across Pakistan in a single safe,
            transparent marketplace. We're building the simplest way to find a healthy, well-cared-for
            companion — and the easiest way to find them a loving home.
          </Text>
        </View>

        {/* Company */}
        <Text style={styles.sectionTitle}>COMPANY</Text>
        <View style={styles.card}>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Developed by</Text>
            <Text style={styles.kvVal}>Talash Pvt. Ltd.</Text>
          </View>
          <View style={[styles.kvRow, styles.kvBorder]}>
            <Text style={styles.kvKey}>Headquarters</Text>
            <Text style={styles.kvVal}>Karachi, Pakistan</Text>
          </View>
          <View style={[styles.kvRow, styles.kvBorder]}>
            <Text style={styles.kvKey}>App version</Text>
            <Text style={styles.kvVal}>{APP_VERSION}</Text>
          </View>
        </View>

        {/* Connect */}
        <Text style={styles.sectionTitle}>CONNECT WITH US</Text>
        <View style={styles.card}>
          {SOCIAL.map((s, i) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.socialRow, i < SOCIAL.length - 1 && styles.kvBorder]}
              onPress={() => Linking.openURL(s.url)}
              activeOpacity={0.7}
            >
              <View style={styles.socialIconWrap}>
                <MaterialIcons name={s.icon} size={20} color={PRIMARY} />
              </View>
              <Text style={styles.socialLabel}>{s.label}</Text>
              <MaterialIcons name="open-in-new" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} Talash. Made with ❤️ in Pakistan.
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

  hero: {
    paddingTop: 26,
    paddingBottom: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoWrap: {
    width: 86, height: 86, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logo:    { width: 60, height: 60 },
  appName: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  appTag:  { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  versionPill: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 999,
  },
  versionText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  headlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  headline: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0d121b', lineHeight: 20 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 4,
    overflow: 'hidden',
  },
  body: { fontSize: 14, color: '#475569', lineHeight: 22, padding: 12 },

  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  kvBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  kvKey:    { fontSize: 13, color: '#64748b', fontWeight: '600' },
  kvVal:    { fontSize: 13, color: '#0d121b', fontWeight: '800' },

  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  socialIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0ebff',
    alignItems: 'center', justifyContent: 'center',
  },
  socialLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0d121b' },

  copyright: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 22,
    fontWeight: '600',
  },
});
