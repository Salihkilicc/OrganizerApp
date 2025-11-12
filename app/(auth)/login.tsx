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

import { signInWithGoogle, useAuth } from '@/store/useAuth';

const palette = {
  text: '#111826',
  muted: '#7a8397',
  border: '#d9dde6',
  accent: '#2f7e4f',
  link: '#1975ff',
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, enterGuestMode, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleLogin = async () => {
    setErrorText('');
    if (!email || !password) {
      setErrorText('Please enter an email and password.');
      return;
    }
    await signIn(email.trim(), password);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
    } catch (error: unknown) {
      setErrorText(
        error instanceof Error ? error.message : 'An error occurred during Google sign-in.'
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleGuestMode = () => {
    enterGuestMode();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Access Organizer with your email and password.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              inputMode="email"
              onChangeText={setEmail}
              placeholder="jsmith@mail.com"
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
          </View>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, loading ? styles.disabled : null]}
              onPress={handleLogin}
              disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Logging in…' : 'Login'}</Text>
            </Pressable>

            <Text style={styles.auxText}>or login with</Text>

            <Pressable
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loadingGoogle}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.googleText}>
                {loadingGoogle ? 'Signing in with Google (loading…)' : 'Login with Google'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={styles.registerLink}>
              <Text style={styles.registerText}>Create account</Text>
            </Pressable>
            <Pressable style={styles.guestButton} onPress={handleGuestMode}>
              <Text style={styles.guestText}>Continue as guest</Text>
            </Pressable>
          </View>
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111826',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    color: palette.muted,
  },
  field: {
    marginTop: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5572',
    marginBottom: 6,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
    fontSize: 15,
    color: palette.text,
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.link,
  },
  error: {
    marginTop: 12,
    color: '#c21c3a',
    fontSize: 13,
  },
  actions: {
    flex: 1,
    justifyContent: 'center',
    marginTop: 18,
  },
  button: {
    alignSelf: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 44,
    alignItems: 'center',
    backgroundColor: palette.accent,
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
  auxText: {
    marginTop: 16,
    textAlign: 'center',
    color: palette.muted,
    fontSize: 13,
  },
  googleButton: {
    marginTop: 10,
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    alignSelf: 'center',
  },
  googleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f3f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleLetter: {
    fontWeight: '700',
    color: '#de4f3f',
  },
  googleText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  bottomRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  registerLink: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  registerText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 14,
  },
  guestButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
  },
  guestText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
