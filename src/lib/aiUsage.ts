import type { SupabaseClient } from '@supabase/supabase-js';

type AiLimitReason = 'limit_reached' | 'guest' | 'error';

export type AiLimitResult = {
  allowed: boolean;
  remaining?: number | '∞';
  reason?: AiLimitReason;
};

const pad = (value: number) => value.toString().padStart(2, '0');
const currentMonthPrefix = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
};

const monthStartDate = () => `${currentMonthPrefix()}-01`;

const isSameMonth = (value?: string | null) => {
  if (!value) return false;
  return value.startsWith(currentMonthPrefix());
};

export const checkAiLimit = async (
  supabase: SupabaseClient,
  isPremium: boolean,
): Promise<AiLimitResult> => {
  if (isPremium) {
    return { allowed: true, remaining: '∞' };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.warn('[checkAiLimit] Failed to fetch user', userError);
    return { allowed: false, reason: 'error' };
  }
  const userId = userData.user?.id;
  if (!userId) {
    return { allowed: false, reason: 'guest' };
  }

  const { data: existing, error } = await supabase
    .from('ai_usage')
    .select('user_id, used_count, last_reset')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[checkAiLimit] Failed to load usage row', error);
    return { allowed: false, reason: 'error' };
  }

  let usage = existing;

  if (!usage) {
    const { data: inserted, error: insertError } = await supabase
      .from('ai_usage')
      .insert({ user_id: userId, used_count: 0, last_reset: monthStartDate() })
      .select('user_id, used_count, last_reset')
      .single();

    if (insertError) {
      console.warn('[checkAiLimit] Failed to create usage row', insertError);
      return { allowed: false, reason: 'error' };
    }

    usage = inserted ?? undefined;
  }

  const lastResetValue =
    typeof usage?.last_reset === 'string'
      ? usage.last_reset
      : usage?.last_reset instanceof Date
        ? usage.last_reset.toISOString().slice(0, 10)
        : null;

  if (!isSameMonth(lastResetValue)) {
    const { data: updated, error: updateError } = await supabase
      .from('ai_usage')
      .update({ used_count: 0, last_reset: monthStartDate() })
      .eq('user_id', userId)
      .select('user_id, used_count, last_reset')
      .single();

    if (updateError) {
      console.warn('[checkAiLimit] Failed to reset usage row', updateError);
      return { allowed: false, reason: 'error' };
    }

    usage = updated ?? usage;
  }

  const usedCount = usage?.used_count ?? 0;

  if (usedCount >= 30) {
    return { allowed: false, reason: 'limit_reached', remaining: 0 };
  }

  return {
    allowed: true,
    remaining: Math.max(0, 30 - usedCount),
  };
};
