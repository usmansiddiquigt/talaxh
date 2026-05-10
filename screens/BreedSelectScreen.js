import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

const PRIMARY = '#2C097F';

const BREEDS = {
  dogs: [
    'Labrador Retriever','Golden Retriever','German Shepherd','French Bulldog',
    'English Bulldog','Poodle','Beagle','Rottweiler','Yorkshire Terrier','Boxer',
    'Dachshund','Siberian Husky','Great Dane','Doberman Pinscher','Shih Tzu',
    'Border Collie','Pomeranian','Cocker Spaniel','Chihuahua','Maltese',
    'Pit Bull Terrier','Akita','Chow Chow','Dalmatian','Samoyed',
    'Bichon Frise','Whippet','Greyhound','Afghan Hound','Mixed / Other',
  ],
  cats: [
    'Persian','Siamese','Maine Coon','British Shorthair','Ragdoll','Bengal',
    'Scottish Fold','Sphynx','Abyssinian','Burmese','Russian Blue',
    'Norwegian Forest Cat','Birman','Exotic Shorthair','American Shorthair',
    'Turkish Angora','Domestic Shorthair','Mixed / Other',
  ],
  birds: [
    'African Grey Parrot','Amazon Parrot','Budgerigar (Budgie)','Canary',
    'Cockatiel','Cockatoo','Conure','Finch','Lovebird','Macaw','Parakeet',
    'Parrotlet','Quaker Parrot','Mynah','Mixed / Other',
  ],
  fish: [
    'Betta','Goldfish','Koi','Guppy','Molly','Platy','Neon Tetra','Cichlid',
    'Oscar','Discus','Angelfish','Catfish','Clownfish','Tropical Mixed','Other',
  ],
  rabbits: [
    'Holland Lop','Mini Rex','Flemish Giant','Lionhead','Dutch','New Zealand',
    'Angora','Rex','Mini Lop','Californian','English Spot','Mixed / Other',
  ],
  reptiles: [
    'Leopard Gecko','Ball Python','Bearded Dragon','Corn Snake','Crested Gecko',
    'Russian Tortoise','Sulcata Tortoise','Chameleon','Iguana','Blue-Tongued Skink',
    'King Snake','Monitor Lizard','Red-Eared Slider','Mixed / Other',
  ],
  'small-pets': [
    'Syrian Hamster','Dwarf Hamster','Guinea Pig','Gerbil','Ferret','Chinchilla',
    'Hedgehog','Degu','Rat','Mouse','Sugar Glider','Mixed / Other',
  ],
};

const CATEGORY_LABELS = {
  dogs: 'Dog', cats: 'Cat', birds: 'Bird', fish: 'Fish',
  rabbits: 'Rabbit', reptiles: 'Reptile', 'small-pets': 'Small Pet',
};

export default function BreedSelectScreen({ navigation, route }) {
  const category = route.params?.category;
  const currentBreed = route.params?.currentBreed || '';
  const [search, setSearch] = useState('');

  const allBreeds = BREEDS[category] || [];
  const filtered = search.trim()
    ? allBreeds.filter(b => b.toLowerCase().includes(search.toLowerCase()))
    : allBreeds;

  const handleSelect = (breed) => {
    navigation.navigate({
      name: 'PostListing',
      params: { selectedBreed: breed },
      merge: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Select Breed</Text>
          <Text style={styles.headerSub}>
            Choose the breed of your {CATEGORY_LABELS[category] || 'Pet'}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Search box */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search breed..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'breed' : 'breeds'}
        </Text>
      </View>

      {/* Breed list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const isSelected = currentBreed === item;
          return (
            <TouchableOpacity
              style={[styles.item, isSelected && styles.itemActive]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                {item}
              </Text>
              {isSelected ? (
                <MaterialIcons name="check-circle" size={20} color={PRIMARY} />
              ) : (
                <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No breeds match "{search}"</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f6f6f8', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0d121b' },
  headerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f6f6f8', borderRadius: 12,
    paddingHorizontal: 12, height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0d121b' },
  countText: { fontSize: 12, color: '#94a3b8', marginTop: 8, marginLeft: 4 },

  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  itemActive: { backgroundColor: '#f5f3ff' },
  itemText: { fontSize: 15, color: '#0d121b' },
  itemTextActive: { color: PRIMARY, fontWeight: '700' },

  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});
