import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'points:v1';

export type PointsState = {
  total: number;
  addPoints: (amount: number) => void;
  reset: () => void;
};

const persistTotal = async (total: number) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, total.toString());
  } catch (error) {
    console.warn('[usePoints/persist]', error);
  }
};

const loadTotal = async (set: (state: Partial<PointsState>) => void) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    set({ total: parsed });
  } catch (error) {
    console.warn('[usePoints/load]', error);
  }
};

export const usePoints = create<PointsState>((set, get) => {
  loadTotal(set);

  return {
    total: 0,
    addPoints: (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }
      const next = Math.max(0, get().total + amount);
      set({ total: next });
      persistTotal(next);
    },
    reset: () => {
      set({ total: 0 });
      persistTotal(0);
    },
  };
});
