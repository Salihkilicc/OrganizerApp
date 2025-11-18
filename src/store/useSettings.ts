import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { SupportedLanguage, useLanguage } from '@/store/useLanguage';

type AppLanguage = SupportedLanguage;

export type NotificationTypes = {
  planReminders: boolean;
  focusMode: boolean;
  dailySummary: boolean;
  streakWarning: boolean;
};

type SettingsState = {
  language: AppLanguage;
  waterReminderEnabled: boolean;
  vibrationEnabled: boolean;
  notificationTypes: NotificationTypes;
  setLanguage: (lang: AppLanguage) => void;
  toggleWaterReminder: () => void;
  toggleVibration: () => void;
  toggleNotificationType: (key: keyof NotificationTypes) => void;
};

const STORAGE_KEY = 'organizer-settings';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: useLanguage.getState().current,
      waterReminderEnabled: false,
      vibrationEnabled: true,
      notificationTypes: {
        planReminders: true,
        focusMode: true,
        dailySummary: false,
        streakWarning: true,
      },
      setLanguage: (language) => {
        useLanguage.getState().setLanguage(language);
        set({ language });
      },
      toggleWaterReminder: () =>
        set((state) => ({ waterReminderEnabled: !state.waterReminderEnabled })),
      toggleVibration: () =>
        set((state) => ({ vibrationEnabled: !state.vibrationEnabled })),
      toggleNotificationType: (key) =>
        set((state) => ({
          notificationTypes: {
            ...state.notificationTypes,
            [key]: !state.notificationTypes[key],
          },
        })),
    }),
    {
      name: STORAGE_KEY,
      getStorage: () => AsyncStorage,
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          useLanguage.getState().setLanguage(state.language);
        }
      },
    },
  ),
);
