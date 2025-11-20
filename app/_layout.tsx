/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
/* eslint-enable import/no-duplicates */
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import 'react-native-reanimated';

import { useAuth } from '@/store/useAuth';
import { useFocusMode } from '@/store/useFocusMode';
import { usePremium } from '@/store/usePremium';
import { getDevRedirect, getProdRedirect } from '@/lib/oauth';
import { useTheme } from '@/store/useTheme';
import { useLanguage } from '@/store/useLanguage';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { configureRevenueCat, addCustomerInfoListener } from '@/lib/revenuecat';
import { ensureInitialized } from '@/lib/notifications';
import { useRevenueCatStore } from '@/store/useRevenueCat';

WebBrowser.maybeCompleteAuthSession();

// Force SF Pro typography globally so every Text component inherits it.
const SF_PRO_FONT_FAMILY =
  Platform.select({
    ios: 'SF Pro Display',
    web: '"SF Pro Display", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", system-ui, sans-serif',
    default: 'SF Pro Display',
  }) ?? 'System';

const applySfProFont = () => {
  const defaultTextProps = Text.defaultProps ?? {};
  const fontStyle = { fontFamily: SF_PRO_FONT_FAMILY };
  const existingStyle = defaultTextProps.style;
  const combinedStyle = existingStyle
    ? Array.isArray(existingStyle)
      ? [fontStyle, ...existingStyle]
      : [fontStyle, existingStyle]
    : fontStyle;

  Text.defaultProps = {
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
  const { user, loading, initialize } = useAuth();
  const loadTheme = useTheme((state) => state.load);
  const themeKey = useTheme((state) => state.themeKey);
  const palette = useTheme((state) => state.palette);
  const focusTick = useFocusMode((state) => state.tick);
  const refreshCustomerInfo = useRevenueCatStore((state) => state.refreshCustomerInfo);
  const refreshOfferings = useRevenueCatStore((state) => state.refreshOfferings);
  const setCustomerInfo = useRevenueCatStore((state) => state.setCustomerInfo);

  useEffect(() => {
    initialize();
  }, [initialize]);

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
    configureRevenueCat();
    const bootstrap = async () => {
      try {
        await refreshCustomerInfo();
        await refreshOfferings();
      } catch (error) {
        console.error('[RevenueCat] bootstrap failed', error);
      }
    };

    bootstrap();
    const unsubscribe = addCustomerInfoListener((info) => {
      setCustomerInfo(info);
    });

    return () => {
      unsubscribe();
    };
  }, [refreshCustomerInfo, refreshOfferings, setCustomerInfo]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments?.[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [loading, router, segments, user]);

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

  const showSplash = loading;

  if (showSplash) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <ThemeProvider value={navigatorTheme}>
            <Splash backgroundColor={palette.background} />
            <StatusBar style="auto" />
          </ThemeProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    );
  }

  return (
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
            <Stack.Screen name="language" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

type SplashProps = {
  backgroundColor: string;
};

function Splash({ backgroundColor }: SplashProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
      }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
