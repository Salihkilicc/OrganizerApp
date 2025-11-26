import { supabase } from '@/lib/supabase';

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
const localToday = () => formatLocalDate(new Date());

export type UserPointsRow = {
  id: string;
  user_id: string;
  total_points: number;
  updated_at: string;
};

export type DailyWaterRow = {
  id: string;
  user_id: string;
  day: string;
  bottles_drunk: number;
  bottles_goal: number;
  updated_at: string;
};

export const fetchOrCreateUserPoints = async (userId: string): Promise<UserPointsRow> => {
  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('user_points')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
};

export const incrementUserPoints = async (userId: string, delta: number): Promise<UserPointsRow> => {
  const row = await fetchOrCreateUserPoints(userId);
  const updatedTotal = Math.max(0, row.total_points + delta);

  const { data, error } = await supabase
    .from('user_points')
    .update({ total_points: updatedTotal, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const fetchOrCreateTodayWater = async (
  userId: string,
  today: string,
): Promise<DailyWaterRow> => {
  const { data, error } = await supabase
    .from('daily_water')
    .select('*')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('daily_water')
    .insert({ user_id: userId, day: today })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted;
};

export const updateTodayWater = async (
  userId: string,
  bottlesDrunk: number,
): Promise<DailyWaterRow> => {
  const today = localToday();
  await fetchOrCreateTodayWater(userId, today);

  const { data, error } = await supabase
    .from('daily_water')
    .update({ bottles_drunk: bottlesDrunk, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('day', today)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};
