import { supabase } from '@/lib/supabase';
import type { PlanBlock } from '@/store/usePlans';

type LegacyNotificationTypes = {
  planReminders?: boolean;
  focusMode?: boolean;
  dailySummary?: boolean;
  streakWarning?: boolean;
};

export type NotificationTypes = {
  enableNextUp: boolean;
  enableFocusNotifications: boolean;
  enableMissedPlans: boolean;
  enableStreakRescue: boolean;
  enableMiddayMilestone: boolean;
  enableBadgeNotifications: boolean;
  enableWeeklySummary: boolean;
  enableWaterReminders: boolean;
  enableReflection: boolean;
};

export const DEFAULT_NOTIFICATION_TYPES: NotificationTypes = {
  enableNextUp: true,
  enableFocusNotifications: true,
  enableMissedPlans: false,
  enableStreakRescue: true,
  enableMiddayMilestone: true,
  enableBadgeNotifications: true,
  enableWeeklySummary: true,
  enableWaterReminders: true,
  enableReflection: false,
};

export const normalizeNotificationTypes = (
  incoming?: Partial<NotificationTypes> & LegacyNotificationTypes,
): NotificationTypes => {
  const value = incoming ?? {};
  return {
    enableNextUp: value.enableNextUp ?? value.planReminders ?? DEFAULT_NOTIFICATION_TYPES.enableNextUp,
    enableFocusNotifications:
      value.enableFocusNotifications ?? value.focusMode ?? DEFAULT_NOTIFICATION_TYPES.enableFocusNotifications,
    enableMissedPlans: value.enableMissedPlans ?? DEFAULT_NOTIFICATION_TYPES.enableMissedPlans,
    enableStreakRescue:
      value.enableStreakRescue ?? value.streakWarning ?? DEFAULT_NOTIFICATION_TYPES.enableStreakRescue,
    enableMiddayMilestone:
      value.enableMiddayMilestone ?? DEFAULT_NOTIFICATION_TYPES.enableMiddayMilestone,
    enableBadgeNotifications:
      value.enableBadgeNotifications ?? DEFAULT_NOTIFICATION_TYPES.enableBadgeNotifications,
    enableWeeklySummary:
      value.enableWeeklySummary ?? value.dailySummary ?? DEFAULT_NOTIFICATION_TYPES.enableWeeklySummary,
    enableWaterReminders:
      value.enableWaterReminders ?? DEFAULT_NOTIFICATION_TYPES.enableWaterReminders,
    enableReflection: value.enableReflection ?? DEFAULT_NOTIFICATION_TYPES.enableReflection,
  };
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
    waterReminderEnabled: data.water_reminder_enabled ?? true,
    vibrationEnabled: data.vibration_enabled ?? true,
    notificationTypes: normalizeNotificationTypes(data.notification_types ?? DEFAULT_NOTIFICATION_TYPES),
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
    notificationTypes: normalizeNotificationTypes(data.notification_types ?? payload.notificationTypes),
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
