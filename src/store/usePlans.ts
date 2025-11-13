import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

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
    const updated = get().blocks.map((block) =>
      block.id === id
        ? {
            ...block,
            ...patch,
            category: patch.category ?? block.category ?? 'other',
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
