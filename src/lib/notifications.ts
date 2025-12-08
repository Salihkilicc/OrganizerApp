import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NotificationTypes } from '@/lib/account';
import type { PlanBlock } from '@/store/usePlans';
import { useSettings } from '@/store/useSettings';
import { translate } from '@/i18n/useI18n';

export enum NotificationKind {
  NEXT_UP = 'NEXT_UP',
  FOCUS_START = 'FOCUS_START',
  FOCUS_END = 'FOCUS_END',
  MISSED_PLAN = 'MISSED_PLAN',
  STREAK_RESCUE = 'STREAK_RESCUE',
  MIDDAY_MILESTONE = 'MIDDAY_MILESTONE',
  BADGE_EARNED = 'BADGE_EARNED',
  WEEKLY_SUMMARY = 'WEEKLY_SUMMARY',
  WATER_REMINDER = 'WATER_REMINDER',
  REFLECTION = 'REFLECTION',
}

type ScheduleOptions = {
  id?: string;
  date?: Date | null;
  title: string;
  body?: string;
  kind: NotificationKind;
};

type DayScheduleContext = {
  date: string;
  blocks: PlanBlock[];
  settings: NotificationTypes;
  streakDays?: number;
  hadFocusSession?: boolean;
  waterReminderEnabled?: boolean;
};

const ANDROID_CHANNEL_ID = 'default';
const NEXT_UP_LEAD_MINUTES = 15;
const MISSED_GRACE_MINUTES = 8;
const MIDDAY_MINUTE_OF_DAY = 12 * 60 + 30;
const REFLECTION_MINUTE_OF_DAY = 21 * 60 + 30;
const STREAK_RESCUE_MINUTE_OF_DAY = 12 * 60;
const WATER_REMINDER_MINUTES = [15 * 60, 19 * 60];
const WEEKLY_SUMMARY_WEEKDAY = 0; // Sunday
const WEEKLY_SUMMARY_MINUTE_OF_DAY = 20 * 60; // 20:00
const REFLECTION_FEATURE_ENABLED = false;

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
const todayDate = (): string => formatLocalDate(new Date());

let initialized = false;
let lastFocusSessionDate: string | null = null;

const clampMinute = (value: number) => Math.max(0, Math.floor(value));

const buildDateFromMinutes = (dateISO: string, minuteOfDay: number): Date | null => {
  if (!dateISO) return null;
  const [year, month, day] = dateISO.split('-').map(Number);
  if ([year, month, day].some((part) => !Number.isFinite(part))) return null;
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  const minutes = clampMinute(minuteOfDay);
  date.setMinutes(minutes);
  return date;
};

const isFutureDate = (target: Date | null): target is Date => {
  if (!target) return false;
  return target.getTime() > Date.now() + 1000;
};

const buildId = (kind: NotificationKind, suffix: string) => `${kind}-${suffix}`;

export async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFFFFF',
    });
  }

  initialized = true;
}

export async function ensurePermissions(): Promise<boolean> {
  await ensureInitialized();
  try {
    const settings = await Notifications.getPermissionsAsync();
    const granted =
      settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (granted) {
      return true;
    }
    const req = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
        allowBadge: false,
      },
    });
    return (
      !!req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn('[notifications] permission error', error);
    return false;
  }
}

export async function scheduleNotification(opts: ScheduleOptions): Promise<string | null> {
  const ok = await ensurePermissions();
  if (!ok) return null;

  const triggerDate = opts.date ?? null;
  const isImmediate = triggerDate === null;
  if (!isImmediate && !isFutureDate(triggerDate)) {
    return null;
  }

  const id = await Notifications.scheduleNotificationAsync({
    identifier: opts.id,
    content: {
      title: opts.title,
      body: opts.body ?? '',
      sound: Platform.OS === 'ios' ? 'default' : undefined,
    },
    trigger: isImmediate
      ? null
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate!,
          channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
        },
  });

  return id;
}

export async function cancelReminder(id: string): Promise<void> {
  if (!id) return;
  await ensureInitialized();
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.warn('[notifications] cancel failed', id, error);
  }
}

export async function cancelMany(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await ensureInitialized();
  await Promise.all(ids.map((id) => cancelReminder(id)));
}

export async function cancelAll(): Promise<void> {
  await ensureInitialized();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendImmediate(kind: NotificationKind, title: string, body?: string) {
  return scheduleNotification({
    id: buildId(kind, `now-${Date.now()}`),
    date: null,
    title,
    body,
    kind,
  });
}

export function addResponseListener(cb: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(cb);
}

export function addReceiveListener(cb: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(cb);
}

const getCompletedCountForDate = (blocks: PlanBlock[], date: string) =>
  blocks.filter((block) => block.date === date && block.done).length;

const hasAnyPlanOnDate = (blocks: PlanBlock[], date: string) =>
  blocks.some((block) => block.date === date);

const getFocusMinutesForWeek = (blocks: PlanBlock[], endDate: string): number => {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const windowStart = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return blocks.reduce((total, block) => {
    const [year, month, day] = block.date.split('-').map(Number);
    if ([year, month, day].some((part) => !Number.isFinite(part))) {
      return total;
    }
    const blockDate = new Date(year, month - 1, day);
    if (blockDate < windowStart || blockDate > end) {
      return total;
    }
    const duration = Math.max(0, block.endMin - block.startMin);
    if (block.done && block.category === 'focus') {
      return total + duration;
    }
    return total;
  }, 0);
};

const getCompletedPlansForWeek = (blocks: PlanBlock[], endDate: string): number => {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const windowStart = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return blocks.filter((block) => {
    const [year, month, day] = block.date.split('-').map(Number);
    if ([year, month, day].some((part) => !Number.isFinite(part))) return false;
    const blockDate = new Date(year, month - 1, day);
    return block.done && blockDate >= windowStart && blockDate <= end;
  }).length;
};

const scheduleNextUpForBlock = async (
  block: PlanBlock,
  date: string,
  settings: NotificationTypes,
) => {
  const id = buildId(NotificationKind.NEXT_UP, block.id);
  await cancelReminder(id);
  if (!settings.enableNextUp) return;
  if (block.done) return;
  if (block.date !== todayDate()) return;
  const scheduleAt = buildDateFromMinutes(date, block.startMin - NEXT_UP_LEAD_MINUTES);
  if (!isFutureDate(scheduleAt)) return;
  const label = block.title || translate((d) => d.notifications.nextUpTitle, { title: '' });
  await scheduleNotification({
    id,
    date: scheduleAt,
    kind: NotificationKind.NEXT_UP,
    title: translate((d) => d.notifications.nextUpTitle, { title: label }),
    body: translate((d) => d.notifications.nextUpBody, { time: formatMinutes(block.startMin) }),
  });
};

const scheduleMissedReminder = async (
  block: PlanBlock,
  date: string,
  settings: NotificationTypes,
) => {
  const id = buildId(NotificationKind.MISSED_PLAN, block.id);
  await cancelReminder(id);
  if (!settings.enableMissedPlans) return;
  if (block.done) {
    return;
  }
  if (block.date !== todayDate()) return;
  const trigger = buildDateFromMinutes(date, block.endMin + MISSED_GRACE_MINUTES);
  if (!isFutureDate(trigger)) return;
  await scheduleNotification({
    id,
    date: trigger,
    kind: NotificationKind.MISSED_PLAN,
    title: translate((d) => d.notifications.missedTitle),
    body: block.title
      ? translate((d) => d.notifications.missedBody, { title: block.title })
      : undefined,
  });
};

const scheduleMiddayMilestone = async (
  ctx: DayScheduleContext,
  completedCount: number,
): Promise<void> => {
  const id = buildId(NotificationKind.MIDDAY_MILESTONE, ctx.date);
  await cancelReminder(id);
  if (!ctx.settings.enableMiddayMilestone) return;
  if (ctx.date !== todayDate()) return;
  if (completedCount < 1) return;
  const trigger = buildDateFromMinutes(ctx.date, MIDDAY_MINUTE_OF_DAY);
  if (!isFutureDate(trigger)) return;
  await scheduleNotification({
    id,
    date: trigger,
    kind: NotificationKind.MIDDAY_MILESTONE,
    title: translate((d) => d.notifications.middayTitle),
    body: translate((d) => d.notifications.middayBody, { count: completedCount }),
  });
};

const scheduleStreakRescue = async (ctx: DayScheduleContext, completedCount: number) => {
  const id = buildId(NotificationKind.STREAK_RESCUE, ctx.date);
  await cancelReminder(id);
  if (!ctx.settings.enableStreakRescue) return;
  if (ctx.date !== todayDate()) return;
  if (!hasAnyPlanOnDate(ctx.blocks, ctx.date)) return;
  if (completedCount > 0) return;
  const trigger = buildDateFromMinutes(ctx.date, STREAK_RESCUE_MINUTE_OF_DAY);
  if (!isFutureDate(trigger)) return;
  await scheduleNotification({
    id,
    date: trigger,
    kind: NotificationKind.STREAK_RESCUE,
    title: translate((d) => d.notifications.streakTitle),
    body: translate((d) => d.notifications.streakBody),
  });
};

const scheduleReflection = async (ctx: DayScheduleContext) => {
  const id = buildId(NotificationKind.REFLECTION, ctx.date);
  await cancelReminder(id);
  if (!REFLECTION_FEATURE_ENABLED) return;
  if (!ctx.settings.enableReflection) return;
  if (ctx.date !== todayDate()) return;
  const hasPlans = hasAnyPlanOnDate(ctx.blocks, ctx.date);
  const hasFocus = ctx.hadFocusSession || lastFocusSessionDate === ctx.date;
  if (!hasPlans && !hasFocus) return;
  const trigger = buildDateFromMinutes(ctx.date, REFLECTION_MINUTE_OF_DAY);
  if (!isFutureDate(trigger)) return;
  await scheduleNotification({
    id,
    date: trigger,
    kind: NotificationKind.REFLECTION,
    title: translate((d) => d.notifications.reflectionTitle),
    body: translate((d) => d.notifications.reflectionBody),
  });
};

const scheduleWaterReminders = async (ctx: DayScheduleContext) => {
  const shouldSend = ctx.waterReminderEnabled && ctx.settings.enableWaterReminders;
  const ids = WATER_REMINDER_MINUTES.map((minute) =>
    buildId(NotificationKind.WATER_REMINDER, `${ctx.date}-${minute}`),
  );
  await cancelMany(ids);
  if (!shouldSend) return;
  if (ctx.date !== todayDate()) return;
  const promises = WATER_REMINDER_MINUTES.map((minute, index) => {
    const trigger = buildDateFromMinutes(ctx.date, minute);
    if (!isFutureDate(trigger)) return null;
    return scheduleNotification({
      id: ids[index],
      date: trigger,
      kind: NotificationKind.WATER_REMINDER,
      title: translate((d) => d.notifications.waterTitle),
      body: translate((d) => d.notifications.waterBody),
    });
  }).filter(Boolean) as Promise<string | null>[];
  await Promise.all(promises);
};

export const syncDayNotifications = async (ctx: DayScheduleContext) => {
  const completedCount = getCompletedCountForDate(ctx.blocks, ctx.date);
  const todaysBlocks = ctx.blocks.filter((block) => block.date === ctx.date);

  await Promise.all(
    todaysBlocks.map(async (block) => {
      await Promise.all([
        scheduleNextUpForBlock(block, ctx.date, ctx.settings),
        scheduleMissedReminder(block, ctx.date, ctx.settings),
      ]);
    }),
  );

  await scheduleMiddayMilestone(ctx, completedCount);
  await scheduleStreakRescue(ctx, completedCount);
  await scheduleReflection(ctx);
  await scheduleWaterReminders(ctx);
};

export const scheduleWeeklySummary = async (
  blocks: PlanBlock[],
  settings: NotificationTypes,
  streakDays: number,
) => {
  const today = todayDate();
  const now = new Date();
  const currentWeekday = now.getDay();
  const daysUntilSunday = (7 + WEEKLY_SUMMARY_WEEKDAY - currentWeekday) % 7;
  const nextSunday = new Date(now);
  nextSunday.setHours(0, 0, 0, 0);
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
  const targetDate = `${nextSunday.getFullYear()}-${String(nextSunday.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(nextSunday.getDate()).padStart(2, '0')}`;
  let triggerDateKey = targetDate;
  let trigger = buildDateFromMinutes(triggerDateKey, WEEKLY_SUMMARY_MINUTE_OF_DAY);
  if (!isFutureDate(trigger)) {
    const followingSunday = new Date(nextSunday);
    followingSunday.setDate(followingSunday.getDate() + 7);
    triggerDateKey = `${followingSunday.getFullYear()}-${String(
      followingSunday.getMonth() + 1,
    ).padStart(2, '0')}-${String(followingSunday.getDate()).padStart(2, '0')}`;
    trigger = buildDateFromMinutes(triggerDateKey, WEEKLY_SUMMARY_MINUTE_OF_DAY);
  }
  const id = buildId(NotificationKind.WEEKLY_SUMMARY, triggerDateKey);
  await cancelReminder(id);
  if (!settings.enableWeeklySummary) return;
  if (!isFutureDate(trigger)) return;

  const completedPlans = getCompletedPlansForWeek(blocks, today);
  const focusMinutes = getFocusMinutesForWeek(blocks, today);
  const focusHours = (focusMinutes / 60).toFixed(1);

  await scheduleNotification({
    id,
    date: trigger,
    kind: NotificationKind.WEEKLY_SUMMARY,
    title: translate((d) => d.notifications.weeklyTitle),
    body: translate((d) => d.notifications.weeklyBody, {
      plans: completedPlans,
      hours: focusHours,
      streak: streakDays,
    }),
  });
};

export const notifyFocusStarted = async () => {
  const today = todayDate();
  lastFocusSessionDate = today;
  const settings = useSettings.getState().notificationTypes;
  if (!settings.enableFocusNotifications) return;
  await sendImmediate(
    NotificationKind.FOCUS_START,
    translate((d) => d.notifications.focusStartTitle),
    translate((d) => d.notifications.focusStartBody),
  );
};

export const notifyFocusCompleted = async (_pointsEarned: number) => {
  const today = todayDate();
  lastFocusSessionDate = today;
  // Focus completion notifications are intentionally disabled.
};

export const notifyBadgeUnlocked = async (title: string) => {
  const settings = useSettings.getState().notificationTypes;
  if (!settings.enableBadgeNotifications) return;
  await sendImmediate(NotificationKind.BADGE_EARNED, `New badge unlocked: ${title}`);
};

const formatMinutes = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
};
