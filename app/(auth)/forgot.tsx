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

import { supabase } from '@/lib/supabase';
import { getRedirect } from '@/lib/oauth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isDark = useColorScheme() === 'dark';
  const palette = {
    background: isDark ? '#050505' : '#f5f5f5',
    card: isDark ? '#111' : '#fff',
    border: isDark ? '#333' : '#ddd',
    text: isDark ? '#fff' : '#111',
    muted: isDark ? '#999' : '#555',
  };

  const handleReset = async () => {
    if (!email) {
      alert('Lütfen e-posta adresinizi girin.');
      return;
    }

    setSubmitting(true);

    const emailRedirectTo = getRedirect();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo },
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert('Giriş linki e-posta kutunuza gönderildi.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.title, { color: palette.text }]}>Şifremi unuttum</Text>
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
        <Pressable style={styles.button} onPress={handleReset} disabled={submitting}>
          <Text style={styles.buttonText}>Sihirli link gönder</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: palette.text }]}>Geri dön</Text>
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
