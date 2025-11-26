import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: AsyncStorage,
  },
});

export const initSupabaseAuthListener = (
  onSessionChange: (session: Session | null) => void,
) => {
  let disposed = false;

  supabase.auth
    .getSession()
    .then(({ data }) => {
      if (disposed) return;
      onSessionChange(data.session ?? null);
    })
    .catch((error) => {
      console.warn('[Supabase] getSession failed', error);
      if (disposed) return;
      onSessionChange(null);
    });

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (disposed) return;
    onSessionChange(session ?? null);
  });

  return () => {
    disposed = true;
    data.subscription.unsubscribe();
  };
};
