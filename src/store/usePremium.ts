import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchUserPremiumStatus, saveUserPremiumStatus } from '@/lib/account';

const STORAGE_KEY = 'premium:isPremium';

type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  userId?: string;
  hydrated: boolean;
  manualActive: boolean;
  expiresAt: string | null;
  hydrate: () => Promise<void>;
  loadFromServer: (userId: string) => Promise<void>;
  setPremium: (value: boolean, expiresAt?: string | null) => Promise<void>;
  reset: () => void;
  resetToGuest: () => void;
};

const createInitialState = (): Pick<
  PremiumState,
  'isPremium' | 'loading' | 'userId' | 'hydrated' | 'manualActive' | 'expiresAt'
> => ({
  isPremium: false,
  loading: false,
  userId: undefined,
  hydrated: true,
  manualActive: false,
  expiresAt: null,
});

export const usePremium = create<PremiumState>((set, get) => {
  const reset = () => {
    set(createInitialState());
    void AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
      console.warn('[usePremium/reset]', error);
    });
  };

  return {
    ...createInitialState(),
    hydrate: async () => {
      set({ loading: true });
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            manualActive?: boolean;
            expiresAt?: string | null;
          };
          const manualActive = parsed?.manualActive ?? false;
          const expiresAt = parsed?.expiresAt ?? null;
          const manualValid = manualActive && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
          set({
            isPremium: manualValid,
            manualActive,
            expiresAt,
            loading: false,
            hydrated: true,
          });
          return;
        }
        set({
          isPremium: false,
          loading: false,
          hydrated: true,
          manualActive: false,
          expiresAt: null,
        });
      } catch (error) {
        console.warn('[usePremium] hydrate failed', error);
        set({
          isPremium: false,
          loading: false,
          hydrated: true,
          manualActive: false,
          expiresAt: null,
        });
      }
    },
    loadFromServer: async (userId: string) => {
      if (!userId) {
        return;
      }
      try {
        const status = await fetchUserPremiumStatus(userId);
        const manualValid =
          status.manualActive && (!status.expiresAt || new Date(status.expiresAt).getTime() > Date.now());
        set({
          isPremium: manualValid,
          manualActive: status.manualActive,
          expiresAt: status.expiresAt,
          userId,
          loading: false,
          hydrated: true,
        });
      } catch (error) {
        console.warn('[usePremium] load failed', error);
        set({
          userId,
          loading: false,
          hydrated: true,
          manualActive: false,
          expiresAt: null,
        });
      }
    },
    setPremium: async (value, expiresAt = null) => {
      const manualValid = value && (!expiresAt || new Date(expiresAt).getTime() > Date.now());
      set({
        isPremium: manualValid,
        manualActive: value,
        expiresAt,
        hydrated: true,
        loading: false,
      });
      const currentUserId = get().userId;
      if (currentUserId) {
        try {
          await saveUserPremiumStatus(currentUserId, {
            manualActive: value,
            expiresAt,
          });
        } catch (error) {
          console.warn('[usePremium] persist failed', error);
        }
        return;
      }
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ manualActive: value, expiresAt }),
        );
      } catch (error) {
        console.warn('[usePremium] persist failed', error);
      }
    },
    reset,
    resetToGuest: () => {
      reset();
    },
  };
});
