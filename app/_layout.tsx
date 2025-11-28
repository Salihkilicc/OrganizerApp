/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
/* eslint-enable import/no-duplicates */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '@/store/useAuth';
import { useFocusMode } from '@/store/useFocusMode';
import { usePoints } from '@/store/usePoints';
import { useWater } from '@/store/useWater';
import { usePremium } from '@/store/usePremium';
import { getDevRedirect, getProdRedirect } from '@/lib/oauth';
import { useTheme } from '@/store/useTheme';
import { useLanguage } from '@/store/useLanguage';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { useAvatarStore } from '@/store/useAvatar';
import { configureRevenueCat, removeRevenueCatListeners } from '@/lib/revenuecat';
import { ensureInitialized, scheduleWeeklySummary, syncDayNotifications } from '@/lib/notifications';
import { useRevenueCatStore } from '@/store/useRevenueCat';
import { initSupabaseAuthListener } from '@/lib/supabase';
import { usePlans, todayDate } from '@/store/usePlans';
import { useSettings } from '@/store/useSettings';
import { useStreak } from '@/store/useStreak';

// Force SF Pro typography globally so every Text component inherits it.
const SF_PRO_FONT_FAMILY =
  Platform.select({
    ios: 'SF Pro Display',
    web: '"SF Pro Display", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", system-ui, sans-serif',
    default: 'SF Pro Display',
  }) ?? 'System';

const applySfProFont = () => {
  const defaultTextProps = (Text as any).defaultProps ?? {};
  const fontStyle = { fontFamily: SF_PRO_FONT_FAMILY };
  const existingStyle = defaultTextProps.style;
  const combinedStyle = existingStyle
    ? Array.isArray(existingStyle)
      ? [fontStyle, ...existingStyle]
      : [fontStyle, existingStyle]
    : fontStyle;

  (Text as any).defaultProps = {
    ...defaultTextProps,
    style: combinedStyle,
  };
};

applySfProFont();

export const unstable_settings = {
  anchor: '(tabs)',
};

const FOCUS_TICK_INTERVAL_MS = 30 * 1000;

type ErrorBoundaryState = {
  error?: Error;
};

class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Render error]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <Text>
          {String(this.state.error.stack ?? this.state.error.message ?? 'Unknown render error')}
        </Text>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);
  const isGuest = useAuth((state) => state.isGuest);
  const loadTheme = useTheme((state) => state.load);
  const themeKey = useTheme((state) => state.themeKey);
  const palette = useTheme((state) => state.palette);
  const focusTick = useFocusMode((state) => state.tick);
  const pointsHydrated = usePoints((state) => state.hydrated);
  const premiumHydrated = usePremium((state) => state.hydrated);
  const avatarHydrated = useAvatarStore((state) => state.hydrated);
  const setCustomerInfo = useRevenueCatStore((state) => state.setCustomerInfo);
  const [showStartupScreen, setShowStartupScreen] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const isHydrating =
    status === 'checking' || !pointsHydrated || !premiumHydrated || !avatarHydrated;

  useEffect(() => {
    if (isHydrating) {
      setShowStartupScreen(true);
      splashOpacity.setValue(1);
      return;
    }
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 320,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowStartupScreen(false);
      }
    });
  }, [isHydrating, splashOpacity]);
  useEffect(() => {
    const authState = useAuth.getState();
    authState.initAuth().catch((err) => {
      console.log('[Auth] initAuth failed', err);
    });
    const cleanup = initSupabaseAuthListener(authState.setFromSession);
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    ensureInitialized().catch(console.warn);
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    void usePremium.getState().hydrate();
  }, []);

  useEffect(() => {
    void useLanguage.getState().hydrate();
  }, []);

  useEffect(() => {
    void useProfileAppearance.getState().hydrate();
  }, []);

  useEffect(() => {
    configureRevenueCat(setCustomerInfo);
    void useRevenueCatStore.getState().refresh();
    return () => {
      removeRevenueCatListeners();
    };
  }, [setCustomerInfo]);

  useEffect(() => {
    if (status === 'checking') {
      return;
    }

    const inAuthGroup = segments?.[0] === '(auth)';
    const isAuthenticated = status === 'authenticated';
    const isGuestMode = status === 'guest' && isGuest;

    if (!isAuthenticated && !isGuestMode && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, router, segments, isGuest]);

  useEffect(() => {
    if (status === 'checking') {
      return;
    }

    const sessionUserId = user?.id ?? null;
    if (sessionUserId) {
      void usePoints.getState().init(sessionUserId);
      void useWater.getState().init(sessionUserId);
    } else {
      void usePoints.getState().init(null);
      void useWater.getState().init(null);
    }

    void useAvatarStore.getState().loadFromSupabase();
  }, [status, user?.id]);

  useEffect(() => {
    if (__DEV__) {
      console.log('DEV redirect:', getDevRedirect());
      console.log('PROD redirect:', getProdRedirect());
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      focusTick(Date.now());
    }, FOCUS_TICK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [focusTick]);

  useEffect(() => {
    let lastDate = todayDate();
    const syncNotifications = () => {
      const settingsState = useSettings.getState();
      const blocks = usePlans.getState().blocks;
      const streakDays = useStreak.getState().streakDays;
      const date = todayDate();
      void syncDayNotifications({
        date,
        blocks,
        settings: settingsState.notificationTypes,
        streakDays,
        waterReminderEnabled: settingsState.waterReminderEnabled,
      });
      void scheduleWeeklySummary(blocks, settingsState.notificationTypes, streakDays);
    };

    const unsubPlans = usePlans.subscribe(() => syncNotifications());
    const unsubSettings = useSettings.subscribe(() => syncNotifications());
    const unsubWater = useSettings.subscribe(() => syncNotifications());
    syncNotifications();

    const intervalId = setInterval(() => {
      const current = todayDate();
      if (current !== lastDate) {
        lastDate = current;
        syncNotifications();
      }
    }, 60 * 1000);

    return () => {
      unsubPlans();
      unsubSettings();
      unsubWater();
      clearInterval(intervalId);
    };
  }, []);

  const navigatorTheme: Theme = useMemo(() => {
    const baseTheme = themeKey === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: palette.background,
        card: palette.card,
        border: palette.border,
        text: palette.text,
      },
    };
  }, [themeKey, palette]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ThemeProvider value={navigatorTheme}>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="points" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="focus" options={{ headerShown: false }} />
              <Stack.Screen name="premium" options={{ headerShown: false }} />
              <Stack.Screen name="paywall" options={{ headerShown: false }} />
              <Stack.Screen name="language" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="privacy" options={{ headerShown: false }} />
              <Stack.Screen name="terms" options={{ headerShown: false }} />
              <Stack.Screen name="support" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
            <StartupOverlay
              visible={showStartupScreen}
              opacity={splashOpacity}
              blocking={isHydrating}
              backgroundColor="#ffffff"
              accentColor={palette.accent}
              cardColor="#ffffff"
            />
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

type StartupOverlayProps = {
  visible: boolean;
  opacity: Animated.Value;
  blocking: boolean;
  backgroundColor: string;
  accentColor: string;
  cardColor?: string;
};

function StartupOverlay({
  visible,
  opacity,
  blocking,
  backgroundColor,
  accentColor,
  cardColor,
}: StartupOverlayProps) {
  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents={blocking ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFillObject,
        styles.splashOverlay,
        { backgroundColor, opacity },
      ]}>
      <View
        style={[
          styles.splashCard,
          {
            backgroundColor: '#ffffff',
            borderColor: '#ffffff',
          },
        ]}>
        <Image source={require('../assets/images/icon.png')} style={styles.splashLogo} />
        <Text style={[styles.splashTitle, { color: '#000000' }]}>Planora</Text>
        <ActivityIndicator color={accentColor} style={styles.splashSpinner} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashCard: {
    width: 260,
    maxWidth: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 32,
    borderWidth: 0,
  },
  splashLogo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  splashTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  splashSpinner: {
    marginTop: 12,
  },
});
