import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import StepProgressBar from '../components/StepProgressBar';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';
const TOTAL_STEPS = 8;

const CATEGORIES = [
  { key: 'dogs', label: 'Dogs', icon: 'pets' },
  { key: 'cats', label: 'Cats', icon: 'emoji-nature' },
  { key: 'birds', label: 'Birds', icon: 'flutter-dash' },
  { key: 'rabbits', label: 'Rabbits', icon: 'cruelty-free' },
  { key: 'fish', label: 'Fish', icon: 'water' },
  { key: 'reptiles', label: 'Reptiles', icon: 'bug-report' },
  { key: 'small-pets', label: 'Small Pets', icon: 'favorite' },
];

const HEALTH_FIELDS = [
  { key: 'is_vaccinated', label: 'Vaccinated' },
  { key: 'is_microchipped', label: 'Microchipped' },
  { key: 'is_neutered', label: 'Neutered / Spayed' },
  { key: 'is_kc_registered', label: 'KC Registered' },
  { key: 'is_vet_checked', label: 'Vet Checked' },
];

const INITIAL = {
  category: '',
  title: '',
  breed: '',
  age_months: '',
  gender: 'unknown',
  color: '',
  is_vaccinated: false,
  is_microchipped: false,
  is_neutered: false,
  is_kc_registered: false,
  is_vet_checked: false,
  photos: [],
  price: '',
  is_free: false,
  is_adoption: false,
  is_swap: false,
  description: '',
  location: '',
  city: '',
};

export default function PostListingScreen({ navigation, route }) {
  const { token } = useAuth();
  const editListing = route.params?.listing;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(editListing ? mapToForm(editListing) : INITIAL);
  const [submitting, setSubmitting] = useState(false);

  function mapToForm(l) {
    return { ...INITIAL, ...l, age_months: l.age_months?.toString() || '', price: l.price?.toString() || '' };
  }

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggle = (key) => setForm(p => ({ ...p, [key]: !p[key] }));

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      set('photos', [...form.photos, ...newUris].slice(0, 6));
    }
  };

  const removePhoto = (idx) => {
    set('photos', form.photos.filter((_, i) => i !== idx));
  };

  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!form.title.trim();
    return true;
  };

  const handleSubmit = async (isDraft = false) => {
    if (!token) { navigation.navigate('Login'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title || `${form.breed || form.category} for sale`);
      fd.append('category', form.category);
      fd.append('breed', form.breed);
      fd.append('age_months', form.age_months);
      fd.append('gender', form.gender);
      fd.append('color', form.color);
      fd.append('is_vaccinated', form.is_vaccinated.toString());
      fd.append('is_microchipped', form.is_microchipped.toString());
      fd.append('is_neutered', form.is_neutered.toString());
      fd.append('is_kc_registered', form.is_kc_registered.toString());
      fd.append('is_vet_checked', form.is_vet_checked.toString());
      fd.append('price', form.is_free || form.is_adoption ? '0' : form.price);
      fd.append('is_free', form.is_free.toString());
      fd.append('is_adoption', form.is_adoption.toString());
      fd.append('is_swap', form.is_swap.toString());
      fd.append('description', form.description);
      fd.append('city', form.city);
      fd.append('location', form.location);
      fd.append('status', isDraft ? 'draft' : 'active');

      form.photos.forEach((uri, i) => {
        const ext = uri.split('.').pop();
        fd.append('photos', {
          uri,
          name: `photo_${i}.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
      });

      const url = editListing
        ? `${API_URL}/listings/${editListing.id}`
        : `${API_URL}/listings`;
      const method = editListing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Error', data.message);
        return;
      }

      Alert.alert('Success!', isDraft ? 'Draft saved' : 'Listing published!', [
        { text: 'OK', onPress: () => navigation.replace('Main') },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>What type of pet?</Text>
            <Text style={styles.stepSub}>Select the category for your listing</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catCard, form.category === cat.key && styles.catCardActive]}
                  onPress={() => set('category', cat.key)}
                >
                  <MaterialIcons
                    name={cat.icon}
                    size={28}
                    color={form.category === cat.key ? '#fff' : PRIMARY}
                  />
                  <Text style={[styles.catLabel, form.category === cat.key && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Pet Details</Text>
            <Text style={styles.stepSub}>Tell buyers about your pet</Text>
            <FieldLabel label="Listing Title *" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Golden Retriever Puppies"
              value={form.title}
              onChangeText={v => set('title', v)}
            />
            <FieldLabel label="Breed" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Golden Retriever"
              value={form.breed}
              onChangeText={v => set('breed', v)}
            />
            <FieldLabel label="Age (months)" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 8"
              keyboardType="numeric"
              value={form.age_months}
              onChangeText={v => set('age_months', v)}
            />
            <FieldLabel label="Gender" />
            <View style={styles.toggleRow}>
              {['male', 'female', 'unknown'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.toggleBtn, form.gender === g && styles.toggleBtnActive]}
                  onPress={() => set('gender', g)}
                >
                  <Text style={[styles.toggleText, form.gender === g && styles.toggleTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FieldLabel label="Color / Markings" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Golden, white paws"
              value={form.color}
              onChangeText={v => set('color', v)}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Health Information</Text>
            <Text style={styles.stepSub}>Let buyers know about vaccinations & health</Text>
            {HEALTH_FIELDS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={styles.checkRow}
                onPress={() => toggle(f.key)}
              >
                <View style={[styles.checkbox, form[f.key] && styles.checkboxActive]}>
                  {form[f.key] && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkLabel}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Add Photos</Text>
            <Text style={styles.stepSub}>Up to 6 photos. First photo is the cover.</Text>
            <View style={styles.photoGrid}>
              {form.photos.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} />
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {form.photos.length < 6 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                  <MaterialIcons name="add-photo-alternate" size={32} color="#94a3b8" />
                  <Text style={styles.addPhotoText}>Add Photos</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Pricing</Text>
            <Text style={styles.stepSub}>Set your price or choose an option</Text>
            <View style={styles.priceOptions}>
              {[
                { key: 'is_free', label: 'Free', icon: 'card-giftcard' },
                { key: 'is_adoption', label: 'Adoption', icon: 'volunteer-activism' },
                { key: 'is_swap', label: 'Swap', icon: 'swap-horiz' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.priceOpt, form[opt.key] && styles.priceOptActive]}
                  onPress={() => {
                    setForm(p => ({
                      ...p,
                      is_free: false, is_adoption: false, is_swap: false,
                      [opt.key]: !p[opt.key],
                    }));
                  }}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={22}
                    color={form[opt.key] ? '#fff' : PRIMARY}
                  />
                  <Text style={[styles.priceOptLabel, form[opt.key] && { color: '#fff' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {!form.is_free && !form.is_adoption && !form.is_swap && (
              <>
                <FieldLabel label="Set a Price ($)" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 500"
                  keyboardType="numeric"
                  value={form.price}
                  onChangeText={v => set('price', v)}
                />
              </>
            )}
          </View>
        );

      case 6:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Description</Text>
            <Text style={styles.stepSub}>Tell buyers more about your pet</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your pet's personality, history, habits..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              value={form.description}
              onChangeText={v => set('description', v)}
            />
            <Text style={styles.charCount}>{form.description.length} characters</Text>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepSub}>Where is the pet located?</Text>
            <FieldLabel label="City" />
            <TextInput
              style={styles.input}
              placeholder="e.g. New York"
              value={form.city}
              onChangeText={v => set('city', v)}
            />
            <FieldLabel label="Full Address / Postcode" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Brooklyn, NY 11201"
              value={form.location}
              onChangeText={v => set('location', v)}
            />
          </View>
        );

      case 8:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Preview & Submit</Text>
            <Text style={styles.stepSub}>Review your listing before publishing</Text>
            <View style={styles.previewCard}>
              {form.photos[0] ? (
                <Image source={{ uri: form.photos[0] }} style={styles.previewImg} />
              ) : (
                <View style={[styles.previewImg, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                  <MaterialIcons name="pets" size={40} color="#cbd5e1" />
                </View>
              )}
              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{form.title || 'Untitled listing'}</Text>
                <Text style={styles.previewMeta}>
                  {form.breed} • {form.city} • {form.is_free ? 'Free' : form.is_adoption ? 'Adoption' : form.price ? `$${form.price}` : 'Price not set'}
                </Text>
                <Text style={styles.previewDesc} numberOfLines={3}>{form.description}</Text>
                <Text style={styles.previewPhotos}>{form.photos.length} photo(s)</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editListing ? 'Edit Listing' : 'Post a Listing'}</Text>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity onPress={() => handleSubmit(true)}>
            <Text style={styles.saveDraft}>Save Draft</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <StepProgressBar current={step} total={TOTAL_STEPS} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation buttons */}
      <View style={styles.navBar}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <MaterialIcons name="arrow-back" size={18} color={PRIMARY} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={() => canNext() && setStep(s => s + 1)}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, submitting && { opacity: 0.7 }]}
            onPress={() => handleSubmit(false)}
            disabled={submitting}
          >
            <Text style={styles.nextBtnText}>{submitting ? 'Publishing...' : 'Publish Listing'}</Text>
            <MaterialIcons name="check" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0d121b' },
  saveDraft: { fontSize: 14, fontWeight: '600', color: PRIMARY },
  stepWrap: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#0d121b', marginBottom: 6 },
  stepSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  catCardActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catLabel: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0d121b',
  },
  textArea: { height: 160, paddingTop: 12 },
  charCount: { textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 4 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkLabel: { fontSize: 15, color: '#0d121b', fontWeight: '500' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: PRIMARY,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  coverText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f6f8',
  },
  addPhotoText: { fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'center' },
  priceOptions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  priceOpt: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 6,
  },
  priceOptActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  priceOptLabel: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  previewImg: { width: '100%', height: 200 },
  previewBody: { padding: 16 },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#0d121b' },
  previewMeta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  previewDesc: { fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 20 },
  previewPhotos: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY,
  },
  nextBtnDisabled: { backgroundColor: '#cbd5e1' },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
