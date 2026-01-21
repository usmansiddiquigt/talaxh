import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: replace with real auth
    alert(`Email: ${email}\nPassword: ${password}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps='handled'
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.welcome}>
                Welcome{'\n'}to <Text style={styles.brand}>Talaxh</Text>
              </Text>
              <Text style={styles.tagline}>Where hope matters!</Text>
            </View>

            <View style={styles.headerImageWrap}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAM9PtZLLwgHuKRU-ergB3TxomF0T5dJjN1482JpG45wcVSAQ1y7UKTu8CeX3S0B2394YSxtvYdCuCdW-H4ytHjUAmL-4IzLgKYSy1Qhev0B9xZ9gTKahpiDE72ZOibdY7u1THQVucVtzZSEvNrStZ0oH3m8CCmlqQ-f8gR-2jDV7HXhLFZgZq9AUWOdLFunSGhWSg5zEE_zFD1Uw4rUabcHsjlN70ap1wKAp-aEUCzeKp-WxDgmPfOwZufHbvV8lWvIW8LLzxxy_0',
                }}
                style={styles.headerImage}
                resizeMode='contain'
              />
            </View>
          </View>

          {/* Title */}
          <View style={styles.sectionTitle}>
            <Text style={styles.loginTitle}>Login</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Inputs */}
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <MaterialIcons name='mail-outline' size={22} color='#94a3b8' />
              <TextInput
                placeholder='Email Address'
                placeholderTextColor='#94a3b8'
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType='email-address'
                autoCapitalize='none'
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrap}>
                <MaterialIcons name='lock-outline' size={22} color='#94a3b8' />
                <TextInput
                  placeholder='Password'
                  placeholderTextColor='#94a3b8'
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          </View>

          {/* Divider + social */}
          <View style={styles.socialSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR LOGIN WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <MaterialIcons name='groups' size={22} color='#1877F2' />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn}>
                <Image
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5EwLfTqA5jo12n8w71Jw8RA7bLXeeoJLnNacY6Cx8MkipPnSW9y1pw8p5yqOhLZkOESns0Ouivl8RUDHoicfo-1KYRnsYcDaKejtmCqGlEv-mXbtqHduwLRyLxulWmU-HaiqZeYI_m0I-ZFf0MagWcxKWbTgMS5lc6n8OrFfypXa6kVCNiVF-X7ZP19GTzhap7O6mT-bzkVCKY6-H-7HCUEhUx9-_kcPArvB5gf_lco6NFXaxw9t1LdTgNYHaNG3SHdc_Zw-xfoY',
                  }}
                  style={{ width: 18, height: 18 }}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialBtn}>
                <MaterialIcons name='phone-iphone' size={22} color='#0f172a' />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account?
              <Text> </Text>
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate('Signup')}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#1e40af';
const BG = '#ffffff';
const TEXT = '#0f172a';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: BG,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  headerTextWrap: { flex: 1 },
  welcome: {
    fontSize: 32,
    fontWeight: '800',
    color: TEXT,
    lineHeight: 34,
  },
  brand: { color: PRIMARY },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#64748b',
  },
  headerImageWrap: { width: 120, alignItems: 'flex-end' },
  headerImage: { width: 110, height: 90, opacity: 0.95 },

  sectionTitle: { marginTop: 28, marginBottom: 18 },
  loginTitle: { fontSize: 24, fontWeight: '800', color: TEXT },
  titleUnderline: {
    width: 32,
    height: 4,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    marginTop: 6,
  },

  form: { gap: 14 },
  inputGroup: { gap: 8 },
  inputWrap: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'rgba(248,250,252,0.6)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
  },

  forgotRow: { alignItems: 'flex-end', paddingTop: 2 },
  forgotText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  loginBtn: {
    marginTop: 6,
    height: 58,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  socialSection: { marginTop: 34 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#94a3b8',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },

  footer: { marginTop: 'auto', paddingTop: 26, alignItems: 'center' },
  footerText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  footerLink: { color: PRIMARY, fontWeight: '800' },
});
