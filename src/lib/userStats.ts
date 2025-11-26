/*
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  points integer NOT NULL DEFAULT 0,
  water_goal integer NOT NULL DEFAULT 5,
  water_drank integer NOT NULL DEFAULT 0,
  water_date date NOT NULL DEFAULT current_date
);
*/
import { supabase } from '@/lib/supabase';

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

const todayDate = (): string => formatLocalDate(new Date());
const DEFAULT_WATER_GOAL = 5;

export type UserStats = {
  points: number;
  waterGoal: number;
  waterDrank: number;
  waterDate: string;
};

let cachedStats: UserStats | null = null;

export const createDefaultUserStats = (overrides: Partial<UserStats> = {}): UserStats => ({
  points: 0,
  waterGoal: DEFAULT_WATER_GOAL,
  waterDrank: 0,
  waterDate: todayDate(),
  ...overrides,
});

const normalizeDate = (value: string | Date | null | undefined): string => {
  if (!value) {
    return todayDate();
  }
  if (typeof value === 'string') {
    return value;
  }
  return formatLocalDate(new Date(value));
};

const mapRowToStats = (row: {
  points: number | null;
  water_goal: number | null;
  water_drank: number | null;
  water_date: string | Date | null;
} | null): UserStats => {
  if (!row) {
    return createDefaultUserStats();
  }
  return {
    points: Number.isFinite(row.points) ? row.points : 0,
    waterGoal: Number.isFinite(row.water_goal) ? row.water_goal : DEFAULT_WATER_GOAL,
    waterDrank: Number.isFinite(row.water_drank) ? row.water_drank : 0,
    waterDate: normalizeDate(row.water_date),
  };
};

export const getCachedUserStats = (): UserStats | null =>
  cachedStats ? { ...cachedStats } : null;
export const setCachedUserStats = (stats: UserStats): void => {
  cachedStats = { ...stats };
};
export const clearCachedUserStats = (): void => {
  cachedStats = null;
};

export const fetchUserStats = async (userId: string): Promise<UserStats> => {
  const { data, error } = await supabase
    .from('user_stats')
    .select('points, water_goal, water_drank, water_date')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRowToStats(data);
};

export const saveUserStats = async (userId: string, stats: UserStats): Promise<void> => {
  const payload = {
    id: userId,
    points: stats.points,
    water_goal: stats.waterGoal,
    water_drank: stats.waterDrank,
    water_date: stats.waterDate,
  };

  const { error } = await supabase.from('user_stats').upsert(payload);
  if (error) {
    throw error;
  }
};
