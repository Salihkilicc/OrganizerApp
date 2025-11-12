import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/store/useAuth';

const palette = {
  text: '#111826',
  muted: '#7a8397',
  border: '#d5dae9',
  accent: '#2f7e4f',
  link: '#1975ff',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleRegister = async () => {
    setErrorText('');
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorText('Please fill out every field.');
      return;
    }
    if (password.length < 8) {
      setErrorText('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('Passwords do not match.');
      return;
    }
    await signUp(email.trim(), password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.container}>
          <Pressable style={styles.backCircle} onPress={() => router.back()}>
            <Text style={styles.backSymbol}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>Create your profile and get started with Organizer.</Text>

          <View style={[styles.row, styles.field]}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                placeholderTextColor={palette.muted}
                style={styles.input}
              />
            </View>
            <View style={[styles.rowItem, styles.lastColumn]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Doe"
                placeholderTextColor={palette.muted}
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              inputMode="email"
              onChangeText={setEmail}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={palette.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.input, styles.passwordWrapper]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={palette.muted}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.toggle}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <Text style={styles.small}>must contain 8 char.</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.input, styles.passwordWrapper]}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={palette.muted}
                secureTextEntry={!showConfirm}
                style={styles.passwordInput}
              />
              <Pressable onPress={() => setShowConfirm((prev) => !prev)}>
                <Text style={styles.toggle}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
          </View>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <Pressable style={[styles.button, loading ? styles.disabled : null]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.buttonText}>Create Account</Text>
          </Pressable>

          <Text style={styles.bottomCopy}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f4fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backSymbol: {
    fontSize: 16,
    color: palette.muted,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: palette.muted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowItem: {
    flex: 1,
    marginRight: 8,
  },
  lastColumn: {
    marginRight: 0,
  },
  field: {
    marginTop: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 6,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: palette.text,
  },
  toggle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.link,
  },
  small: {
    marginTop: 4,
    color: palette.muted,
    fontSize: 11,
  },
  error: {
    marginTop: 12,
    color: '#c21c3a',
    fontSize: 13,
  },
  button: {
    marginTop: 24,
    backgroundColor: palette.accent,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 42,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 220,
  },
  disabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomCopy: {
    marginTop: 14,
    fontSize: 11,
    color: palette.muted,
    textAlign: 'center',
  },
  linkText: {
    color: palette.link,
    fontWeight: '600',
  },
});
