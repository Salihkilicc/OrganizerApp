import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'streak:v1';
const DAY_MS = 24 * 60 * 60 * 1000;

type StreakPayload = {
  streakDays: number;
  lastActiveDate: string | null;
};

export type StreakState = {
  streakDays: number;
  lastActiveDate: string | null;
  initialize: () => Promise<void>;
  bump: (date: string) => Promise<void>;
};

const parseLocalDate = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number);
  if ([year, month, day].some((part) => !Number.isFinite(part))) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isNextDay = (previous: string, next: string): boolean => {
  const prevDate = parseLocalDate(previous);
  const nextDate = parseLocalDate(next);
  if (!prevDate || !nextDate) return false;
  return nextDate.getTime() - prevDate.getTime() === DAY_MS;
};

const persistStreak = async (payload: StreakPayload) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[useStreak/persist]', error);
  }
};

let hasLoaded = false;
const loadStoredStreak = async (set: (state: Partial<StreakState>) => void) => {
  if (hasLoaded) return;
  hasLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.streakDays === 'number' &&
      (typeof parsed.lastActiveDate === 'string' || parsed.lastActiveDate === null)
    ) {
      set({
        streakDays: parsed.streakDays,
        lastActiveDate: parsed.lastActiveDate,
      });
    }
  } catch (error) {
    console.warn('[useStreak/load]', error);
  }
};

export const useStreak = create<StreakState>((set, get) => ({
  streakDays: 0,
  lastActiveDate: null,

  initialize: async () => {
    await loadStoredStreak(set);
  },

  bump: async (date: string) => {
    if (!date) return;
    const { streakDays: currentStreak, lastActiveDate } = get();
    if (lastActiveDate === date) {
      return;
    }

    let nextStreak = 1;
    if (lastActiveDate && isNextDay(lastActiveDate, date)) {
      nextStreak = currentStreak + 1;
    }

    set({ streakDays: nextStreak, lastActiveDate: date });
    await persistStreak({ streakDays: nextStreak, lastActiveDate: date });
  },
}));
