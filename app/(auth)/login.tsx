import { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth, signInWithGoogle } from '@/store/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, enterGuestMode, loading } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const palette = {
    background: isDark ? '#050505' : '#f5f5f5',
    card: isDark ? '#111' : '#fff',
    border: isDark ? '#333' : '#ddd',
    text: isDark ? '#fff' : '#111',
    muted: isDark ? '#999' : '#555',
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Lütfen e-posta ve şifre girin.');
      return;
    }
    await signIn(email.trim(), password);
  };

  const handleGuest = () => {
    enterGuestMode();
    // TODO: Persist guest actions and merge when the user registers.
    router.replace('/(tabs)');
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signInWithGoogle();
    } catch (error: unknown) {
      Alert.alert('Google Giriş Hatası', error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <Text style={[styles.title, { color: palette.text }]}>Organizer</Text>
          <TextInput
            value={email}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="E-posta"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={palette.muted}
            style={[
              styles.input,
              { borderColor: palette.border, backgroundColor: palette.card, color: palette.text },
            ]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Şifre"
            secureTextEntry
            placeholderTextColor={palette.muted}
            style={[
              styles.input,
              { borderColor: palette.border, backgroundColor: palette.card, color: palette.text },
            ]}
          />
          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>Giriş</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { backgroundColor: palette.card }]}
            onPress={handleGoogleSignIn}
            disabled={loadingGoogle}>
            <Text style={[styles.buttonText, { color: palette.text }]}>
              {loadingGoogle ? 'Google ile Giriş (bekleyin…)' : 'Google ile Giriş Yap'}
            </Text>
          </Pressable>
          <View style={styles.linkRow}>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>Kayıt ol</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/forgot')}>
              <Text style={styles.linkText}>Şifremi unuttum</Text>
            </Pressable>
          </View>
          <Pressable
            style={[styles.guestButton, { borderColor: palette.border }]}
            onPress={handleGuest}>
            <Text style={[styles.guestText, { color: palette.text }]}>Guest olarak devam et</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  linkText: {
    color: '#6ea8fe',
    fontSize: 15,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 'auto',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  guestText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
