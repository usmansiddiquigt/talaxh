import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function AppFeedbackScreen({ navigation }) {
  const [rating, setRating] = useState(0);
  const [text, setText]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (rating === 0) {
      Alert.alert('Rate the app', 'Please select a star rating before submitting.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Add feedback', 'Please share a few words about your experience.');
      return;
    }
    setSubmitting(true);
    // Mock submission — wire to a /feedback endpoint when one exists.
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Thanks for your feedback! 🙏',
        'We appreciate you taking the time to help us make Talash better.',
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
        <Text style={styles.headerTitle}>App Feedback</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <MaterialIcons name="favorite" size={22} color={PRIMARY} />
            <Text style={styles.bannerText}>
              Tell us what you love, what's missing, and how we can make Talash better.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>How would you rate Talash?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => setRating(n)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MaterialIcons
                  name={n <= rating ? 'star' : 'star-border'}
                  size={42}
                  color={n <= rating ? '#F4A724' : '#cbd5e1'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating] || 'Tap to rate'}</Text>

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Your feedback</Text>
          <TextInput
            style={styles.textarea}
            value={text}
            onChangeText={setText}
            placeholder="What did you like? What can we improve?"
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={2000}
          />
          <Text style={styles.charCount}>{text.length}/2000</Text>

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
                  <Text style={styles.submitText}>Submit Feedback</Text>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0d121b',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
    marginTop: 4,
    marginBottom: 22,
    minHeight: 18,
  },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0d121b',
    minHeight: 140,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 6, fontWeight: '600' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    height: 50,
    borderRadius: 14,
    marginTop: 22,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
