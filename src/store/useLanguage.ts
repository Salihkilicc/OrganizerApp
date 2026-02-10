import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  // hydrate is handled automatically by persist, but we keep the type for backward compatibility if needed
  hydrate: () => Promise<void>;
};

const STORAGE_KEY = 'planora_language';

export const isSupportedLanguage = (value: unknown): value is SupportedLanguage =>
  typeof value === 'string' &&
  ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar', 'zh', 'ja', 'ko', 'hi', 'nl', 'sv', 'pl'].includes(
    value,
  );

const detectDeviceLanguage = (): SupportedLanguage => {
  const method1 = getLocales()[0]?.languageCode;
  const method2 = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[0];
  const candidate = method1 || method2 || 'en';

  return isSupportedLanguage(candidate) ? candidate : 'en';
};

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      language: detectDeviceLanguage(),
      setLanguage: (lang) => set({ language: lang }),
      hydrate: async () => { }, // No-op, handled by persist
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[useLanguage] Rehydrated language:', state?.language);
      },
    }
  )
);

export const getCurrentLanguage = () => useLanguage.getState().language;
