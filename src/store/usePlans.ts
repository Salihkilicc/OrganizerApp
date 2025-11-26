import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { fetchUserPlans, saveUserPlans } from '@/lib/account';
import { usePoints } from '@/store/usePoints';
import { useStreak } from '@/store/useStreak';

export type PlanCategory =
  | 'focus'
  | 'study'
  | 'work'
  | 'gym'
  | 'meeting'
  | 'reading'
  | 'break'
  | 'personal'
  | 'other';

export type PlanBlock = {
  id: string;
  title: string;
  note?: string;
  date: string;
  startMin: number;
  endMin: number;
  color?: string;
  category: PlanCategory;
  createdAt?: string;
  done?: boolean;
  rewarded?: boolean;
  aiGenerated?: boolean;
};

export type PlansStore = {
  blocks: PlanBlock[];
  hydrated: boolean;
  userId?: string;
  load: () => Promise<void>;
  add: (b: Omit<PlanBlock, 'id'>) => Promise<string>;
  addMany: (blocks: Omit<PlanBlock, 'id'>[]) => Promise<string[]>;
  update: (id: string, patch: Partial<PlanBlock>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearByDate: (date: string) => void;
  loadFromServer: (userId: string) => Promise<void>;
  resetToGuest: () => void;
  byDate: (dateISO: string) => PlanBlock[];
  pruneBeforeToday?: () => void;
};

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

export const todayDate = (): string => formatLocalDate(new Date());
export const isBeforeToday = (date: string): boolean => {
  return date < todayDate();
};
export const isToday = (date: string): boolean => {
  return date === todayDate();
};
export const isAfterToday = (date: string): boolean => {
  return date > todayDate();
};

const STORAGE_KEY = 'plans_v1';

const MIN_REWARD_AGE_MINUTES = 30;
const MIN_REWARD_DURATION_MINUTES = 30;
const MAX_PLAN_POINTS_PER_DAY = 300;

const CATEGORY_MULTIPLIER: Record<PlanCategory, number> = {
  focus: 1.4,
  study: 1.3,
  work: 1.2,
  gym: 1.1,
  meeting: 1.0,
  reading: 1.0,
  break: 1.0,
  personal: 1.0,
  other: 1.0,
};

const getCategoryMultiplier = (category: PlanCategory) =>
  CATEGORY_MULTIPLIER[category] ?? CATEGORY_MULTIPLIER.other;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getStreakMultiplier = (streakDays: number): number => {
  if (streakDays >= 30) return 1.3;
  if (streakDays >= 7) return 1.2;
  if (streakDays >= 3) return 1.1;
  return 1.0;
};

type PlanPointsContext = {
  durationMinutes: number;
  category: PlanCategory;
  streakDays: number;
  dailyPlanPoints: number;
};

const calculatePlanPointsToAward = ({
  durationMinutes,
  category,
  streakDays,
  dailyPlanPoints,
}: PlanPointsContext): number => {
  const durationBlocks = Math.max(0, Math.floor(durationMinutes / 30));
  const base = 10;
  const durationBonus = durationBlocks * 2;
  const rawPoints = base + durationBonus;
  const blockPoints = Math.round(rawPoints * getCategoryMultiplier(category));
  const finalPoints = Math.round(blockPoints * getStreakMultiplier(streakDays));
  const remaining = Math.max(0, MAX_PLAN_POINTS_PER_DAY - dailyPlanPoints);
  return clamp(finalPoints, 0, remaining);
};

const hasReachedRewardAge = (block: PlanBlock, now: Date): boolean => {
  if (!block.createdAt) return false;
  const created = new Date(block.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const ageMinutes = (now.getTime() - created.getTime()) / 60000;
  return ageMinutes >= MIN_REWARD_AGE_MINUTES;
};

const isRewardable = (
  block: PlanBlock,
  nextDone: boolean,
  now: Date,
  durationMinutes: number,
  today: string,
): boolean => {
  if (block.rewarded) return false;
  const wasDone = block.done ?? false;
  if (wasDone) return false;
  if (!nextDone) return false;
  if (block.date !== today) return false;
  if (durationMinutes < MIN_REWARD_DURATION_MINUTES) return false;
  return hasReachedRewardAge(block, now);
};

const persistImmediate = async (blocks: PlanBlock[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (error) {
    console.warn('[usePlans/persist]', error);
  }
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
const schedulePersist = (blocks: PlanBlock[]) => {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistImmediate(blocks).catch((error) => {
      console.warn('Failed to persist plans', error);
    });
    persistTimer = null;
  }, 200);
};

const loadBlocks = async (): Promise<PlanBlock[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((block) => ({
        ...block,
        category: block?.category ?? 'other',
        done: block?.done ?? false,
        rewarded: block?.rewarded ?? false,
      }));
    }
  } catch (error) {
    console.warn('Failed to parse stored plans', error);
  }
  return [];
};

const nextId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const mergeBlocks = (loaded: PlanBlock[], existing: PlanBlock[]): PlanBlock[] => {
  if (!existing.length) return loaded;
  const merged = new Map<string, PlanBlock>();
  loaded.forEach((block) => merged.set(block.id, block));
  existing.forEach((block) => merged.set(block.id, block));
  return Array.from(merged.values());
};

export const usePlans = create<PlansStore>((set, get) => {
  const load = async () => {
    const state = get();
    if (state?.hydrated) return;
    try {
      const blocks = await loadBlocks();
      set((prevState) => ({
        blocks: mergeBlocks(blocks, prevState.blocks),
        hydrated: true,
      }));
    } catch (error) {
      console.warn('[usePlans/load]', error);
    }
  };

  const persistRemote = async (blocks: PlanBlock[]) => {
    const currentUserId = get().userId;
    if (!currentUserId) return;
    try {
      await saveUserPlans(currentUserId, blocks);
    } catch (error) {
      console.warn('[usePlans/saveUserPlans]', error);
    }
  };

  const loadFromServer = async (userId: string) => {
    try {
      const remoteBlocks = await fetchUserPlans(userId);
      set({
        blocks: remoteBlocks,
        hydrated: true,
        userId,
      });
      await persistImmediate(remoteBlocks);
    } catch (error) {
      console.warn('[usePlans/loadFromServer]', error);
      set({
        userId,
      });
    }
  };

  const resetToGuest = () => {
    set({
      userId: undefined,
    });
  };

  const store: PlansStore = {
    blocks: [],
    hydrated: false,
    userId: undefined,

    load,

    add: async (block) => {
      const next: PlanBlock = {
        id: nextId(),
        category: block.category ?? 'focus',
        done: false,
        rewarded: false,
        createdAt: new Date().toISOString(),
        ...block,
      };
      const updated = [...get().blocks, next];
      set({ blocks: updated });
      console.log('[usePlans/add]', next);
      schedulePersist(updated);
      void persistRemote(updated);
      return next.id;
    },

    addMany: async (blocks) => {
      if (!blocks.length) return [];
      const now = new Date().toISOString();
      const nextBlocks: PlanBlock[] = blocks.map((block) => ({
        id: nextId(),
        category: block.category ?? 'focus',
        done: false,
        rewarded: false,
        createdAt: now,
        ...block,
      }));
      const updated = [...get().blocks, ...nextBlocks];
      set({ blocks: updated });
      console.log('[usePlans/addMany]', nextBlocks);
      schedulePersist(updated);
      void persistRemote(updated);
      return nextBlocks.map((block) => block.id);
    },

    update: async (id, patch) => {
      console.log('[usePlans/update]', id, patch);
      const existing = get().blocks.find((block) => block.id === id);
      if (!existing) return;
      const nextCategory = patch.category ?? existing.category ?? 'other';
      const wasDone = existing.done ?? false;
      const nextDone = patch.done ?? wasDone;
      const nextStartMin = patch.startMin ?? existing.startMin;
      const nextEndMin = patch.endMin ?? existing.endMin;
      const durationMinutes = Math.max(0, nextEndMin - nextStartMin);
      const now = new Date();
      const today = todayDate();
      const rewardable = isRewardable(existing, nextDone, now, durationMinutes, today);
      let awardedPoints = 0;
      if (rewardable) {
        const pointsState = usePoints.getState();
        pointsState.resetDailyIfNeeded(today);
        const { planPoints } = pointsState.daily;
        const streakDays = useStreak.getState().streakDays;
        awardedPoints = calculatePlanPointsToAward({
          durationMinutes,
          category: nextCategory,
          streakDays,
          dailyPlanPoints: planPoints,
        });
        if (awardedPoints > 0) {
          pointsState.addPlanPoints(awardedPoints);
          // TODO: show +XX pts micro-feedback.
        }
      }
      if (!wasDone && nextDone) {
        void useStreak.getState().bump(existing.date);
        usePoints.getState().recordPlanCompletion();
      }
      const nextRewarded =
        awardedPoints > 0
          ? true
          : patch.rewarded ?? existing.rewarded ?? false;

      const updated = get().blocks.map((block) =>
        block.id === id
          ? {
              ...block,
              ...patch,
              category: nextCategory,
              done: nextDone,
              rewarded: nextRewarded,
            }
          : block,
      );
      set({ blocks: updated });
      schedulePersist(updated);
      void persistRemote(updated);
    },

    remove: async (id) => {
      console.log('[usePlans/remove]', id);
      const updated = get().blocks.filter((block) => block.id !== id);
      set({ blocks: updated });
      schedulePersist(updated);
      void persistRemote(updated);
    },

    clearByDate: (date) => {
      const updated = get().blocks.filter((block) => block.date !== date);
      set({ blocks: updated });
      schedulePersist(updated);
      void persistRemote(updated);
    },

    loadFromServer,
    resetToGuest,

    byDate: (dateISO: string) => {
      return get().blocks.filter((block) => block.date === dateISO);
    },
    pruneBeforeToday: () => {
      const today = todayDate();
      const currentBlocks = get().blocks;
      const filtered = currentBlocks.filter((block) => block.date >= today);
      if (filtered.length === currentBlocks.length) return;
      set({ blocks: filtered });
      schedulePersist(filtered);
      void persistRemote(filtered);
    },
  };

  void Promise.resolve().then(() => store.load());
  return store;
});
