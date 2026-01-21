import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
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

const API_URL = 'http://192.168.100.69:5000'; // <-- your PC IP

export default function SignupScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSubmit = useMemo(() => {
    if (!fullName.trim()) return false;
    if (!email.trim()) return false;
    if (!phone.trim()) return false;
    if (password.length < 8) return false;
    if (password !== confirmPassword) return false;
    return true;
  }, [fullName, email, phone, password, confirmPassword]);

  const onSignup = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Signup failed');
        return;
      }

      alert('Signup successful ✅');
      navigation.navigate('Login');
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const onGoogle = () => {
    alert('Google pressed (not implemented yet)');
  };

  const onApple = () => {
    alert('Apple pressed (not implemented yet)');
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
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name='arrow-back-ios-new'
                size={18}
                color={PRIMARY}
              />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <View style={styles.dot} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <MaterialIcons name='inventory-2' size={30} color='#fff' />
            </View>

            <Text style={styles.title}>Welcome to Talaxh</Text>
            <Text style={styles.subtitle}>Where hope matters!</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field
              label='Full Name'
              icon='person'
              placeholder='Enter your full name'
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize='words'
            />

            <Field
              label='Email Address'
              icon='mail'
              placeholder='name@example.com'
              value={email}
              onChangeText={setEmail}
              keyboardType='email-address'
              autoCapitalize='none'
            />

            <Field
              label='Mobile Phone Number'
              icon='call'
              placeholder='+1 (555) 000-0000'
              value={phone}
              onChangeText={setPhone}
              keyboardType='phone-pad'
            />

            <Field
              label='Create Password'
              icon='lock'
              placeholder='Min. 8 characters'
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'visibility-off' : 'visibility'}
              onRightIconPress={() => setShowPassword((s) => !s)}
            />

            <Field
              label='Confirm Password'
              icon='lock'
              placeholder='Re-enter password'
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              rightIcon={showConfirm ? 'visibility-off' : 'visibility'}
              onRightIconPress={() => setShowConfirm((s) => !s)}
            />

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
              ]}
              onPress={onSignup}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social (Google + Apple) */}
          <View style={styles.socialGrid}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={onGoogle}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOIdu0zDt7ss9vvzQdjifPXTHVkMg_nCHp2Ctbmg0fiiM094Ubvp0TQKLnYZMmMPpKAZHCBRT5_HLqhFZKLZdNeCLsM0xwgA2yp74UvsZB4PJ4tQx2ptNt4Kg0-m1fL2qssJLJVXeVAmuS4kOkIM1j1ULS1ukE1xJQsqL_l5w-50QyDlBQjdguaRb4vFBUlhCobsmZR3K03R-JARY2Nr4DuMvIfljQorYaU2eko5hLkwf9vX9C4nmwS0aRPPRsK7Ftl1V_Wxoe_k8',
                }}
                style={styles.socialLogo}
              />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={onApple}
              activeOpacity={0.9}
            >
              {/* If "apple" icon errors on your setup, replace with "phone-iphone" */}
              <MaterialIcons name='apple' size={22} color={TEXT} />
              <Text style={styles.socialText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our{' '}
              <Text style={styles.linkText}>Terms</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>.
            </Text>

            <View style={styles.loginRow}>
              <Text style={styles.loginHint}>Already have an account?</Text>
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                Log In
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  style,
  ...inputProps
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputWrap, style]}>
        <MaterialIcons name={icon} size={20} color={MUTED} />
        <TextInput
          {...inputProps}
          placeholderTextColor={MUTED}
          style={styles.input}
        />
        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name={rightIcon} size={20} color={MUTED} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const PRIMARY = '#2563eb';
const BG = '#f8fafc';
const SURFACE = '#ffffff';
const TEXT = '#0f172a';
const MUTED = '#94a3b8';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    paddingBottom: 24,
  },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: PRIMARY,
    marginRight: 6,
  },

  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 18,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
    textAlign: 'center',
    maxWidth: 280,
  },

  form: {
    paddingHorizontal: 24,
    gap: 12,
  },

  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 4,
  },

  inputWrap: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
  },

  primaryBtn: {
    marginTop: 8,
    height: 56,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  dividerRow: {
    marginTop: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  socialGrid: {
    paddingHorizontal: 24,
    paddingTop: 14,
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialLogo: { width: 18, height: 18 },
  socialText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 22,
    marginTop: 6,
  },
  termsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  linkText: {
    color: PRIMARY,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginHint: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '900',
    color: PRIMARY,
  },
});
