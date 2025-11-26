import { supabase } from '@/lib/supabase';
import type { PlanBlock } from '@/store/usePlans';

export type NotificationTypes = {
  planReminders: boolean;
  focusMode: boolean;
  dailySummary: boolean;
  streakWarning: boolean;
};

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  planReminders: true,
  focusMode: true,
  dailySummary: false,
  streakWarning: true,
};

export type UserSettingsPayload = {
  language: string;
  waterReminderEnabled: boolean;
  vibrationEnabled: boolean;
  notificationTypes: NotificationTypes;
};

export const fetchUserSettings = async (userId: string): Promise<UserSettingsPayload | null> => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('language, water_reminder_enabled, vibration_enabled, notification_types')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return {
    language: data.language ?? 'en',
    waterReminderEnabled: data.water_reminder_enabled ?? false,
    vibrationEnabled: data.vibration_enabled ?? true,
    notificationTypes: data.notification_types ?? DEFAULT_NOTIFICATION_TYPES,
  };
};

export const saveUserSettings = async (
  userId: string,
  payload: UserSettingsPayload,
): Promise<UserSettingsPayload> => {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        id: userId,
        language: payload.language,
        water_reminder_enabled: payload.waterReminderEnabled,
        vibration_enabled: payload.vibrationEnabled,
        notification_types: payload.notificationTypes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select(
      'language, water_reminder_enabled, vibration_enabled, notification_types',
    )
    .single();
  if (error) {
    throw error;
  }
  return {
    language: data.language ?? payload.language,
    waterReminderEnabled: data.water_reminder_enabled ?? payload.waterReminderEnabled,
    vibrationEnabled: data.vibration_enabled ?? payload.vibrationEnabled,
    notificationTypes: data.notification_types ?? payload.notificationTypes,
  };
};

export const fetchUserPlans = async (userId: string): Promise<PlanBlock[]> => {
  const { data, error } = await supabase
    .from('user_plans')
    .select('blocks')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return Array.isArray(data?.blocks) ? data.blocks : [];
};

export const saveUserPlans = async (userId: string, blocks: PlanBlock[]): Promise<PlanBlock[]> => {
  const { data, error } = await supabase
    .from('user_plans')
    .upsert(
      {
        user_id: userId,
        blocks,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('blocks')
    .single();
  if (error) {
    throw error;
  }
  return Array.isArray(data?.blocks) ? data.blocks : blocks;
};

export const fetchUserPremium = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_premium')
    .select('is_premium')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.is_premium ?? false;
};

export const saveUserPremium = async (userId: string, isPremium: boolean): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_premium')
    .upsert(
      {
        id: userId,
        is_premium: isPremium,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('is_premium')
    .single();
  if (error) {
    throw error;
  }
  return data?.is_premium ?? isPremium;
};
