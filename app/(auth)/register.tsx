import { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/store/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuth();
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

  const handleRegister = async () => {
    if (!email || !password) {
      alert('Lütfen e-posta ve şifre girin.');
      return;
    }

    await signUp(email.trim(), password);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.title, { color: palette.text }]}>Kayıt ol</Text>
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
        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>Hesap oluştur</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: palette.text }]}>Zaten hesabım var</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 24,
  },
});
