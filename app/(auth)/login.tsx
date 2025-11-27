import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useI18n } from '@/i18n/useI18n';

const palette = {
  text: '#111826',
  muted: '#7a8397',
  border: '#d9dde6',
  accent: '#2f7e4f',
  link: '#1975ff',
};

export default function LoginScreen() {
  const router = useRouter();
  const signInWithGoogle = useAuth((state) => state.signInWithGoogle);
  const signInWithEmail = useAuth((state) => state.signInWithEmail);
  const continueAsGuest = useAuth((state) => state.continueAsGuest);
  const loading = useAuth((state) => state.loading);
  const headerHeight = useHeaderHeight();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

  const handleLogin = async () => {
    setErrorText('');
    if (!email || !password) {
      setErrorText(t((d) => d.auth.missingCredentials));
      return;
    }
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error: unknown) {
      setErrorText(error instanceof Error ? error.message : t((d) => d.auth.loginError));
    }
  };

  const handleGooglePress = async () => {
    try {
      setSubmitting(true);
      await signInWithGoogle();
    } catch (error: unknown) {
      console.log('[Login] Google sign-in error', error);
      Alert.alert(t((d) => d.auth.googleErrorTitle), t((d) => d.auth.googleErrorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestMode = () => {
    continueAsGuest();
    router.replace('/(tabs)');
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
          <Text style={styles.title}>{t((d) => d.auth.loginTitle)}</Text>
          <Text style={styles.subtitle}>{t((d) => d.auth.loginSubtitle)}</Text>

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
                returnKeyType="done"
              />
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.toggle}>
                  {showPassword ? t((d) => d.auth.toggleHide) : t((d) => d.auth.toggleShow)}
                </Text>
              </Pressable>
            </View>
          </View>

          {errorText ? <Text style={styles.error}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, loading ? styles.disabled : null]}
              onPress={handleLogin}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? t((d) => d.auth.loggingIn) : t((d) => d.auth.loginButton)}
              </Text>
            </Pressable>

            <Text style={styles.auxText}>{t((d) => d.auth.orLoginWith)}</Text>

            <Pressable
              style={styles.googleButton}
              onPress={handleGooglePress}
              disabled={submitting}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.googleText}>
                {submitting ? t((d) => d.auth.googleLoading) : t((d) => d.auth.googleButton)}
              </Text>
              {submitting ? (
                <ActivityIndicator
                  style={{ marginLeft: 10 }}
                  size="small"
                  color={palette.text}
                />
              ) : null}
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={styles.registerLink}>
              <Text style={styles.registerText}>{t((d) => d.auth.createAccount)}</Text>
            </Pressable>
            <Pressable style={styles.guestButton} onPress={handleGuestMode}>
              <Text style={styles.guestText}>{t((d) => d.auth.continueAsGuest)}</Text>
            </Pressable>
          </View>
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
