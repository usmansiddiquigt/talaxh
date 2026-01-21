import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const onSend = () => {
    // TODO: call your reset password API
    alert(`Reset link will be sent to: ${email}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name='chevron-left' size={28} color={PRIMARY} />
              </TouchableOpacity>

              <View style={styles.topCenter}>
                <Text style={styles.topCenterText}>WHERE HOPE MATTERS!</Text>
              </View>

              {/* spacer to balance layout */}
              <View style={{ width: 40 }} />
            </View>

            {/* Icon card */}
            <View style={styles.heroWrap}>
              <View style={styles.heroOuter}>
                <MaterialIcons name='lock-reset' size={44} color={PRIMARY} />
              </View>

              <View style={styles.keyBadge}>
                <MaterialIcons name='key' size={20} color={PRIMARY} />
              </View>
            </View>

            {/* Title + description */}
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.desc}>
              No worries! Enter your registered email address below and we'll
              send you a link to reset your password.
            </Text>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.inputWrap}>
                <MaterialIcons
                  name='mail-outline'
                  size={20}
                  color={PRIMARY_60}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder='e.g., alex@example.com'
                  placeholderTextColor='#94a3b8'
                  keyboardType='email-address'
                  autoCapitalize='none'
                  style={styles.input}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={onSend}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryBtnText}>Send Reset Link</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom content */}
            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.9}
              >
                <MaterialIcons name='arrow-back' size={18} color={PRIMARY} />
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>

              <Text style={styles.footerText}>Talaxh: Where hope matters!</Text>
            </View>
          </ScrollView>

          {/* Bottom color strip */}
          <View style={styles.bottomStrip}>
            <View style={[styles.strip, { backgroundColor: PRIMARY }]} />
            <View style={[styles.strip, { backgroundColor: '#60a5fa' }]} />
            <View style={[styles.strip, { backgroundColor: PRIMARY }]} />
            <View style={[styles.strip, { backgroundColor: '#60a5fa' }]} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = '#0056b3';
const PRIMARY_60 = 'rgba(0, 86, 179, 0.6)';
const BG = '#f8fbff';
const TEXT = '#0f172a';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    paddingBottom: 60, // room above bottom strip
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40, // mimic your HTML centering offset
  },
  topCenterText: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '800',
    color: 'rgba(0, 86, 179, 0.35)',
  },

  heroWrap: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 18,
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOuter: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 86, 179, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  keyBadge: {
    position: 'absolute',
    right: 10,
    bottom: 6,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  title: {
    paddingHorizontal: 24,
    fontSize: 32,
    fontWeight: '900',
    color: PRIMARY,
    letterSpacing: -0.2,
  },
  desc: {
    paddingHorizontal: 24,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },

  form: {
    paddingHorizontal: 24,
    marginTop: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: TEXT,
    marginBottom: 10,
    marginLeft: 4,
  },
  inputWrap: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: PRIMARY,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
  },

  primaryBtn: {
    marginTop: 18,
    height: 56,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  bottomArea: {
    marginTop: 'auto',
    paddingTop: 30,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 14,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: '900',
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#94a3b8',
  },

  bottomStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
    opacity: 0.3,
    flexDirection: 'row',
  },
  strip: { flex: 1 },
});
