import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type SupportedLanguage =
  | 'en'
  | 'tr'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'ru'
  | 'ar'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'hi'
  | 'nl'
  | 'sv'
  | 'pl';

type LanguageState = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'planora_language';

const isSupportedLanguage = (value: unknown): value is SupportedLanguage =>
  typeof value === 'string' &&
  ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko', 'hi', 'nl', 'sv', 'pl'].includes(
    value,
  );

export const useLanguage = create<LanguageState>((set) => ({
  language: 'en',
  setLanguage: (lang) => {
    set({ language: lang });
    void AsyncStorage.setItem(STORAGE_KEY, lang).catch((error) => {
      console.warn('[Language] persist failed', error);
    });
  },
  hydrate: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isSupportedLanguage(saved)) {
        set({ language: saved });
        return;
      }
    } catch (e) {
      console.warn('[Language] hydrate failed', e);
    }
    set({ language: 'en' });
  },
}));

export const getCurrentLanguage = () => useLanguage.getState().language;
