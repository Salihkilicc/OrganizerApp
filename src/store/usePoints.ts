import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'points:v1';

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const todayDate = (): string => formatLocalDate(new Date());

export type DailyPoints = {
  date: string;
  planPoints: number;
  focusPoints: number;
};

type PointsPayload = {
  total: number;
  daily: DailyPoints;
};

const buildDailyPoints = (date: string): DailyPoints => ({
  date,
  planPoints: 0,
  focusPoints: 0,
});

const persistPoints = async (payload: PointsPayload) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[usePoints/persist]', error);
  }
};

const loadPoints = async (set: (state: Partial<PointsState>) => void) => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const today = todayDate();
    let payload: PointsPayload | null = null;
    let shouldPersist = false;

    try {
      const parsed = JSON.parse(trimmed);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.total === 'number' &&
        typeof parsed.daily === 'object' &&
        parsed.daily !== null &&
        typeof parsed.daily.date === 'string' &&
        typeof parsed.daily.planPoints === 'number' &&
        typeof parsed.daily.focusPoints === 'number'
      ) {
        payload = {
          total: parsed.total,
          daily: parsed.daily,
        };
      }
    } catch {
      // fall through to number parsing
    }

    if (!payload) {
      const parsedNumber = Number(trimmed);
      if (Number.isFinite(parsedNumber)) {
        payload = {
          total: parsedNumber,
          daily: buildDailyPoints(today),
        };
        shouldPersist = true;
      }
    }

    if (!payload) return;

    if (payload.daily.date !== today) {
      payload = {
        ...payload,
        daily: buildDailyPoints(today),
      };
      shouldPersist = true;
    }

    set({
      total: payload.total,
      daily: payload.daily,
    });

    if (shouldPersist) {
      void persistPoints(payload);
    }
  } catch (error) {
    console.warn('[usePoints/load]', error);
  }
};

export type PointsState = {
  total: number;
  daily: DailyPoints;
  resetDailyIfNeeded: (today: string) => void;
  addPlanPoints: (amount: number) => void;
  addFocusPoints: (amount: number) => void;
  reset: () => void;
};

export const usePoints = create<PointsState>((set, get) => {
  loadPoints(set);

  const persistCurrent = () => {
    const { total, daily } = get();
    void persistPoints({ total, daily });
  };

  const resetDailyIfNeeded = (today: string) => {
    if (!today) return;
    const { daily, total } = get();
    if (daily.date === today) return;
    const nextDaily = buildDailyPoints(today);
    set({ daily: nextDaily, total });
    void persistPoints({ total, daily: nextDaily });
  };

  const addPlanPoints = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const today = todayDate();
    resetDailyIfNeeded(today);
    set((state) => {
      const daily = {
        ...state.daily,
        planPoints: state.daily.planPoints + amount,
      };
      const total = Math.max(0, state.total + amount);
      return { daily, total };
    });
    persistCurrent();
  };

  const addFocusPoints = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const today = todayDate();
    resetDailyIfNeeded(today);
    set((state) => {
      const daily = {
        ...state.daily,
        focusPoints: state.daily.focusPoints + amount,
      };
      const total = Math.max(0, state.total + amount);
      return { daily, total };
    });
    persistCurrent();
  };

  const reset = () => {
    const today = todayDate();
    const nextDaily = buildDailyPoints(today);
    set({ total: 0, daily: nextDaily });
    void persistPoints({ total: 0, daily: nextDaily });
  };

  return {
    total: 0,
    daily: buildDailyPoints(todayDate()),
    resetDailyIfNeeded,
    addPlanPoints,
    addFocusPoints,
    reset,
  };
});
