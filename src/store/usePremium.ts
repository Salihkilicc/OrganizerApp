import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'premium:isPremium';

type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  hydrate: () => Promise<void>;
  setPremium: (value: boolean) => Promise<void>;
};

export const usePremium = create<PremiumState>((set) => ({
  isPremium: false,
  loading: true,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({
        isPremium: stored === 'true',
        loading: false,
      });
    } catch (error) {
      console.warn('[usePremium] hydrate failed', error);
      set({
        isPremium: false,
        loading: false,
      });
    }
  },
  setPremium: async (value) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.warn('[usePremium] persist failed', error);
    }
    set({ isPremium: value });
  },
}));
