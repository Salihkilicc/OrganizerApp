import { create } from 'zustand';

import { fetchOrCreateUserPoints, incrementUserPoints } from '@/lib/points';

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const todayDate = (): string => formatLocalDate(new Date());

export type DailyPoints = {
  date: string;
  planPoints: number;
  focusPoints: number;
};

const buildDailyPoints = (date: string): DailyPoints => ({
  date,
  planPoints: 0,
  focusPoints: 0,
});

export type PointsState = {
  total: number;
  daily: DailyPoints;
  maxTotal: number;
  focusSessions: number;
  completedPlans: number;
  userId?: string;
  resetDailyIfNeeded: (today: string) => void;
  addPlanPoints: (amount: number) => void;
  addFocusPoints: (amount: number) => void;
  reset: () => void;
  resetToGuest: () => void;
  spendPoints: (amount: number) => boolean;
  recordPlanCompletion: () => void;
  recordFocusSession: () => void;
  init: (userId: string | null) => Promise<void>;
  loadFromServer: (userId: string) => Promise<void>;
  addPoints: (amount: number) => void;
};

export const usePoints = create<PointsState>((set, get) => {
  const applyPoints = (delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) {
      return 0;
    }

    const current = get().total;
    const next = Math.max(0, current + delta);
    const appliedDelta = next - current;
    if (appliedDelta === 0) {
      return 0;
    }

    set((state) => ({
      total: next,
      maxTotal: Math.max(state.maxTotal, next),
    }));

    const { userId } = get();
    if (userId) {
      void incrementUserPoints(userId, appliedDelta).catch((error) => {
        console.error('[usePoints] sync failed', error);
      });
    }

    return appliedDelta;
  };

  const loadFromServer = async (userId: string) => {
    try {
      const row = await fetchOrCreateUserPoints(userId);
      set({
        userId,
        total: row.total_points,
        maxTotal: row.total_points,
        daily: buildDailyPoints(todayDate()),
      });
    } catch (error) {
      console.warn('[usePoints/loadFromServer]', error);
    }
  };

  const resetToGuest = () => {
    set({
      userId: undefined,
      total: 0,
      maxTotal: 0,
      daily: buildDailyPoints(todayDate()),
      focusSessions: 0,
      completedPlans: 0,
    });
  };

  const resetDailyIfNeeded = (today: string) => {
    if (!today) return;
    const { daily } = get();
    if (daily.date === today) return;
    set({ daily: buildDailyPoints(today) });
  };

  const addPoints = (amount: number) => {
    applyPoints(amount);
  };

  const addPlanPoints = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const today = todayDate();
    resetDailyIfNeeded(today);
    set((state) => ({
      daily: {
        ...state.daily,
        planPoints: state.daily.planPoints + amount,
      },
    }));
    addPoints(amount);
  };

  const addFocusPoints = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const today = todayDate();
    resetDailyIfNeeded(today);
    set((state) => ({
      daily: {
        ...state.daily,
        focusPoints: state.daily.focusPoints + amount,
      },
    }));
    addPoints(amount);
  };

  const spendPoints = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const { total } = get();
    if (amount > total) return false;
    applyPoints(-amount);
    return true;
  };

  const recordPlanCompletion = () => {
    set((state) => ({
      completedPlans: state.completedPlans + 1,
    }));
  };

  const recordFocusSession = () => {
    set((state) => ({
      focusSessions: state.focusSessions + 1,
    }));
  };

  const reset = () => {
    set({
      total: 0,
      daily: buildDailyPoints(todayDate()),
      maxTotal: 0,
      focusSessions: 0,
      completedPlans: 0,
    });
  };

  const init = async (userId: string | null) => {
    if (!userId) {
      resetToGuest();
      return;
    }
    if (get().userId === userId) {
      return;
    }
    await loadFromServer(userId);
  };

  return {
    total: 0,
    daily: buildDailyPoints(todayDate()),
    maxTotal: 0,
    focusSessions: 0,
    completedPlans: 0,
    userId: undefined,
    resetDailyIfNeeded,
    addPlanPoints,
    addFocusPoints,
    reset,
    resetToGuest,
    spendPoints,
    recordPlanCompletion,
    recordFocusSession,
    init,
    loadFromServer,
    addPoints,
  };
});
