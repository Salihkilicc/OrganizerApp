import { useEffect, useState } from 'react';

import { translations, type TranslationKey } from '@/i18n/translations';
import { SupportedLanguage, useLanguage } from '@/store/useLanguage';

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) return template;
  return Object.keys(params).reduce((acc, key) => {
    const value = String(params[key]);
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }, template);
};

export function translate(
  key: TranslationKey,
  params?: Record<string, string | number>,
  langOverride?: SupportedLanguage,
): string {
  const lang = langOverride ?? useLanguage.getState().current;
  const table = translations[lang] ?? translations.en;
  const raw = table[key] ?? translations.en[key] ?? key;
  return interpolate(raw, params);
}

export function useTranslation() {
  const current = useLanguage((state) => state.current);
  const [lang, setLang] = useState(current);

  useEffect(() => {
    setLang(current);
  }, [current]);

  const t = (key: TranslationKey, params?: Record<string, string | number>) =>
    translate(key, params, lang);

  return { t, lang };
}
