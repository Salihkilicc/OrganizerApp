import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type SchedOptions = {
  id?: string;
  date: Date;
  title: string;
  body?: string;
};

const ANDROID_CHANNEL_ID = 'default';

let _initialized = false;

export async function ensureInitialized(): Promise<void> {
  if (_initialized) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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

  _initialized = true;
}

export async function ensurePermissions(): Promise<boolean> {
  await ensureInitialized();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
      allowAnnouncements: false,
    },
  });
  return !!req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleReminder(opts: SchedOptions): Promise<string> {
  await ensureInitialized();
  const ok = await ensurePermissions();
  if (!ok) throw new Error('Notification permission denied');

  const trigger = opts.date.getTime();
  if (trigger <= Date.now()) {
    throw new Error('Schedule time must be in the future');
  }

  const id = await Notifications.scheduleNotificationAsync({
    identifier: opts.id,
    content: {
      title: opts.title,
      body: opts.body ?? '',
      sound: Platform.OS === 'ios' ? 'default' : undefined,
    },
    trigger: {
      date: opts.date,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });

  return id;
}

export async function cancelReminder(id: string): Promise<void> {
  await ensureInitialized();
  await Notifications.cancelScheduledNotificationAsync(id);
}

export async function cancelAll(): Promise<void> {
  await ensureInitialized();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addResponseListener(cb: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(cb);
}

export function addReceiveListener(cb: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(cb);
}
