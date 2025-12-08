import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/store/useAuth';
import { useI18n } from '@/i18n/useI18n';
import { availableLanguages, getLanguageName } from '@/i18n/useI18n';
import { useLanguage } from '@/store/useLanguage';
import { useSettings } from '@/store/useSettings';

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
  const signInWithApple = useAuth((state) => state.signInWithApple);
  const signInWithEmail = useAuth((state) => state.signInWithEmail);
  const continueAsGuest = useAuth((state) => state.continueAsGuest);
  const loading = useAuth((state) => state.loading);
  const headerHeight = useHeaderHeight();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [oauthSubmitting, setOauthSubmitting] = useState<'google' | 'apple' | null>(null);
  const { t } = useI18n();
  const showAppleButton = Platform.OS === 'ios';
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const currentLanguage = useLanguage((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);

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
      setOauthSubmitting('google');
      await signInWithGoogle();
    } catch (error: unknown) {
      console.log('[Login] Google sign-in error', error);
      Alert.alert(t((d) => d.auth.googleErrorTitle), t((d) => d.auth.googleErrorMessage));
    } finally {
      setOauthSubmitting(null);
    }
  };

  const handleApplePress = async () => {
    try {
      setOauthSubmitting('apple');
      await signInWithApple();
    } catch (error: unknown) {
      console.log('[Login] Apple sign-in error', error);
      Alert.alert(t((d) => d.auth.appleErrorTitle), t((d) => d.auth.appleErrorMessage));
    } finally {
      setOauthSubmitting(null);
    }
  };

  const handleGuestMode = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior="height"
        enabled={Platform.OS === 'android'}
        keyboardVerticalOffset={headerHeight + 12}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.languageButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setLanguageModalVisible(true)}>
              <Ionicons name="language-outline" size={20} color="#fff" />
              <Text style={styles.languageText}>{getLanguageName(currentLanguage)}</Text>
              <Ionicons name="chevron-down" size={18} color="#f3f5f9" />
            </Pressable>
          </View>

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
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
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
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
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
              disabled={oauthSubmitting !== null}>
              <View style={styles.googleBadge}>
                <Text style={styles.googleLetter}>G</Text>
              </View>
              <Text style={styles.googleText}>
                {oauthSubmitting === 'google'
                  ? t((d) => d.auth.googleLoading)
                  : t((d) => d.auth.googleButton)}
              </Text>
              {oauthSubmitting === 'google' ? (
                <ActivityIndicator
                  style={{ marginLeft: 10 }}
                  size="small"
                  color={palette.text}
                />
              ) : null}
            </Pressable>

            {showAppleButton ? (
              <Pressable
                style={styles.appleButton}
                onPress={handleApplePress}
                disabled={oauthSubmitting !== null}>
                <Ionicons name="logo-apple" size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.appleText}>
                  {oauthSubmitting === 'apple'
                    ? t((d) => d.auth.appleLoading)
                    : t((d) => d.auth.appleButton)}
                </Text>
                {oauthSubmitting === 'apple' ? (
                  <ActivityIndicator style={{ marginLeft: 10 }} size="small" color="#fff" />
                ) : null}
              </Pressable>
            ) : null}
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

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)} />
          <View style={styles.selectorModal}>
            <View style={[styles.selectorModalHandle, { backgroundColor: palette.border }]} />
            <Text style={styles.selectorModalTitle}>{t((d) => d.settings.languageTitle)}</Text>
            <ScrollView
              style={styles.selectorModalList}
              contentContainerStyle={styles.selectorModalListContent}
              showsVerticalScrollIndicator={false}>
              {availableLanguages.map((option) => {
                const isActive = option.code === currentLanguage;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => {
                      setLanguage(option.code);
                      setLanguageModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectorItem,
                      {
                        borderColor: palette.border,
                        backgroundColor: isActive ? palette.accent : '#fff',
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.selectorItemText,
                        { color: isActive ? '#fff' : palette.text },
                      ]}>
                      {option.name}
                    </Text>
                    {isActive && <Text style={styles.selectorItemCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-end',
    backgroundColor: palette.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    transform: [{ scale: 1.1 }],
  },
  languageText: {
    marginLeft: 8,
    marginRight: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
    alignItems: 'center',
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
  appleButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#0a0a0a',
    alignSelf: 'center',
    minWidth: 220,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  appleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  bottomRow: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerLink: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    marginHorizontal: 6,
    marginBottom: 10,
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
    marginHorizontal: 6,
    marginBottom: 10,
  },
  guestText: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectorModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  selectorModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: palette.text,
  },
  selectorModalList: {
    maxHeight: 320,
  },
  selectorModalListContent: {
    paddingBottom: 12,
  },
  selectorItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectorItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorItemCheck: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
