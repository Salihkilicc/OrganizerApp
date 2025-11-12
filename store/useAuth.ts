// src/store/useAuth.ts
import { supabase } from '@/lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

// ---- Google Sign-In (manual browser) ----
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = __DEV__
    ? AuthSession.makeRedirectUri({}) // DEV: Expo Go
    : AuthSession.makeRedirectUri({ scheme: 'organizer', path: 'auth' }); // PROD: deep link

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const authUrl = data?.url;
  if (!authUrl) throw new Error('Google auth URL alınamadı.');

  WebBrowser.maybeCompleteAuthSession();
  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Kullanıcı Google oturumunu iptal etti.');
  }
}

// ---- Types ----
type GuestUser = { id: 'guest'; guest: true };

export type AuthStore = {
  user: any | GuestUser | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
};

let hasInitialized = false;

// ---- Zustand store (NAMED EXPORT!) ----
export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,

  initialize: async () => {
    if (hasInitialized) return;
    hasInitialized = true;
    set({ loading: true });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Supabase getSession error:', error);
      set({ user: null, loading: false });
    } else {
      set({ user: data.session?.user ?? null, loading: false });
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, loading: false });
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      set({ loading: false });
      return;
    }
    set({ user: data.user ?? null, loading: false });
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
      set({ loading: false });
      return;
    }
    set({ user: data.user ?? null, loading: false });
  },

  signOut: async () => {
    const currentUser = get().user as any;
    if (!currentUser || (currentUser as any)?.guest) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    const { error } = await supabase.auth.signOut();
    if (error) alert(error.message);
    set({ user: null, loading: false });
  },

  enterGuestMode: () => {
    set({ user: { id: 'guest', guest: true }, loading: false });
  },
}));
