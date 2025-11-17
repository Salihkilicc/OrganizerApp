import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'profile:appearance';

export type ProfileAppearanceState = {
  frameId: string | null;
  setFrame: (frameId: string | null) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useProfileAppearance = create<ProfileAppearanceState>((set) => ({
  frameId: null,
  setFrame: async (frameId) => {
    try {
      if (frameId) {
        await AsyncStorage.setItem(STORAGE_KEY, frameId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('[useProfileAppearance] persist failed', error);
    }
    set({ frameId });
  },
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ frameId: stored ?? null });
    } catch (error) {
      console.warn('[useProfileAppearance] hydrate failed', error);
    }
  },
}));
