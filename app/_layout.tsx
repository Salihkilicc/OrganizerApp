import { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import 'react-native-reanimated';

import { useAuth } from '@/store/useAuth';
import { getDevRedirect, getProdRedirect } from '@/lib/oauth';
import { useI18n } from '@/store/useI18n';
import { useTheme } from '@/store/useTheme';
import { ensureInitialized } from '@/lib/notifications';

WebBrowser.maybeCompleteAuthSession();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, initialize } = useAuth();
  const { ready: i18nReady, init: initI18n } = useI18n();
  const loadTheme = useTheme((state) => state.load);
  const themeKey = useTheme((state) => state.themeKey);
  const palette = useTheme((state) => state.palette);

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
    initI18n();
  }, [initI18n]);

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

  const showSplash = loading || !i18nReady;

  if (showSplash) {
    return (
      <ThemeProvider value={navigatorTheme}>
        <Splash backgroundColor={palette.background} />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={navigatorTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
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
