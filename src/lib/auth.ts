import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'planora';
const REDIRECT_PATH = 'auth/callback';

export const makeAppRedirectUri = () =>
  AuthSession.makeRedirectUri({
    scheme: APP_SCHEME,
    path: REDIRECT_PATH,
    preferLocalhost: false,
  });

type ParsedOAuthParams = {
  accessToken?: string | null;
  refreshToken?: string | null;
  authCode?: string | null;
  error?: string | null;
  errorDescription?: string | null;
};

const parseOAuthParams = (url: string): ParsedOAuthParams => {
  const parsedUrl = new URL(url);
  const fragment = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  const fragmentParams = new URLSearchParams(fragment);
  const queryParams = parsedUrl.searchParams;

  const getFirst = (key: string) => fragmentParams.get(key) ?? queryParams.get(key);

  return {
    accessToken: getFirst('access_token'),
    refreshToken: getFirst('refresh_token'),
    authCode: getFirst('code'),
    error: getFirst('error'),
    errorDescription: getFirst('error_description'),
  };
};

export const handleOAuthRedirect = async (url: string) => {
  const { accessToken, refreshToken, authCode, error, errorDescription } = parseOAuthParams(url);

  if (error) {
    throw new Error(errorDescription ?? error ?? 'OAuth failed');
  }

  if (authCode) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
    if (exchangeError) {
      console.error('[OAuth] exchangeCodeForSession error', exchangeError);
      throw exchangeError;
    }

    if (!data.session?.refresh_token) {
      throw new Error('OAuth session missing refresh token');
    }

    return data.session;
  }

  if (accessToken && refreshToken) {
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      console.error('[OAuth] setSession error', sessionError);
      throw sessionError;
    }
    return data.session;
  }

  throw new Error('OAuth redirect did not include session data');
};

const startNativeOAuth = async (provider: 'google' | 'apple') => {
  const redirectUri = makeAppRedirectUri();
  console.log(`[Auth:${provider}] redirectUri`, redirectUri);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    console.error(`[Auth:${provider}] signInWithOAuth error`, error);
    throw error;
  }

  if (!data?.url) {
    console.error(`[Auth:${provider}] No auth URL returned`);
    throw new Error('Missing auth URL');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
  const resultUrl = 'url' in result ? result.url : undefined;
  const resultErrorCode = 'errorCode' in result ? result.errorCode : undefined;
  console.log(`[Auth:${provider}] auth result`, {
    type: result.type,
    url: resultUrl,
    errorCode: resultErrorCode,
  });

  // Ensure the in-app browser is closed on iOS even if Expo leaves it around.
  if (Platform.OS === 'ios' && result.type === 'success') {
    // Dismiss failures are non-fatal (e.g., browser already closed), so ignore errors here.
    WebBrowser.dismissBrowser().catch(() => {});
  }

  if (result.type !== 'success' || !resultUrl) {
    throw new Error(`${provider} auth was cancelled or failed`);
  }

  // Handle the redirect payload directly to avoid relying on additional navigation.
  await handleOAuthRedirect(resultUrl);
};

export async function signInWithGoogleNative(): Promise<void> {
  await startNativeOAuth('google');
}

export async function signInWithAppleNative(): Promise<void> {
  await startNativeOAuth('apple');
}
