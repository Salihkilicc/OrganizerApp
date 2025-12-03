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
  hydrated: boolean;
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

const buildInitialState = (hydrated = true): Pick<PointsState, 'total' | 'daily' | 'maxTotal' | 'focusSessions' | 'completedPlans' | 'userId' | 'hydrated'> => ({
  total: 0,
  daily: buildDailyPoints(todayDate()),
  maxTotal: 0,
  focusSessions: 0,
  completedPlans: 0,
  userId: undefined,
  hydrated,
});

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
    if (!userId) {
      return;
    }
    try {
      const row = await fetchOrCreateUserPoints(userId);
      set({
        userId,
        total: row.total_points,
        maxTotal: row.total_points,
        daily: buildDailyPoints(todayDate()),
        hydrated: true,
      });
    } catch (error) {
      console.warn('[usePoints/loadFromServer]', error);
      set({
        userId,
        hydrated: true,
      });
    }
  };

  const resetToGuest = () => {
    set(buildInitialState(true));
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
    set(buildInitialState());
  };

  const init = async (userId: string | null) => {
    set({ hydrated: false });
    if (!userId) {
      resetToGuest();
      return;
    }
    const current = get();
    if (current.userId === userId && current.hydrated) {
      set({ hydrated: true });
      return;
    }
    await loadFromServer(userId);
    set({ hydrated: true });
  };

  return {
    ...buildInitialState(),
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
