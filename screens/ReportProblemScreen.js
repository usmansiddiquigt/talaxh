import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = '#2C097F';

export default function ReportProblemScreen({ navigation }) {
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [shotUri, setShotUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickShot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to attach a screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setShotUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!title.trim() || !desc.trim()) {
      Alert.alert('Missing fields', 'Please fill in the title and description.');
      return;
    }
    setSubmitting(true);
    // Mock submission — in production this would POST to a /reports endpoint
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Report submitted ✅',
        'Thank you. Our team will review your report and get back to you within 1–2 business days.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }, 600);
  };

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
        <Text style={styles.headerTitle}>Report a Problem</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <MaterialIcons name="bug-report" size={22} color={PRIMARY} />
            <Text style={styles.bannerText}>
              Help us improve Talash by reporting bugs, glitches, or anything that didn't work as expected.
            </Text>
          </View>

          <Text style={styles.label}>Problem Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Photos not uploading"
            placeholderTextColor="#94a3b8"
            maxLength={120}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={desc}
            onChangeText={setDesc}
            placeholder="What were you doing? What happened? What did you expect?"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={2000}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Screenshot (optional)</Text>
          {shotUri ? (
            <View style={styles.shotWrap}>
              <Image source={{ uri: shotUri }} style={styles.shotImg} />
              <TouchableOpacity style={styles.shotRemove} onPress={() => setShotUri(null)}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.shotPicker} onPress={pickShot} activeOpacity={0.85}>
              <MaterialIcons name="add-photo-alternate" size={28} color={PRIMARY} />
              <Text style={styles.shotPickerText}>Attach a screenshot</Text>
              <Text style={styles.shotPickerSub}>JPG or PNG, max 10 MB</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.submitText}>Submit Report</Text>
                </>
              )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 16, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0ebff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: { flex: 1, fontSize: 13, color: '#0d121b', fontWeight: '600', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0d121b',
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  shotPicker: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    paddingVertical: 28,
    alignItems: 'center',
  },
  shotPickerText: { color: PRIMARY, fontWeight: '800', fontSize: 14, marginTop: 6 },
  shotPickerSub:  { color: '#94a3b8', fontSize: 11, marginTop: 2, fontWeight: '600' },
  shotWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  shotImg: { width: '100%', height: 200 },
  shotRemove: {
    position: 'absolute',
    top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 14,
    marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
