import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogleNative(): Promise<void> {
  const useExpoProxy = Constants.appOwnership === 'expo';
  const redirectUri = useExpoProxy
    ? AuthSession.makeRedirectUri({
        path: 'auth/callback',
        preferLocalhost: false,
      })
    : AuthSession.makeRedirectUri({
        scheme: 'planora',
        path: 'auth/callback',
        preferLocalhost: false,
      });
  console.log('[GoogleAuth] redirectUri', redirectUri, 'appOwnership', Constants.appOwnership);

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
  const resultUrl = 'url' in result ? result.url : undefined;
  const resultErrorCode = 'errorCode' in result ? result.errorCode : undefined;
  console.log('[GoogleAuth] auth result', {
    type: result.type,
    url: resultUrl,
    errorCode: resultErrorCode,
  });
  if (result.type !== 'success' || !resultUrl) {
    throw new Error('Google auth was cancelled or failed');
  }

  const urlObj = new URL(resultUrl);
  const hash = urlObj.hash.startsWith('#') ? urlObj.hash.slice(1) : urlObj.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');
  const errorParam = params.get('error');
  const errorDescription = params.get('error_description');
  console.log('[GoogleAuth] tokens', {
    accessToken,
    refreshToken,
    expiresIn,
    error: errorParam,
    errorDescription,
  });

  if (!accessToken) {
    throw new Error('No access token returned from Google');
  }
  if (!refreshToken) {
    throw new Error('No refresh token returned from Google');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) {
    console.error('[GoogleAuth] setSession error', sessionError);
    throw sessionError;
  }
  console.log('[GoogleAuth] session set', sessionData?.session?.user?.id);
}
