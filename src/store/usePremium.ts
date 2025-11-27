import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchUserPremium, saveUserPremium } from '@/lib/account';

const STORAGE_KEY = 'premium:isPremium';

type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  userId?: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loadFromServer: (userId: string) => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
  resetToGuest: () => void;
};

export const usePremium = create<PremiumState>((set, get) => ({
  isPremium: false,
  loading: true,
  userId: undefined,
  hydrated: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({
        isPremium: stored === 'true',
        loading: false,
        hydrated: true,
      });
    } catch (error) {
      console.warn('[usePremium] hydrate failed', error);
      set({
        isPremium: false,
        loading: false,
        hydrated: true,
      });
    }
  },
  loadFromServer: async (userId: string) => {
    try {
      const isPremium = await fetchUserPremium(userId);
      set({
        isPremium,
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
      });
    }
  },
  setPremium: async (value) => {
    set({ isPremium: value });
    const currentUserId = get().userId;
    if (currentUserId) {
      try {
        await saveUserPremium(currentUserId, value);
      } catch (error) {
        console.warn('[usePremium] persist failed', error);
      }
      return;
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.warn('[usePremium] persist failed', error);
    }
  },
  resetToGuest: () => {
    set({
      userId: undefined,
      hydrated: true,
    });
  },
}));
