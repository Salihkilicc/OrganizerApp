import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { usePoints } from '@/store/usePoints';
import { todayDate } from '@/store/usePlans';

const STORAGE_KEY = 'organizer-water';
export const WATER_BOTTLE_COUNT = 5;

const createDefaultWaterState = () =>
  Array.from({ length: WATER_BOTTLE_COUNT }, () => true);
const createDefaultRewardState = () =>
  Array.from({ length: WATER_BOTTLE_COUNT }, () => false);

const normalizeWaterState = (value?: boolean[]) =>
  Array.from({ length: WATER_BOTTLE_COUNT }, (_, index) => value?.[index] ?? true);
const normalizeRewardState = (value?: boolean[]) =>
  Array.from({ length: WATER_BOTTLE_COUNT }, (_, index) => value?.[index] ?? false);

const hasArrayMismatch = (normalized: boolean[], actual?: boolean[]) => {
  if (!actual || actual.length !== normalized.length) return true;
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] !== actual[index]) {
      return true;
    }
  }
  return false;
};

type WaterState = {
  water: boolean[];
  rewardedToday: boolean[];
  lastResetDate: string | null;
  toggleWater: (index: number) => void;
  resetWater: () => void;
  ensureTodayInitialized: () => void;
  drinkBottle: (index: number) => void;
};

export const useWater = create<WaterState>()(
  persist(
    (set) => {
      const ensureTodayInitialized = () => {
        set((state) => {
          const today = todayDate();
          const normalizedWater = normalizeWaterState(state.water);
          const normalizedRewards = normalizeRewardState(state.rewardedToday);

          if (state.lastResetDate !== today) {
            return {
              lastResetDate: today,
              water: createDefaultWaterState(),
              rewardedToday: createDefaultRewardState(),
            };
          }

          const updates: Partial<WaterState> = {};
          if (hasArrayMismatch(normalizedWater, state.water)) {
            updates.water = normalizedWater;
          }
          if (hasArrayMismatch(normalizedRewards, state.rewardedToday)) {
            updates.rewardedToday = normalizedRewards;
          }
          if (updates.water || updates.rewardedToday) {
            return updates;
          }
          return {};
        });
      };

      const drinkBottle = (index: number) => {
        if (index < 0 || index >= WATER_BOTTLE_COUNT) return;
        ensureTodayInitialized();
        set((state) => {
          const normalizedWater = normalizeWaterState(state.water);
          const normalizedRewards = normalizeRewardState(state.rewardedToday);
          const wasFull = normalizedWater[index];
          if (!wasFull) {
            return {};
          }
          const alreadyRewarded = normalizedRewards[index];

          const nextWater = [...normalizedWater];
          nextWater[index] = false;

          const nextRewards = [...normalizedRewards];
          if (!alreadyRewarded) {
            nextRewards[index] = true;
            usePoints.getState().addPlanPoints(10);
          }

          return {
            water: nextWater,
            rewardedToday: nextRewards,
            lastResetDate: todayDate(),
          };
        });
      };

      const resetWater = () =>
        set({
          water: createDefaultWaterState(),
          rewardedToday: createDefaultRewardState(),
          lastResetDate: todayDate(),
        });

      return {
        water: createDefaultWaterState(),
        rewardedToday: createDefaultRewardState(),
        lastResetDate: null,
        toggleWater: (index) =>
          set((state) => {
            const normalized = normalizeWaterState(state.water);
            if (index < 0 || index >= normalized.length) {
              return state;
            }
            const next = [...normalized];
            next[index] = !next[index];
            return { water: next };
          }),
        resetWater,
        ensureTodayInitialized,
        drinkBottle,
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.water = normalizeWaterState(state.water);
          state.rewardedToday = normalizeRewardState(state.rewardedToday);
          state.lastResetDate = state.lastResetDate ?? null;
        }
      },
    },
  ),
);
