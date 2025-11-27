import { FREE_AVATARS, type AvatarName } from '@/constants/avatars';
import { supabase } from '@/lib/supabase';

export type UserAvatarRow = {
  id: string;
  user_id: string;
  purchased_avatars: string[];
  selected_avatar: string | null;
  created_at: string;
};

const normalizeRow = (row: UserAvatarRow): UserAvatarRow => ({
  ...row,
  purchased_avatars: Array.isArray(row.purchased_avatars) ? row.purchased_avatars : [],
  selected_avatar: row.selected_avatar ?? null,
});

export const fetchOrCreateUserAvatar = async (userId: string): Promise<UserAvatarRow> => {
  const { data, error } = await supabase
    .from('user_avatars')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return normalizeRow(data);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('user_avatars')
    .insert({
      user_id: userId,
      purchased_avatars: FREE_AVATARS,
      selected_avatar: FREE_AVATARS[0] ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  return normalizeRow(inserted);
};

export const upsertUserAvatarState = async (
  userId: string,
  purchasedAvatars: AvatarName[],
  selectedAvatar: AvatarName | null,
): Promise<UserAvatarRow> => {
  const { data, error } = await supabase
    .from('user_avatars')
    .upsert(
      {
        user_id: userId,
        purchased_avatars: purchasedAvatars,
        selected_avatar: selectedAvatar,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return normalizeRow(data);
};
