import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
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
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const PRIMARY = '#2C097F';

const MENU_ITEMS = [
  { icon: 'post-add', label: 'My Listings', screen: 'MyListings' },
  { icon: 'favorite-border', label: 'Saved Pets', screen: 'Favorites' },
  { icon: 'chat-bubble-outline', label: 'Messages', screen: 'Messages' },
];

const SETTINGS_ITEMS = [
  { icon: 'notifications-none', label: 'Notifications' },
  { icon: 'privacy-tip', label: 'Privacy & Security' },
  { icon: 'help-outline', label: 'Help & Support' },
  { icon: 'info-outline', label: 'About Talash' },
];

export default function AccountScreen({ navigation }) {
  const { user, token, signOut, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    location: user?.location || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      location: user?.location || '',
    });
  }, [user]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone, location: form.location }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert('Error', data.message); return; }
      await updateUser({ fullName: form.fullName, phone: form.phone, location: form.location });
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => { await signOut(); navigation.replace('Login'); },
      },
    ]);
  };

  const initials = (user?.fullName || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notSignedIn}>
          <MaterialIcons name="person-outline" size={72} color="#cbd5e1" />
          <Text style={styles.signInTitle}>You're not signed in</Text>
          <Text style={styles.signInSub}>Sign in to manage your listings and messages</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Account</Text>
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} disabled={saving}>
              <Text style={styles.editBtn}>{editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {editing ? (
              <View style={styles.editFields}>
                <TextInput style={styles.editInput} value={form.fullName} onChangeText={v => setForm(p => ({ ...p, fullName: v }))} placeholder="Full Name" />
                <TextInput style={styles.editInput} value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="Phone Number" keyboardType="phone-pad" />
                <TextInput style={styles.editInput} value={form.location} onChangeText={v => setForm(p => ({ ...p, location: v }))} placeholder="City / Location" />
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.fullName || 'No name set'}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                {user.phone ? <View style={styles.metaRow}><MaterialIcons name="phone" size={14} color="#94a3b8" /><Text style={styles.metaText}>{user.phone}</Text></View> : null}
                {user.location ? <View style={styles.metaRow}><MaterialIcons name="place" size={14} color="#94a3b8" /><Text style={styles.metaText}>{user.location}</Text></View> : null}
              </View>
            )}
          </View>

          {/* Quick links */}
          <Text style={styles.sectionTitle}>MY ACTIVITY</Text>
          <View style={styles.menuCard}>
            {MENU_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, i < MENU_ITEMS.length - 1 && styles.menuBorder]}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.menuIconWrap}>
                  <MaterialIcons name={item.icon} size={20} color={PRIMARY} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.menuCard}>
            {SETTINGS_ITEMS.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, i < SETTINGS_ITEMS.length - 1 && styles.menuBorder]}
                onPress={() => Alert.alert(item.label, 'Coming soon')}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: '#f1f5f9' }]}>
                  <MaterialIcons name={item.icon} size={20} color="#64748b" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  notSignedIn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  signInTitle: { fontSize: 20, fontWeight: '700', color: '#0d121b' },
  signInSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  signInBtn: { marginTop: 8, backgroundColor: PRIMARY, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0d121b' },
  editBtn: { fontSize: 14, fontWeight: '700', color: PRIMARY },
  profileCard: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 20, marginBottom: 8,
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#0d121b' },
  profileEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 13, color: '#94a3b8' },
  editFields: { flex: 1, gap: 8 },
  editInput: {
    backgroundColor: '#f6f6f8', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 9, fontSize: 14, color: '#0d121b',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#94a3b8', paddingHorizontal: 16,
    paddingVertical: 10, letterSpacing: 0.8,
  },
  menuCard: { backgroundColor: '#fff', marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0ebff',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0d121b' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#fee2e2', backgroundColor: '#fff',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
});
