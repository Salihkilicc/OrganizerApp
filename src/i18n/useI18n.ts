import { useMemo } from 'react';

import { getCurrentLanguage, useLanguage } from '@/store/useLanguage';

import { languageNames, translations, type TranslationKeys } from './translations';
import type { SupportedLanguage } from '@/store/useLanguage';

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => {
    const value = String(params[key]);
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }, template);
};

const getDictionary = (lang: SupportedLanguage) => translations[lang] ?? translations.en;

export function useI18n() {
  const lang = useLanguage((state) => state.language);
  const dict = useMemo(() => getDictionary(lang), [lang]);

  const t = (
    selector: (dict: TranslationKeys) => string,
    params?: Record<string, string | number>,
  ): string => {
    const template = selector(dict) ?? selector(translations.en);
    return interpolate(template ?? '', params);
  };

  return { t, lang };
}

export const translate = (
  selector: (dict: TranslationKeys) => string,
  params?: Record<string, string | number>,
  langOverride?: SupportedLanguage,
) => {
  const lang = langOverride ?? getCurrentLanguage();
  const dict = getDictionary(lang);
  const template = selector(dict) ?? selector(translations.en);
  return interpolate(template ?? '', params);
};

export const availableLanguages = (
  Object.keys(languageNames) as SupportedLanguage[]
).map((code) => ({
  code,
  name: languageNames[code],
}));

export const getLanguageName = (code: SupportedLanguage) => languageNames[code] ?? code;
