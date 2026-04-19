import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
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

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'dogs',       label: 'Dogs',       icon: 'pets'            },
  { key: 'cats',       label: 'Cats',       icon: 'emoji-nature'    },
  { key: 'birds',      label: 'Birds',      icon: 'flutter-dash'    },
  { key: 'rabbits',    label: 'Rabbits',    icon: 'cruelty-free'    },
  { key: 'fish',       label: 'Fish',       icon: 'water'           },
  { key: 'reptiles',   label: 'Reptiles',   icon: 'bug-report'      },
  { key: 'small-pets', label: 'Small Pets', icon: 'favorite'        },
];

// ── Pet type labels per category ──────────────────────────────────────────────
const PET_TYPES = {
  dogs:        ['Puppy',         'Adult Dog'],
  cats:        ['Kitten',        'Adult Cat'],
  birds:       ['Chick/Juvenile','Adult Bird'],
  fish:        ['Juvenile',      'Adult Fish'],
  rabbits:     ['Baby/Kit',      'Adult Rabbit'],
  reptiles:    ['Juvenile',      'Adult Reptile'],
  'small-pets':['Baby',          'Adult'],
};

// ── Health checkboxes ─────────────────────────────────────────────────────────
const HEALTH_FIELDS = [
  { key: 'is_vaccinated',   label: 'Vaccinated'      },
  { key: 'is_microchipped', label: 'Microchipped'     },
  { key: 'is_neutered',     label: 'Neutered / Spayed'},
  { key: 'is_kc_registered',label: 'KC Registered'   },
  { key: 'is_vet_checked',  label: 'Vet Checked'     },
];

// ── Initial form state ────────────────────────────────────────────────────────
const INITIAL = {
  category: '', breed: '', pet_type: '',
  title: '', age_value: '', age_unit: 'months',
  gender: 'unknown', color: '',
  is_vaccinated: false, is_microchipped: false,
  is_neutered: false, is_kc_registered: false, is_vet_checked: false,
  photos: [],
  price: '',
  description: '',
  city: '', address: '', postcode: '',
};

function mapToForm(l) {
  return {
    ...INITIAL, ...l,
    age_value: l.age_months?.toString() || '',
    age_unit: 'months',
    price: l.price?.toString() || '',
    address: l.location || '',
    postcode: '',
  };
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function PostListingScreen({ navigation, route }) {
  const { token } = useAuth();
  const editListing = route.params?.listing;

  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(editListing ? mapToForm(editListing) : { ...INITIAL });
  const [submitting, setSubmitting]   = useState(false);

  const set    = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggle = (key)      => setForm(p => ({ ...p, [key]: !p[key] }));

  // Auto-fill title when breed + pet_type are chosen
  useEffect(() => {
    if (!form.title && form.breed && form.pet_type) {
      set('title', `${form.pet_type} ${form.breed} for Sale`);
    }
  }, [form.breed, form.pet_type]);

  // Pick up breed when returning from BreedSelect screen
  useEffect(() => {
    const picked = route.params?.selectedBreed;
    if (picked) {
      set('breed', picked);
      navigation.setParams({ selectedBreed: undefined });
      setStep(2);
    }
  }, [route.params?.selectedBreed]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!form.title.trim();
    return true;
  };

  // ── Next-button handler (step 1 opens BreedSelect screen) ───────────────────
  const handleNext = () => {
    if (!canNext()) return;
    if (step === 1) {
      navigation.navigate('BreedSelect', {
        category: form.category,
        currentBreed: form.breed,
      });
      return;
    }
    setStep(s => s + 1);
  };

  // ── Photo picker ────────────────────────────────────────────────────────────
  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.75,
      selectionLimit: 6,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      set('photos', [...form.photos, ...uris].slice(0, 6));
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (isDraft = false) => {
    if (!token) { navigation.navigate('Login'); return; }
    setSubmitting(true);
    try {
      // Convert age to months
      const ageMonths = form.age_value
        ? form.age_unit === 'weeks'
          ? Math.round(Number(form.age_value) / 4.33)
          : Number(form.age_value)
        : '';

      const locationStr = [form.address, form.city, form.postcode]
        .filter(Boolean).join(', ');

      const fd = new FormData();
      fd.append('title',          form.title.trim() || `${form.pet_type || ''} ${form.breed || form.category} for Sale`.trim());
      fd.append('category',       form.category);
      fd.append('breed',          form.breed);
      fd.append('age_months',     ageMonths.toString());
      fd.append('gender',         form.gender);
      fd.append('color',          form.color);
      fd.append('is_vaccinated',  form.is_vaccinated.toString());
      fd.append('is_microchipped',form.is_microchipped.toString());
      fd.append('is_neutered',    form.is_neutered.toString());
      fd.append('is_kc_registered',form.is_kc_registered.toString());
      fd.append('is_vet_checked', form.is_vet_checked.toString());
      fd.append('price',          form.price || '0');
      fd.append('is_free',        'false');
      fd.append('is_adoption',    'false');
      fd.append('is_swap',        'false');
      fd.append('description',    form.description);
      fd.append('city',           form.city);
      fd.append('location',       locationStr);
      fd.append('status',         isDraft ? 'draft' : 'active');

      form.photos.forEach((uri, i) => {
        const ext = uri.split('.').pop().toLowerCase();
        fd.append('photos', {
          uri,
          name: `photo_${i}.${ext}`,
          type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        });
      });

      const url    = editListing ? `${API_URL}/listings/${editListing.id}` : `${API_URL}/listings`;
      const method = editListing ? 'PUT' : 'POST';

      const res  = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();

      if (!res.ok) { Alert.alert('Error', data.message); return; }

      Alert.alert(
        isDraft ? 'Draft Saved' : '🎉 Listing Published!',
        isDraft ? 'Your draft has been saved.' : 'Your listing is now live on the Home feed.',
        [{ text: 'OK', onPress: () => navigation.replace('Main') }],
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step renderer ────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── Step 1: Category ────────────────────────────────────────────────────
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
                  onPress={() => { set('category', cat.key); set('breed', ''); set('pet_type', ''); }}
                >
                  <MaterialIcons name={cat.icon} size={28} color={form.category === cat.key ? '#fff' : PRIMARY} />
                  <Text style={[styles.catLabel, form.category === cat.key && { color: '#fff' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      // ── Step 2: Pet Details ─────────────────────────────────────────────────
      case 2: {
        const petTypes = PET_TYPES[form.category] || ['Puppy', 'Adult'];
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Pet Details</Text>
            <Text style={styles.stepSub}>Tell buyers about your pet</Text>

            {/* Pet type: Puppy / Adult */}
            <FieldLabel label="Is it a puppy or adult?" />
            <View style={styles.toggleRow}>
              {petTypes.map(pt => (
                <TouchableOpacity
                  key={pt}
                  style={[styles.toggleBtn, form.pet_type === pt && styles.toggleBtnActive]}
                  onPress={() => set('pet_type', pt)}
                >
                  <Text style={[styles.toggleText, form.pet_type === pt && styles.toggleTextActive]}>
                    {pt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Age with unit toggle */}
            <FieldLabel label="Age" />
            <View style={styles.ageRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="e.g. 8"
                keyboardType="numeric"
                value={form.age_value}
                onChangeText={v => set('age_value', v)}
              />
              <View style={styles.ageUnitRow}>
                {['weeks', 'months'].map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitBtn, form.age_unit === unit && styles.unitBtnActive]}
                    onPress={() => set('age_unit', unit)}
                  >
                    <Text style={[styles.unitText, form.age_unit === unit && styles.unitTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Listing Title */}
            <FieldLabel label="Listing Title *" />
            <TextInput
              style={styles.input}
              placeholder={`e.g. ${form.pet_type || 'Puppy'} ${form.breed || 'for Sale'}`}
              value={form.title}
              onChangeText={v => set('title', v)}
            />

            {/* Gender */}
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

            {/* Color */}
            <FieldLabel label="Color / Markings" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Golden, white paws"
              value={form.color}
              onChangeText={v => set('color', v)}
            />
          </View>
        );
      }

      // ── Step 3: Health Info ─────────────────────────────────────────────────
      case 3:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Health Information</Text>
            <Text style={styles.stepSub}>Let buyers know about vaccinations & health</Text>
            {HEALTH_FIELDS.map(f => (
              <TouchableOpacity key={f.key} style={styles.checkRow} onPress={() => toggle(f.key)}>
                <View style={[styles.checkbox, form[f.key] && styles.checkboxActive]}>
                  {form[f.key] && <MaterialIcons name="check" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkLabel}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      // ── Step 4: Photos ──────────────────────────────────────────────────────
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
                    <View style={styles.coverBadge}><Text style={styles.coverText}>Cover</Text></View>
                  )}
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => set('photos', form.photos.filter((_, x) => x !== i))}
                  >
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
            {form.photos.length === 0 && (
              <Text style={styles.photoHint}>Listings with photos get 5× more views</Text>
            )}
          </View>
        );

      // ── Step 5: Price (PKR) ─────────────────────────────────────────────────
      case 5:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Set Your Price</Text>
            <Text style={styles.stepSub}>Enter the price in Pakistani Rupees (PKR)</Text>

            <View style={styles.pkrInputWrap}>
              <View style={styles.pkrPrefix}>
                <Text style={styles.pkrPrefixText}>PKR</Text>
              </View>
              <TextInput
                style={styles.pkrInput}
                placeholder="0"
                keyboardType="numeric"
                value={form.price}
                onChangeText={v => set('price', v.replace(/[^0-9]/g, ''))}
              />
            </View>

            {form.price ? (
              <Text style={styles.pricePreview}>
                Rs. {Number(form.price).toLocaleString('en-PK')}
              </Text>
            ) : null}

            <Text style={styles.priceHint}>
              💡 Enter the full price in PKR. Negotiable prices attract more buyers.
            </Text>
          </View>
        );

      // ── Step 6: Description ─────────────────────────────────────────────────
      case 6:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Description</Text>
            <Text style={styles.stepSub}>Tell buyers more about your pet</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your pet's personality, history, habits, diet..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              value={form.description}
              onChangeText={v => set('description', v)}
            />
            <Text style={styles.charCount}>{form.description.length} / 1000 characters</Text>
          </View>
        );

      // ── Step 7: Location ────────────────────────────────────────────────────
      case 7:
        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.stepSub}>Where is the pet located?</Text>

            <FieldLabel label="City *" />
            <TextInput
              style={styles.input}
              placeholder="e.g. Karachi"
              value={form.city}
              onChangeText={v => set('city', v)}
            />

            <FieldLabel label="Street Address" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 12-B, Block 4, Clifton"
              value={form.address}
              onChangeText={v => set('address', v)}
            />

            <FieldLabel label="Postcode / Area" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 75500"
              keyboardType="default"
              value={form.postcode}
              onChangeText={v => set('postcode', v)}
            />

            <View style={styles.locationPreview}>
              <MaterialIcons name="place" size={16} color={PRIMARY} />
              <Text style={styles.locationPreviewText} numberOfLines={2}>
                {[form.address, form.city, form.postcode].filter(Boolean).join(', ') || 'Location will appear here'}
              </Text>
            </View>
          </View>
        );

      // ── Step 8: Preview & Submit ────────────────────────────────────────────
      case 8: {
        const ageDisplay = form.age_value
          ? `${form.age_value} ${form.age_unit}`
          : 'Age not set';
        const priceDisplay = form.price
          ? `Rs. ${Number(form.price).toLocaleString('en-PK')}`
          : 'Price not set';

        return (
          <View style={styles.stepWrap}>
            <Text style={styles.stepTitle}>Preview & Submit</Text>
            <Text style={styles.stepSub}>Review your listing before publishing</Text>

            <View style={styles.previewCard}>
              {form.photos[0] ? (
                <Image source={{ uri: form.photos[0] }} style={styles.previewImg} resizeMode="cover" />
              ) : (
                <View style={[styles.previewImg, styles.previewImgPlaceholder]}>
                  <MaterialIcons name="pets" size={40} color="#cbd5e1" />
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>No photos added</Text>
                </View>
              )}
              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{form.title || 'Untitled listing'}</Text>
                <Text style={styles.previewPrice}>{priceDisplay}</Text>

                <View style={styles.previewMetas}>
                  {form.breed    ? <PreviewChip icon="pets"       text={form.breed}    /> : null}
                  {form.pet_type ? <PreviewChip icon="info"       text={form.pet_type} /> : null}
                  {form.age_value? <PreviewChip icon="cake"       text={ageDisplay}    /> : null}
                  {form.city     ? <PreviewChip icon="place"      text={form.city}     /> : null}
                  {form.gender !== 'unknown' ? <PreviewChip icon="wc" text={form.gender} /> : null}
                </View>

                {form.description ? (
                  <Text style={styles.previewDesc} numberOfLines={3}>{form.description}</Text>
                ) : null}

                <Text style={styles.previewPhotos}>
                  {form.photos.length} photo{form.photos.length !== 1 ? 's' : ''} attached
                </Text>
              </View>
            </View>
          </View>
        );
      }

      default:
        return null;
    }
  };

  const stepTitles = [
    'Category', 'Details', 'Health',
    'Photos', 'Price', 'Description', 'Location', 'Preview',
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconBtn}
          onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#0d121b" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{editListing ? 'Edit Listing' : 'Post a Listing'}</Text>
          <Text style={styles.headerStep}>{stepTitles[step - 1]}</Text>
        </View>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity onPress={() => handleSubmit(true)}>
            <Text style={styles.saveDraft}>Save Draft</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      <StepProgressBar current={step} total={TOTAL_STEPS} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav bar */}
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
            onPress={handleNext}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>
              {step === 1 ? 'Choose Breed' : 'Next'}
            </Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.publishBtn, submitting && { opacity: 0.7 }]}
            onPress={() => handleSubmit(false)}
            disabled={submitting}
          >
            <MaterialIcons name="check" size={18} color="#fff" />
            <Text style={styles.nextBtnText}>{submitting ? 'Publishing...' : 'Publish Listing'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Small helper components ───────────────────────────────────────────────────
function FieldLabel({ label }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function PreviewChip({ icon, text }) {
  return (
    <View style={styles.previewChip}>
      <MaterialIcons name={icon} size={12} color={PRIMARY} />
      <Text style={styles.previewChipText}>{text}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },

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
  headerStep:  { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  saveDraft:   { fontSize: 13, fontWeight: '700', color: PRIMARY },

  stepWrap: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#0d121b', marginBottom: 4 },
  stepSub:   { fontSize: 14, color: '#64748b', marginBottom: 24 },

  // Category grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '30%', aspectRatio: 1, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 2, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  catCardActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catLabel: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  // Breed step
  breedSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f6f6f8', borderRadius: 12,
    paddingHorizontal: 12, height: 46, marginBottom: 4,
  },
  breedSearchInput: { flex: 1, fontSize: 15, color: '#0d121b' },
  breedItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  breedItemActive:     { },
  breedItemText:       { fontSize: 15, color: '#0d121b' },
  breedItemTextActive: { color: PRIMARY, fontWeight: '700' },
  noBreedText:         { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 14 },

  // Form inputs
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6, marginTop: 18 },
  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#0d121b',
  },
  textArea:  { height: 160, paddingTop: 12 },
  charCount: { textAlign: 'right', fontSize: 12, color: '#94a3b8', marginTop: 4 },

  // Toggle buttons
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    alignItems: 'center', backgroundColor: '#fff',
  },
  toggleBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  toggleText:       { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },

  // Age row
  ageRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ageUnitRow: { flexDirection: 'row', gap: 6 },
  unitBtn: {
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  unitBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  unitText:       { fontSize: 14, fontWeight: '600', color: '#64748b' },
  unitTextActive: { color: '#fff' },

  // Health checkboxes
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  checkbox:       { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  checkLabel:     { fontSize: 15, color: '#0d121b', fontWeight: '500' },

  // Photos
  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoWrap:  { width: '30%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photo:      { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: PRIMARY, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  coverText:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  removePhoto:{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn:{ width: '30%', aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f6f8', gap: 4 },
  addPhotoText:{ fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  photoHint:  { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 20, lineHeight: 20 },

  // Price (PKR)
  pkrInputWrap: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  pkrPrefix:    { backgroundColor: '#f0ebff', paddingHorizontal: 16, justifyContent: 'center', borderRightWidth: 1.5, borderRightColor: '#e2e8f0' },
  pkrPrefixText:{ fontSize: 15, fontWeight: '800', color: PRIMARY },
  pkrInput:     { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 20, fontWeight: '800', color: '#0d121b' },
  pricePreview: { fontSize: 24, fontWeight: '900', color: PRIMARY, textAlign: 'center', marginTop: 16 },
  priceHint:    { fontSize: 13, color: '#64748b', marginTop: 20, lineHeight: 20, backgroundColor: '#fffbeb', padding: 14, borderRadius: 12 },

  // Location
  locationPreview: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 20, backgroundColor: '#f0ebff',
    padding: 14, borderRadius: 12,
  },
  locationPreviewText: { flex: 1, fontSize: 14, color: PRIMARY, fontWeight: '600' },

  // Preview card
  previewCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  previewImg:  { width: '100%', height: 200 },
  previewImgPlaceholder: { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  previewBody:  { padding: 16 },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#0d121b' },
  previewPrice: { fontSize: 20, fontWeight: '900', color: PRIMARY, marginTop: 4 },
  previewMetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  previewChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0ebff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  previewChipText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  previewDesc:  { fontSize: 13, color: '#64748b', marginTop: 10, lineHeight: 20 },
  previewPhotos:{ fontSize: 12, color: '#94a3b8', marginTop: 8 },

  // Nav bar
  navBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  backBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  backBtnText:  { fontSize: 15, fontWeight: '700', color: PRIMARY },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 52, borderRadius: 14, backgroundColor: PRIMARY,
  },
  nextBtnDisabled: { backgroundColor: '#cbd5e1' },
  publishBtn:      { backgroundColor: '#10b981' },
  nextBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});
