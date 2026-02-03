import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* ---------------- CONSTANTS ---------------- */

const PRIMARY = '#2C097F';
const BG = '#f6f6f8';

/* ---------------- DATA ---------------- */

const LOCATIONS = ['New York, NY', 'Brooklyn, NY', 'Queens, NY'];

const CATEGORIES = [
  { icon: 'emergency', label: 'Missing' },
  { icon: 'pets', label: 'Pets' },
  { icon: 'directions-car', label: 'Vehicles' },
  { icon: 'home', label: 'Houses' },
  { icon: 'category', label: 'Others' },
];

const CARDS = [
  {
    category: 'Pets',
    location: 'New York, NY',
    tag: 'MISSING',
    title: 'Missing: Golden Retriever',
    sub: 'Downtown, NY · 2 hours ago',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAAUsxW1cubsc_8E1x2UWGcMY19zgNqFrz6ZH2ok-LlXZbj6HcqWjZwW0IEQdYw2Xugrly61n8YYlpQTr4n04JcszdrpWfroEE-vEfrdpJkeNf1IddpwFyWcM1vZtF8hsAsHZa5s2hIep6L6EnT0zqOibaa0KIh1t5iwcLXdE_moCjyQWOZm9tfFoiLzRtCrW0NleRbBiVHyreeZ7XwYXZ7OXrVKTHddxJkqBC8npuQB3HuwmUm-ghBbwRXAFBAZC4-vSDjt-IaHjQ',
  },
  {
    category: 'Houses',
    location: 'Brooklyn, NY',
    tag: 'FOR SALE',
    title: 'Modern 3BR House',
    sub: '$450,000 · Brooklyn',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBTIzF6ZjbpHrTPAXclu_rQ9dEufbvan1Fq9YlpWrL4xrPjahRZyUEPcT70soURyBr2Ae6Kbgf4oykziNw4nYEsP-ijQvUZ6zh5HMrVUir2is2noayKIcjCua5Y5rV__0ZPchpFssv1cYt4IyJf_95w3bzPQ96G98AXcDQ2xTSTRA2Z_tJbcHAr6VFB6AXUzbxOIn1lOuxCu1AJhlnEQRpsGhvQjzp4uwTAg_F6UgK_ROmc-Efx4t_V2Rqq6yBxFcGtzOq2AAWSbcg',
  },
];

/* ---------------- SCREEN ---------------- */

export default function WelcomeScreen() {
  const [location, setLocation] = useState('New York, NY');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  //const [activeTab, setActiveTab] = useState('Home');

  /* ---------------- FILTER LOGIC ---------------- */
  const filteredCards = useMemo(() => {
    return CARDS.filter((item) => {
      const byLocation = item.location === location;
      const byCategory = activeCategory
        ? item.category === activeCategory
        : true;
      const bySearch = item.title.toLowerCase().includes(search.toLowerCase());

      return byLocation && byCategory && bySearch;
    });
  }, [location, activeCategory, search]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.location}
          onPress={() => setShowLocationModal(true)}
        >
          <MaterialIcons name='location-on' size={22} color={PRIMARY} />
          <View>
            <Text style={styles.locationLabel}>Location</Text>
            <Text style={styles.locationValue}>
              {location} <MaterialIcons name='expand-more' size={14} />
            </Text>
          </View>
        </TouchableOpacity>

        {/* SEARCH */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name='search' size={20} color='#94a3b8' />
            <TextInput
              placeholder='Search...'
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* CATEGORIES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catRow}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.label}
              style={styles.category}
              onPress={() =>
                setActiveCategory(activeCategory === c.label ? null : c.label)
              }
            >
              <View
                style={[
                  styles.catIcon,
                  activeCategory === c.label && {
                    backgroundColor: '#ede9fe',
                  },
                ]}
              >
                <MaterialIcons name={c.icon} size={28} color={PRIMARY} />
              </View>
              <Text style={styles.catText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* CARDS */}
        <View style={styles.grid}>
          {filteredCards.map((item, i) => (
            <View key={i} style={styles.card}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={styles.tag}>{item.tag}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* LOCATION MODAL */}
      <Modal visible={showLocationModal} transparent animationType='slide'>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                onPress={() => {
                  setLocation(loc);
                  setShowLocationModal(false);
                }}
              >
                <Text style={styles.modalItem}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },

  location: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  locationLabel: { fontSize: 10, color: '#64748b', fontWeight: '700' },
  locationValue: { fontSize: 14, fontWeight: '800' },

  searchRow: { marginTop: 12 },
  searchBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },

  sectionHeader: { marginTop: 20, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },

  catRow: { paddingLeft: 16, marginTop: 12 },
  category: { alignItems: 'center', marginRight: 16 },
  catIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: { marginTop: 6, fontSize: 12, fontWeight: '800' },

  grid: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  cardImage: { width: '100%', height: 140 },
  cardBody: { padding: 10 },
  tag: { fontSize: 10, fontWeight: '900', color: PRIMARY },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardSub: { fontSize: 11, color: '#64748b' },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalItem: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 12,
  },
  // navItem: { alignItems: 'center' },
  // navText: {
  //   fontSize: 10,
  //   fontWeight: '800',
  //   marginTop: 2,
  //   color: '#94a3b8',
  // },
});
