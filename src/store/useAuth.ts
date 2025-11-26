import { Platform } from 'react-native';
import { create } from 'zustand';

import { signInWithGoogleNative } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { usePoints } from '@/store/usePoints';
import { useWater } from '@/store/useWater';
import { usePlans } from '@/store/usePlans';
import { useSettings } from '@/store/useSettings';
import { usePremium } from '@/store/usePremium';
import type { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  session: Session | null;
  status: 'checking' | 'authenticated' | 'guest';
  isGuest: boolean;
  loading: boolean;
  setFromSession: (session: Session | null) => void;
  markGuest: () => void;
  initAuth: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
};

export const useAuth = create<AuthState>((set) => {
  const setFromSession = (session: Session | null) => {
    if (session?.user) {
      set({
        user: session.user,
        session,
        status: 'authenticated',
        isGuest: false,
      });
      void usePoints.getState().loadFromServer(session.user.id);
      void useWater.getState().loadTodayFromServer(session.user.id);
      void useSettings.getState().loadFromServer(session.user.id);
      void usePlans.getState().loadFromServer(session.user.id);
      void usePremium.getState().loadFromServer(session.user.id);
      return;
    }
    set({
      user: null,
      session: null,
      status: 'guest',
      isGuest: false,
    });
    usePoints.getState().resetToGuest();
    useWater.getState().resetToGuest();
    useSettings.getState().resetToGuest();
    usePlans.getState().resetToGuest();
    usePremium.getState().resetToGuest();
  };

  const markGuest = () => {
    set({
      user: null,
      session: null,
      status: 'guest',
      isGuest: true,
    });
    usePoints.getState().resetToGuest();
    useWater.getState().resetToGuest();
    useSettings.getState().resetToGuest();
    usePlans.getState().resetToGuest();
    usePremium.getState().resetToGuest();
  };

  const initAuth = async () => {
    set({ status: 'checking' });
    try {
      const { data } = await supabase.auth.getSession();
      setFromSession(data.session ?? null);
    } catch (error) {
      console.warn('[Auth] initAuth failed', error);
      setFromSession(null);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
    } finally {
      set({ loading: false });
    }
  };

  const signUp = async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        throw error;
      }
      if (data.session) {
        setFromSession(data.session);
        return;
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      if (signInData.session) {
        setFromSession(signInData.session);
      }
    } finally {
      set({ loading: false });
    }
  };

  const signInWithGoogle = async () => {
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
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('[Auth] signOut error', error);
    }
    setFromSession(null);
  };

  const continueAsGuest = () => {
    markGuest();
  };

  return {
    user: null,
    session: null,
    status: 'checking',
    isGuest: false,
    loading: false,
    setFromSession,
    markGuest,
    initAuth,
    signInWithEmail,
    signUp,
    signInWithGoogle,
    signOut,
    continueAsGuest,
  };
});
