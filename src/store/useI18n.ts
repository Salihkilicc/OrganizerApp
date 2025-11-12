import { create } from 'zustand';
import i18n from 'i18next';

import { initI18n, setLang, type Lang } from '@/i18n';

type I18nState = {
  ready: boolean;
  lang: Lang;
  init: () => Promise<void>;
  change: (lang: Lang) => Promise<void>;
};

export const useI18n = create<I18nState>((set) => ({
  ready: false,
  lang: 'tr',
  init: async () => {
    await initI18n('tr');
    const current = (i18n.language ?? 'tr') as Lang;
    set({ ready: true, lang: current });
  },
  change: async (lang) => {
    await setLang(lang);
    set({ lang });
  },
}));
