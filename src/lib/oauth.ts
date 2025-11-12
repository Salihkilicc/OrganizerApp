import * as AuthSession from 'expo-auth-session';

export const getDevRedirect = () => AuthSession.makeRedirectUri({ useProxy: true });

export const getProdRedirect = () => AuthSession.makeRedirectUri({ scheme: 'organizer' });

export const getRedirect = () => (__DEV__ ? getDevRedirect() : getProdRedirect());
