import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
const SUPPORT_EMAIL = 'support@talash.pk';
const SUPPORT_PHONE = '+92 300 1234567';

export default function ContactSupportScreen({ navigation }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Please add a subject and message.');
      return;
    }
    setSending(true);
    const url =
      `mailto:${SUPPORT_EMAIL}` +
      `?subject=${encodeURIComponent(subject.trim())}` +
      `&body=${encodeURIComponent(message.trim())}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
        setSubject(''); setMessage('');
      } else {
        Alert.alert('No email app', `Please email us at ${SUPPORT_EMAIL} directly.`);
      }
    } catch {
      Alert.alert('Error', 'Could not open email app.');
    } finally {
      setSending(false);
    }
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
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>QUICK CONTACT</Text>

          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#dbeafe' }]}>
              <MaterialIcons name="mail" size={22} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Email</Text>
              <Text style={styles.cardValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            activeOpacity={0.85}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`)}
          >
            <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
              <MaterialIcons name="phone" size={22} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Phone</Text>
              <Text style={styles.cardValue}>{SUPPORT_PHONE}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>SEND US A MESSAGE</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="What's this about?"
              placeholderTextColor="#94a3b8"
              maxLength={120}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us how we can help..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={1500}
            />

            <TouchableOpacity
              style={[styles.submitBtn, sending && { opacity: 0.6 }]}
              onPress={send}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.submitText}>Send Message</Text>
                  </>
                )}
            </TouchableOpacity>
          </View>
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  cardValue: { fontSize: 14, color: '#0d121b', fontWeight: '800', marginTop: 2 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#f6f6f8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0d121b',
  },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
