import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { usePoints } from '@/store/usePoints';
import { todayDate } from '@/store/usePlans';
import { fetchOrCreateTodayWater, updateTodayWater } from '@/lib/points';

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

const clampWaterDrank = (value: number) =>
  Math.max(0, Math.min(WATER_BOTTLE_COUNT, Math.floor(value)));
const buildWaterStateFromDrank = (drank: number) => {
  const clamped = clampWaterDrank(drank);
  return Array.from({ length: WATER_BOTTLE_COUNT }, (_, index) => index >= clamped);
};
const buildRewardStateFromDrank = (drank: number) => {
  const clamped = clampWaterDrank(drank);
  return Array.from({ length: WATER_BOTTLE_COUNT }, (_, index) => index < clamped);
};
const deriveDrankFromWaterState = (water: boolean[]) =>
  normalizeWaterState(water).filter((full) => !full).length;

type WaterState = {
  water: boolean[];
  rewardedToday: boolean[];
  lastResetDate: string | null;
  userId?: string;
  bottlesGoal: number;
  toggleWater: (index: number) => void;
  resetWater: () => void;
  ensureTodayInitialized: () => void;
  drinkBottle: (index: number) => void;
  loadTodayFromServer: (userId: string) => Promise<void>;
  init: (userId: string | null) => Promise<void>;
  reset: () => void;
  resetToGuest: () => void;
};

export const useWater = create<WaterState>()(
  persist(
    (set, get) => {
      const buildInitialState = (
        lastResetDate: string | null = todayDate(),
      ): Pick<WaterState, 'water' | 'rewardedToday' | 'lastResetDate' | 'userId' | 'bottlesGoal'> => ({
        water: createDefaultWaterState(),
        rewardedToday: createDefaultRewardState(),
        lastResetDate,
        userId: undefined,
        bottlesGoal: WATER_BOTTLE_COUNT,
      });

      const reset = () => {
        set(buildInitialState());
      };

      const resetToGuest = () => {
        reset();
      };

      const loadTodayFromServer = async (userId: string) => {
        if (!userId) {
          return;
        }
        try {
          const today = todayDate();
          const row = await fetchOrCreateTodayWater(userId, today);
          const nextWater = buildWaterStateFromDrank(row.bottles_drunk);
          set({
            userId,
            water: nextWater,
            rewardedToday: buildRewardStateFromDrank(row.bottles_drunk),
            lastResetDate: today,
            bottlesGoal: row.bottles_goal,
          });
        } catch (error) {
          console.warn('[useWater/loadTodayFromServer]', error);
        }
      };

      const ensureTodayInitialized = () => {
        const today = todayDate();
        let didReset = false;

        set((state) => {
          const normalizedWater = normalizeWaterState(state.water);
          const normalizedRewards = normalizeRewardState(state.rewardedToday);

          if (state.lastResetDate !== today) {
            didReset = true;
            return {
              lastResetDate: today,
              water: createDefaultWaterState(),
              rewardedToday: createDefaultRewardState(),
            };
          }

          const updates: Partial<WaterState> = {};
          if (normalizedWater.some((value, index) => value !== state.water[index])) {
            updates.water = normalizedWater;
          }
          if (normalizedRewards.some((value, index) => value !== state.rewardedToday[index])) {
            updates.rewardedToday = normalizedRewards;
          }
          if (Object.keys(updates).length) {
            return updates;
          }
          return {};
        });

        if (didReset) {
          set({
            bottlesGoal: WATER_BOTTLE_COUNT,
          });
        }
      };

      const toggleWater = (index: number) => {
        set((state) => {
          const normalized = normalizeWaterState(state.water);
          if (index < 0 || index >= normalized.length) {
            return state;
          }
          const next = [...normalized];
          next[index] = !next[index];
          return { water: next };
        });
      };

      const resetWater = () => {
        const today = todayDate();
        set({
          water: createDefaultWaterState(),
          rewardedToday: createDefaultRewardState(),
          lastResetDate: today,
          bottlesGoal: WATER_BOTTLE_COUNT,
        });
      };

      const drinkBottle = (index: number) => {
        const today = todayDate();
        let completedCount = 0;
        let shouldAward = false;
        let didChange = false;

        set((state) => {
          const normalizedWater = normalizeWaterState(state.water);
          if (!normalizedWater[index]) {
            return {};
          }
          const normalizedRewards = normalizeRewardState(state.rewardedToday);
          const alreadyRewarded = normalizedRewards[index];
          const nextWater = [...normalizedWater];
          nextWater[index] = false;
          const nextRewards = [...normalizedRewards];
          if (!alreadyRewarded) {
            nextRewards[index] = true;
            shouldAward = true;
          }
          completedCount = deriveDrankFromWaterState(nextWater);
          didChange = true;
          return {
            water: nextWater,
            rewardedToday: nextRewards,
            lastResetDate: today,
          };
        });

        if (!didChange) {
          return;
        }

        if (shouldAward) {
          usePoints.getState().addPoints(5);
        }

        const userId = get().userId;
        if (userId) {
          void updateTodayWater(userId, completedCount).catch((error) => {
            console.error('[useWater] updateTodayWater failed', error);
          });
        }
      };

      const init = async (userId: string | null) => {
        if (!userId) {
          resetToGuest();
          return;
        }
        if (get().userId === userId) {
          return;
        }
        await loadTodayFromServer(userId);
      };

      return {
        ...buildInitialState(null),
        toggleWater,
        resetWater,
        ensureTodayInitialized,
        drinkBottle,
        loadTodayFromServer,
        init,
        reset,
        resetToGuest,
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
            state.bottlesGoal = state.bottlesGoal ?? WATER_BOTTLE_COUNT;
            state.userId = undefined;
          }
        },
      },
  ),
);
