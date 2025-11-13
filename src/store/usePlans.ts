import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { usePoints } from '@/store/usePoints';

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
};

export type PlansStore = {
  blocks: PlanBlock[];
  load: () => Promise<void>;
  add: (b: Omit<PlanBlock, 'id'>) => Promise<string>;
  update: (id: string, patch: Partial<PlanBlock>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  byDate: (dateISO: string) => PlanBlock[];
};

const STORAGE_KEY = 'plans_v1';

const MIN_REWARD_AGE_MINUTES = 30;
const REWARD_POINTS = 10;

const hasReachedRewardAge = (block: PlanBlock, now: Date): boolean => {
  if (!block.createdAt) return false;
  const created = new Date(block.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  const ageMinutes = (now.getTime() - created.getTime()) / 60000;
  return ageMinutes >= MIN_REWARD_AGE_MINUTES;
};

const isRewardable = (block: PlanBlock, nextDone: boolean, now: Date): boolean => {
  if (block.rewarded) return false;
  const wasDone = block.done ?? false;
  if (wasDone) return false;
  if (!nextDone) return false;
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

export const usePlans = create<PlansStore>((set, get) => ({
  blocks: [],

  load: async () => {
    const blocks = await loadBlocks();
    set({ blocks });
  },

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
    return next.id;
  },

  update: async (id, patch) => {
    console.log('[usePlans/update]', id, patch);
    const existing = get().blocks.find((block) => block.id === id);
    if (!existing) return;
    const nextCategory = patch.category ?? existing.category ?? 'other';
    const nextDone = patch.done ?? existing.done ?? false;
    const now = new Date();
    const rewardable = isRewardable(existing, nextDone, now);
    if (rewardable) {
      usePoints.getState().addPoints(REWARD_POINTS);
    }
    const nextRewarded = rewardable
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
  },

  remove: async (id) => {
    console.log('[usePlans/remove]', id);
    const updated = get().blocks.filter((block) => block.id !== id);
    set({ blocks: updated });
    schedulePersist(updated);
  },

  byDate: (dateISO: string) => {
    return get().blocks.filter((block) => block.date === dateISO);
  },
}));
