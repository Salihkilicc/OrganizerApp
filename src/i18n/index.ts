import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initReactI18next, useTranslation } from 'react-i18next';

export const LANGS = ['tr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = 'app_lang';

const resources = {
  en: {
    common: {
      login: 'Login',
      logout: 'Logout',
      googleSignIn: 'Sign in with Google',
      profile: 'Profile',
      today: 'Today',
      plan: 'Plan',
      theme: 'Theme',
      language: 'Language',
      ninjaTheme: 'Ninja',
      darkTheme: 'Dark',
      lightTheme: 'Light',
      currentTheme: 'Current theme',
      currentLanguage: 'Current language',
      selectTheme: 'Select a theme',
      selectLanguage: 'Select a language',
      signOut: 'Sign out',
    },
  },
  tr: {
    common: {
      login: 'Giriş',
      logout: 'Çıkış',
      googleSignIn: 'Google ile Giriş',
      profile: 'Profil',
      today: 'Bugün',
      plan: 'Plan',
      theme: 'Tema',
      language: 'Dil',
      ninjaTheme: 'Ninja',
      darkTheme: 'Koyu',
      lightTheme: 'Açık',
      currentTheme: 'Mevcut tema',
      currentLanguage: 'Mevcut dil',
      selectTheme: 'Bir tema seçin',
      selectLanguage: 'Bir dil seçin',
      signOut: 'Çıkış yap',
    },
  },
};

export async function initI18n(defaultLang: Lang = 'tr') {
  const stored = (await AsyncStorage.getItem(STORAGE_KEY)) as Lang | null;
  const initialLang = stored ?? defaultLang;

  await i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      lng: initialLang,
      fallbackLng: 'en',
      resources,
      ns: ['common'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false,
      },
    });
}

export async function setLang(lang: Lang) {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(STORAGE_KEY, lang);
}

export function useT() {
  return useTranslation('common').t;
}
