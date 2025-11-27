import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  fetchUserSettings,
  saveUserSettings,
  NotificationTypes,
  DEFAULT_NOTIFICATION_TYPES,
} from '@/lib/account';
import { SupportedLanguage, useLanguage } from '@/store/useLanguage';

type AppLanguage = SupportedLanguage;

type SettingsState = {
  language: AppLanguage;
  waterReminderEnabled: boolean;
  vibrationEnabled: boolean;
  notificationTypes: NotificationTypes;
  userId?: string;
  loadFromServer: (userId: string) => Promise<void>;
  resetToGuest: () => void;
  setLanguage: (lang: AppLanguage) => void;
  toggleWaterReminder: () => void;
  toggleVibration: () => void;
  toggleNotificationType: (key: keyof NotificationTypes) => void;
};

const STORAGE_KEY = 'organizer-settings';

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => {
      const persistToServer = async () => {
        const currentUserId = get().userId;
        if (!currentUserId) return;
        try {
          await saveUserSettings(currentUserId, {
            language: get().language,
            waterReminderEnabled: get().waterReminderEnabled,
            vibrationEnabled: get().vibrationEnabled,
            notificationTypes: get().notificationTypes,
          });
        } catch (error) {
          console.warn('[useSettings] persist failed', error);
        }
      };

      const loadFromServer = async (userId: string) => {
        try {
          const payload = await fetchUserSettings(userId);
          if (payload) {
            useLanguage.getState().setLanguage(payload.language);
            set({
              language: payload.language,
              waterReminderEnabled: payload.waterReminderEnabled,
              vibrationEnabled: payload.vibrationEnabled,
              notificationTypes: payload.notificationTypes,
              userId,
            });
            return;
          }
          set({ userId });
        } catch (error) {
          console.warn('[useSettings] load failed', error);
          set({ userId });
        }
      };

      const resetToGuest = () => {
        set({
          userId: undefined,
          language: useLanguage.getState().language,
          waterReminderEnabled: false,
          vibrationEnabled: true,
          notificationTypes: DEFAULT_NOTIFICATION_TYPES,
        });
      };

      return {
        language: useLanguage.getState().language,
        waterReminderEnabled: false,
        vibrationEnabled: true,
        notificationTypes: DEFAULT_NOTIFICATION_TYPES,
        userId: undefined,
        loadFromServer,
        resetToGuest,
        setLanguage: (language) => {
          useLanguage.getState().setLanguage(language);
          set({ language });
          void persistToServer();
        },
        toggleWaterReminder: () => {
          set((state) => ({ waterReminderEnabled: !state.waterReminderEnabled }));
          void persistToServer();
        },
        toggleVibration: () => {
          set((state) => ({ vibrationEnabled: !state.vibrationEnabled }));
          void persistToServer();
        },
        toggleNotificationType: (key) => {
          set((state) => ({
            notificationTypes: {
              ...state.notificationTypes,
              [key]: !state.notificationTypes[key],
            },
          }));
          void persistToServer();
        },
      };
    },
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
