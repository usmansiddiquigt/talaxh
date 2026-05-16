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
import * as api from '../lib/api';

const PRIMARY = '#2C097F';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNewPwd]      = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const validate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return 'All fields are required.';
    if (newPassword.length < 8) return 'New password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'New passwords do not match.';
    if (newPassword === currentPassword) return 'New password must differ from current.';
    return '';
  };

  const handleSave = async () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError('');
    setSaving(true);
    try {
      await api.changePassword({ currentPassword, newPassword, confirmPassword });
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(err.message || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, setValue, show, setShow, autoFocus }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!show}
          autoFocus={autoFocus}
          placeholderTextColor="#94a3b8"
          placeholder="••••••••"
        />
        <TouchableOpacity onPress={() => setShow(s => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name={show ? 'visibility' : 'visibility-off'} size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <MaterialIcons name="lock" size={22} color={PRIMARY} />
            <Text style={styles.bannerText}>
              Choose a strong password — at least 8 characters with a mix of letters and numbers.
            </Text>
          </View>

          <Field
            label="Current Password"
            value={currentPassword}
            setValue={setCurrent}
            show={showCur}
            setShow={setShowCur}
            autoFocus
          />
          <Field
            label="New Password"
            value={newPassword}
            setValue={setNewPwd}
            show={showNew}
            setShow={setShowNew}
          />
          <Field
            label="Confirm New Password"
            value={confirmPassword}
            setValue={setConfirm}
            show={showCon}
            setShow={setShowCon}
          />

          {error ? (
            <View style={styles.errorBox}>
              <MaterialIcons name="error-outline" size={18} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Update Password</Text>}
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
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 15, color: '#0d121b', paddingVertical: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#b91c1c', fontWeight: '600' },
  saveBtn: {
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
