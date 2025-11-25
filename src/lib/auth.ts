import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogleNative(): Promise<void> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'planora',
    path: 'auth/callback',
  });
  console.log('[GoogleAuth] redirectUri', redirectUri);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error('[GoogleAuth] signInWithOAuth error', error);
    throw error;
  }

  if (!data?.url) {
    console.error('[GoogleAuth] No auth URL returned');
    throw new Error('Missing Google auth URL');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
  console.log('[GoogleAuth] auth result', result);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google auth was cancelled or failed');
  }

  const urlObj = new URL(result.url);
  const hash = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');
  console.log('[GoogleAuth] tokens', { accessToken, refreshToken, expiresIn });

  if (!accessToken) {
    throw new Error('No access token returned from Google');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
  });
  if (sessionError) {
    console.error('[GoogleAuth] setSession error', sessionError);
    throw sessionError;
  }
  console.log('[GoogleAuth] session set', sessionData?.session?.user?.id);
}
