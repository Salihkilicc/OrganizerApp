import * as AuthSession from 'expo-auth-session';

const redirectOptions = {
  scheme: 'planora',
  path: 'auth/callback',
  preferLocalhost: false,
};

export const getDevRedirect = () => AuthSession.makeRedirectUri(redirectOptions);

export const getProdRedirect = () => AuthSession.makeRedirectUri(redirectOptions);

export const getRedirect = () => AuthSession.makeRedirectUri(redirectOptions);
