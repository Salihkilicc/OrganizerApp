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

import { supabase } from '@/lib/supabase';
import { getRedirect } from '@/lib/oauth';

const palette = {
  text: '#111826',
  muted: '#7a8397',
  border: '#d5dae9',
  accent: '#2f7e4f',
  label: '#4b5572',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleReset = async () => {
    setErrorText('');
    setSuccessMessage('');
    if (!email) {
      setErrorText('Lütfen e-posta adresinizi girin.');
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

    setSuccessMessage('Sıfırlama bağlantısı e-posta kutunuza gönderildi.');
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
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            No worries! Enter your email address below and we will send you a code to reset
            password.
          </Text>

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

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Pressable
            style={[styles.button, submitting ? styles.disabled : null]}
            onPress={handleReset}
            disabled={submitting}>
            <Text style={styles.buttonText}>
              {submitting ? 'Sending…' : 'Send Reset Instruction'}
            </Text>
          </Pressable>
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
    paddingTop: 36,
    paddingBottom: 24,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0f2f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  backSymbol: {
    fontSize: 18,
    color: palette.label,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: palette.muted,
  },
  field: {
    marginTop: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.label,
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
  button: {
    marginTop: 32,
    backgroundColor: palette.accent,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 38,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 220,
  },
  disabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  error: {
    marginTop: 8,
    color: '#c21c3a',
    fontSize: 14,
  },
  success: {
    marginTop: 8,
    color: '#2b7b44',
    fontSize: 14,
  },
});
