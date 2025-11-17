import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type SupportedLanguage =
  | 'en'
  | 'tr'
  | 'es'
  | 'de'
  | 'fr'
  | 'it'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'zh';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  zh: '中文',
};

export const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: LANGUAGE_LABELS.en },
  { code: 'tr', label: LANGUAGE_LABELS.tr },
  { code: 'es', label: LANGUAGE_LABELS.es },
  { code: 'de', label: LANGUAGE_LABELS.de },
  { code: 'fr', label: LANGUAGE_LABELS.fr },
  { code: 'it', label: LANGUAGE_LABELS.it },
  { code: 'pt', label: LANGUAGE_LABELS.pt },
  { code: 'ru', label: LANGUAGE_LABELS.ru },
  { code: 'ar', label: LANGUAGE_LABELS.ar },
  { code: 'zh', label: LANGUAGE_LABELS.zh },
];

type LanguageState = {
  current: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'organizer_language';

export const useLanguage = create<LanguageState>((set) => ({
  current: 'en',
  setLanguage: (lang) => {
    set({ current: lang });
    void AsyncStorage.setItem(STORAGE_KEY, lang);
  },
  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        set({ current: saved as SupportedLanguage });
      }
    } catch (e) {
      console.warn('[Language] hydrate failed', e);
    }
  },
}));
