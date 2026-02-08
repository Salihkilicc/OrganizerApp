import { create } from 'zustand';

import { todayDate, usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';

const MINUTE_MS = 60 * 1000;
const MAX_FOCUS_POINTS_PER_DAY = 90;
const FOCUS_RESTART_SUPPRESSION_MS = 2000;

type FocusStartOptions = {
  blockId?: string;
  markDoneOnCompletion?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
let suppressStartNotificationUntil = 0;

export type FocusModeState = {
  active: boolean;
  remainingMinutes: number;
  totalMinutes: number;
  accumulatedMinutes: number;
  lastTickAt?: number;
  startedAt?: number;
  sessionId?: string;
  linkedBlockId?: string | null;
  markDoneOnCompletion?: boolean;
  start: (initialMinutes: number, options?: FocusStartOptions) => void;
  startFocusForBlock: (blockId: string, durationMinutes: number) => void;
  exit: (options?: { completed?: boolean }) => void;
  addMinutes: (extra: number) => void;
  tick: (now: number) => void;
};

const sanitizeMinutes = (value: number) => Math.max(0, Math.floor(value));

export const useFocusMode = create<FocusModeState>((set, get) => ({
  active: false,
  remainingMinutes: 0,
  totalMinutes: 0,
  accumulatedMinutes: 0,
  linkedBlockId: undefined,
  markDoneOnCompletion: false,
  start(initialMinutes, options?: FocusStartOptions) {
    if (!Number.isFinite(initialMinutes)) {
      return;
    }

    const duration = sanitizeMinutes(initialMinutes);
    if (duration <= 0) {
      return;
    }

    if (get().active) {
      get().exit();
    }

    const now = Date.now();
    const sessionId = `${now}-${Math.random().toString(36).slice(2, 10)}`;
    set({
      active: true,
      remainingMinutes: duration,
      totalMinutes: duration,
      accumulatedMinutes: 0,
      startedAt: now,
      lastTickAt: now,
      sessionId,
      linkedBlockId: options?.blockId ?? undefined,
      markDoneOnCompletion: options?.markDoneOnCompletion ?? false,
    });
    suppressStartNotificationUntil = 0;
  },
  startFocusForBlock(blockId, durationMinutes) {
    if (!blockId) {
      return;
    }
    const duration = sanitizeMinutes(durationMinutes);
    if (duration <= 0) {
      return;
    }
    get().start(duration, { blockId, markDoneOnCompletion: true });
  },
  exit(options?: { completed?: boolean }) {
    const state = get();
    if (!state.active) {
      return;
    }

    const rewardMinutes = state.accumulatedMinutes;
    const pointsState = usePoints.getState();
    let awardedPoints = 0;
    if (rewardMinutes > 0) {
      pointsState.recordFocusSession();
    }

    const shouldMarkDone =
      Boolean(options?.completed) &&
      state.markDoneOnCompletion &&
      typeof state.linkedBlockId === 'string';
    const blockIdToComplete = shouldMarkDone ? state.linkedBlockId : undefined;

    set({
      active: false,
      remainingMinutes: 0,
      totalMinutes: 0,
      accumulatedMinutes: 0,
      startedAt: undefined,
      lastTickAt: undefined,
      sessionId: undefined,
      linkedBlockId: undefined,
      markDoneOnCompletion: false,
    });
    suppressStartNotificationUntil = Date.now() + FOCUS_RESTART_SUPPRESSION_MS;

    if (rewardMinutes > 0) {
      const today = todayDate();
      pointsState.resetDailyIfNeeded(today);
      const remaining = Math.max(
        0,
        MAX_FOCUS_POINTS_PER_DAY - pointsState.daily.focusPoints,
      );
      const toAward = clamp(rewardMinutes, 0, remaining);
      awardedPoints = toAward;
      if (toAward > 0) {
        pointsState.addFocusPoints(toAward);
      }
    }

    if (blockIdToComplete) {
      void usePlans.getState().update(blockIdToComplete, { done: true });
    }

    // Skip completion notification on exit to avoid extra alerts.
  },
  addMinutes(extra) {
    if (!get().active) {
      return;
    }

    if (!Number.isFinite(extra)) {
      return;
    }

    const rounded = sanitizeMinutes(extra);
    if (rounded <= 0) {
      return;
    }

    set((state) => ({
      remainingMinutes: state.remainingMinutes + rounded,
      totalMinutes: state.totalMinutes + rounded,
    }));
  },
  tick(now) {
    const state = get();
    if (!state.active) {
      return;
    }

    const lastTick = state.lastTickAt ?? state.startedAt;
    if (!lastTick) {
      return;
    }

    const elapsed = Math.floor((now - lastTick) / MINUTE_MS);
    if (elapsed <= 0) {
      return;
    }

    const delta = Math.min(elapsed, state.remainingMinutes);
    if (delta <= 0) {
      return;
    }

    const nextRemaining = Math.max(0, state.remainingMinutes - delta);
    set({
      accumulatedMinutes: state.accumulatedMinutes + delta,
      remainingMinutes: nextRemaining,
      lastTickAt: lastTick + delta * MINUTE_MS,
    });

    if (nextRemaining <= 0) {
      get().exit({ completed: true });
    }
  },
}));
