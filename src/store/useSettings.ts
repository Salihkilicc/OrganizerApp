import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_NOTIFICATION_TYPES,
  fetchUserSettings,
  normalizeNotificationTypes,
  NotificationTypes,
  saveUserSettings,
} from '@/lib/account';
import { getCurrentLanguage, isSupportedLanguage, SupportedLanguage, useLanguage } from '@/store/useLanguage';

type AppLanguage = SupportedLanguage;

type SettingsState = {
  language: AppLanguage;
  isLanguageManuallySet: boolean;
  waterReminderEnabled: boolean;
  vibrationEnabled: boolean;
  notificationTypes: NotificationTypes;
  is24Hour: boolean;
  hasSeenCoachmarks: boolean;
  hasSeenInteractiveTour: boolean;
  hasSeenPlanTour: boolean;
  userId?: string;
  loadFromServer: (userId: string) => Promise<void>;
  resetToGuest: () => void;
  setLanguage: (lang: AppLanguage) => void;
  toggleWaterReminder: () => void;
  toggleVibration: () => void;
  toggleNotificationType: (key: keyof NotificationTypes) => void;
  toggleIs24Hour: () => void;
  completeCoachmarks: () => void;
  completeInteractiveTour: () => void;
  completePlanTour: () => void;
  resetTours: () => void;
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
            notificationTypes: normalizeNotificationTypes(get().notificationTypes),
          });
        } catch (error) {
          console.warn('[useSettings] persist failed', error);
        }
      };

      const loadFromServer = async (userId: string) => {
        try {
          const payload = await fetchUserSettings(userId);
          if (payload) {
            let lang = isSupportedLanguage(payload.language) ? payload.language : 'en';

            // Critical Fix: Do NOT overwrite language if the user has manually set it locally.
            // This prevents the app from reverting to 'en' (or server value) right after login/signup.
            if (get().isLanguageManuallySet) {
              // Keep the local language
              lang = get().language;
            } else {
              // Sync from server (e.g. first login on new device)
              useLanguage.getState().setLanguage(lang);
            }

            set({
              language: lang,
              waterReminderEnabled: payload.waterReminderEnabled,
              vibrationEnabled: payload.vibrationEnabled,
              notificationTypes: normalizeNotificationTypes(payload.notificationTypes),
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
        const defaultIs24Hour = getCurrentLanguage() !== 'en';
        set({
          userId: undefined,
          language: useLanguage.getState().language,
          isLanguageManuallySet: false,
          waterReminderEnabled: true,
          vibrationEnabled: true,
          notificationTypes: DEFAULT_NOTIFICATION_TYPES,
          is24Hour: defaultIs24Hour,
        });
      };

      const defaultIs24Hour = getCurrentLanguage() !== 'en';

      return {
        language: useLanguage.getState().language,
        isLanguageManuallySet: false,
        waterReminderEnabled: true,
        vibrationEnabled: true,
        notificationTypes: DEFAULT_NOTIFICATION_TYPES,
        is24Hour: defaultIs24Hour,
        hasSeenCoachmarks: false,
        hasSeenInteractiveTour: false,
        hasSeenPlanTour: false,
        userId: undefined,
        loadFromServer,
        resetToGuest,
        setLanguage: (language) => {
          useLanguage.getState().setLanguage(language);
          set({
            language,
            isLanguageManuallySet: true,
            is24Hour: language === 'tr',
          });
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
              ...normalizeNotificationTypes(state.notificationTypes),
              [key]: !state.notificationTypes[key],
            },
          }));
          void persistToServer();
        },
        toggleIs24Hour: () => {
          set((state) => ({ is24Hour: !state.is24Hour }));
          void persistToServer();
        },
        completeCoachmarks: () => {
          set({ hasSeenCoachmarks: true });
        },
        completeInteractiveTour: () => {
          set({ hasSeenInteractiveTour: true });
        },
        completePlanTour: () => {
          set({ hasSeenPlanTour: true });
        },
        resetTours: () => {
          set({ hasSeenInteractiveTour: false, hasSeenPlanTour: false });
        },
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          useLanguage.getState().setLanguage(state.language);
        }
        if (state?.notificationTypes) {
          state.notificationTypes = normalizeNotificationTypes(state.notificationTypes);
        }
        if (state) {
          state.waterReminderEnabled = state.waterReminderEnabled ?? true;
        }
      },
    },
  ),
);
