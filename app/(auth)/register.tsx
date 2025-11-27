import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

import { useAuth } from '@/store/useAuth';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/i18n/useI18n';

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
  const headerHeight = useHeaderHeight();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const { t } = useI18n();

  const handleRegister = async () => {
    setErrorText('');
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorText(t((d) => d.auth.errors.fillAllFields));
      return;
    }
    if (password.length < 8) {
      setErrorText(t((d) => d.auth.errors.passwordTooShort));
      return;
    }
    if (password !== confirmPassword) {
      setErrorText(t((d) => d.auth.errors.passwordMismatch));
      return;
    }
    try {
      setNeedsConfirmation(false);
      setResendStatus('idle');
      await signUp(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t((d) => d.auth.errors.registrationError);
      const lower = message.toLowerCase();
      if (lower.includes('email not confirmed')) {
        setNeedsConfirmation(true);
        setErrorText(t((d) => d.auth.errors.confirmEmail));
        return;
      }
      if (lower.includes('already registered') || lower.includes('duplicate')) {
        setNeedsConfirmation(false);
        setErrorText(t((d) => d.auth.errors.duplicateEmail));
        router.replace('/(auth)/login');
        return;
      }
      setErrorText(message);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrorText(t((d) => d.auth.errors.resendEnterEmail));
      return;
    }
    try {
      setResendStatus('sending');
      setErrorText('');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) {
        throw error;
      }
      setResendStatus('success');
      setErrorText(t((d) => d.auth.errors.resendSent));
    } catch (resendError: unknown) {
      setResendStatus('error');
      setErrorText(
        resendError instanceof Error
          ? resendError.message
          : t((d) => d.auth.errors.resendError),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight + 12}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backCircle} onPress={() => router.back()}>
            <Text style={styles.backSymbol}>{'←'}</Text>
          </Pressable>
          <Text style={styles.title}>{t((d) => d.auth.registerTitle)}</Text>
          <Text style={styles.subtitle}>{t((d) => d.auth.registerSubtitle)}</Text>

          <View style={[styles.row, styles.field]}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{t((d) => d.auth.firstName)}</Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t((d) => d.auth.firstNamePlaceholder)}
                placeholderTextColor={palette.muted}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.rowItem, styles.lastColumn]}>
              <Text style={styles.label}>{t((d) => d.auth.lastName)}</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={t((d) => d.auth.lastNamePlaceholder)}
                placeholderTextColor={palette.muted}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t((d) => d.auth.emailLabel)}</Text>
            <TextInput
              value={email}
              inputMode="email"
              onChangeText={setEmail}
              placeholder={t((d) => d.auth.emailPlaceholder)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={palette.muted}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t((d) => d.auth.passwordLabel)}</Text>
            <View style={[styles.input, styles.passwordWrapper]}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t((d) => d.auth.passwordPlaceholder)}
                placeholderTextColor={palette.muted}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.toggle}>
                  {showPassword ? t((d) => d.auth.toggleHide) : t((d) => d.auth.toggleShow)}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.small}>{t((d) => d.auth.passwordRule)}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t((d) => d.auth.confirmPassword)}</Text>
            <View style={[styles.input, styles.passwordWrapper]}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t((d) => d.auth.confirmPassword)}
                placeholderTextColor={palette.muted}
                secureTextEntry={!showConfirm}
                style={styles.passwordInput}
                returnKeyType="done"
              />
              <Pressable onPress={() => setShowConfirm((prev) => !prev)}>
                <Text style={styles.toggle}>
                  {showConfirm ? t((d) => d.auth.toggleHide) : t((d) => d.auth.toggleShow)}
                </Text>
              </Pressable>
            </View>
          </View>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
          {needsConfirmation && (
            <Pressable
              onPress={handleResendConfirmation}
              disabled={resendStatus === 'sending'}
              style={[
                styles.resendButton,
                resendStatus === 'sending' && styles.disabled,
              ]}>
              <Text style={styles.resendText}>
                {resendStatus === 'sending'
                  ? t((d) => d.auth.errors.resendSending)
                  : t((d) => d.auth.resendConfirmation)}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.button, loading ? styles.disabled : null]}
            onPress={handleRegister}
            disabled={loading}>
            <Text style={styles.buttonText}>{t((d) => d.auth.registerButton)}</Text>
          </Pressable>

          <Text style={styles.bottomCopy}>
            {t((d) => d.auth.termsPrefix)}{' '}
            <Text style={styles.linkText}>{t((d) => d.auth.termsService)}</Text>{' '}
            {t((d) => d.auth.termsConnector)}{' '}
            <Text style={styles.linkText}>{t((d) => d.auth.privacyPolicy)}</Text>.
          </Text>
        </ScrollView>
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
    flexGrow: 1,
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
  resendButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 42,
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#fff',
  },
  resendText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '600',
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
