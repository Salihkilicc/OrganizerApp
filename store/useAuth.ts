import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { getRedirect } from '@/lib/oauth';

type GuestUser = { id: 'guest'; guest: true };

type AuthStore = {
  user: any | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  enterGuestMode: () => void;
};

let hasInitialized = false;

export const useAuth = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  initialize: async () => {
    if (hasInitialized) {
      return;
    }

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
    const currentUser = get().user;

    if (!currentUser) {
      set({ user: null, loading: false });
      return;
    }

    if (currentUser?.guest) {
      set({ user: null, loading: false });
      return;
    }

    set({ loading: true });

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
    }

    set({ user: null, loading: false });
  },
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirect(),
      },
    });

    if (error) {
      alert(error.message);
    }
  },
  enterGuestMode: () => {
    set({ user: { id: 'guest', guest: true }, loading: false });
  },
}));
