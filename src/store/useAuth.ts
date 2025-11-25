import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithGoogleNative } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthUser = User;

export type AuthState = {
  user: AuthUser | null;
  initializing: boolean;
  isGuest: boolean;
  loading: boolean;
  initializeAuth: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  leaveGuestMode: () => Promise<void>;
  continueAsGuest: () => void;
};

let hasInitializedAuth = false;
let authStateSubscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

const GUEST_FLAG_KEY = 'auth:isGuest';

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initializing: true,
  isGuest: false,
  loading: false,

  initializeAuth: async () => {
    if (hasInitializedAuth) {
      set({ initializing: false });
      return;
    }
    hasInitializedAuth = true;
    set({ initializing: true, isGuest: false });

    try {
      const storedGuest = await AsyncStorage.getItem(GUEST_FLAG_KEY);
      const guestFlag = storedGuest === 'true';
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[Auth] getSession error', error);
        set({ user: null, isGuest: guestFlag });
      } else {
        if (data.session?.user) {
          void AsyncStorage.removeItem(GUEST_FLAG_KEY);
        }
        set({ user: data.session?.user ?? null, isGuest: data.session?.user ? false : guestFlag });
      }
    } finally {
      if (!authStateSubscription) {
        const { data } = supabase.auth.onAuthStateChange(
          (event: AuthChangeEvent, session: Session | null) => {
            if (event === 'SIGNED_OUT') {
              void AsyncStorage.removeItem(GUEST_FLAG_KEY);
              set({ user: null, isGuest: false });
              return;
            }
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              void AsyncStorage.removeItem(GUEST_FLAG_KEY);
              set({ user: session?.user ?? null, isGuest: false });
            }
          },
        );
        authStateSubscription = data.subscription;
      }
      set({ initializing: false });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      if (Platform.OS === 'web') {
        const redirectTo =
          typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
        console.log('[Auth] signInWithGoogle web redirect', redirectTo);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: redirectTo ? { redirectTo } : undefined,
        });
        if (error) {
          throw error;
        }
        return;
      }

      await signInWithGoogleNative();
    } catch (err) {
      console.log('[Auth] signInWithGoogle failed', err);
      throw err;
    }
  },

  signOut: async () => {
    const { isGuest } = useAuth.getState();
    if (isGuest) {
      await AsyncStorage.removeItem(GUEST_FLAG_KEY);
      set({ user: null, isGuest: false });
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[Auth] signOut error', error);
    }
    set({ user: null, isGuest: false });
  },

  leaveGuestMode: async () => {
    await AsyncStorage.removeItem(GUEST_FLAG_KEY);
    set({ isGuest: false });
  },

  continueAsGuest: () => {
    void AsyncStorage.setItem(GUEST_FLAG_KEY, 'true');
    set({ user: null, isGuest: true });
  },
}));
