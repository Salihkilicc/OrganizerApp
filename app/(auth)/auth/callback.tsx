import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { handleOAuthRedirect } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const urlFromHook = Linking.useURL();
  const handledRef = useRef(false);

  useEffect(() => {
    const processRedirect = async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      try {
        const existing = await supabase.auth.getSession();
        if (existing.data.session) {
          router.replace('/(tabs)');
          return;
        }

        const fallbackUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();
        const urlToHandle = urlFromHook ?? fallbackUrl;

        if (!urlToHandle) {
          throw new Error('No redirect URL detected');
        }

        await handleOAuthRedirect(urlToHandle);
        router.replace('/(tabs)');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Sign-in failed. Please try again shortly.';
        console.log('[AuthCallback] failed to consume redirect', err);
        setError(message);
        setTimeout(() => router.replace('/(auth)/login'), 400);
      }
    };

    void processRedirect();
  }, [router, urlFromHook]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <ActivityIndicator />
      {error ? (
        <Text style={{ marginTop: 12, textAlign: 'center', color: '#c21c3a' }}>{error}</Text>
      ) : null}
    </View>
  );
}
