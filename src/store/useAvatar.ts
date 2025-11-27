import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { create } from 'zustand';

import {
  AVATAR_NAMES,
  FREE_AVATARS,
  getAvatarPrice,
  type AvatarName,
} from '@/constants/avatars';
import { fetchOrCreateUserAvatar, upsertUserAvatarState } from '@/lib/avatars';
import { useAuth } from '@/store/useAuth';
import { usePoints } from '@/store/usePoints';

type AvatarState = {
  purchasedAvatars: AvatarName[];
  selectedAvatar: AvatarName | null;
  loading: boolean;
  hydrated: boolean;
  loadFromSupabase: () => Promise<void>;
  purchaseAvatar: (name: AvatarName) => Promise<void>;
  selectAvatar: (name: AvatarName) => Promise<void>;
};

const STORAGE_KEY = 'avatars:v1';
const DEFAULT_SELECTION = FREE_AVATARS[0] ?? null;

const isAvatarName = (value: unknown): value is AvatarName =>
  typeof value === 'string' && AVATAR_NAMES.includes(value as AvatarName);

const normalizePurchased = (values: unknown): AvatarName[] => {
  const list = Array.isArray(values) ? values : [];
  const filtered = list.filter((entry): entry is AvatarName => isAvatarName(entry));
  return Array.from(new Set([...FREE_AVATARS, ...filtered]));
};

const persistLocal = async (purchasedAvatars: AvatarName[], selectedAvatar: AvatarName | null) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ purchasedAvatars, selectedAvatar }),
    );
  } catch (error) {
    console.warn('[useAvatar] persist failed', error);
  }
};

const loadCached = async (): Promise<Pick<AvatarState, 'purchasedAvatars' | 'selectedAvatar'>> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { purchasedAvatars: [...FREE_AVATARS], selectedAvatar: DEFAULT_SELECTION };
    }
    const parsed = JSON.parse(raw) as Partial<AvatarState> | null;
    const purchasedAvatars = normalizePurchased(parsed?.purchasedAvatars);
    const selectedAvatar = isAvatarName(parsed?.selectedAvatar ?? null)
      ? parsed?.selectedAvatar ?? null
      : purchasedAvatars[0] ?? DEFAULT_SELECTION;
    return { purchasedAvatars, selectedAvatar };
  } catch (error) {
    console.warn('[useAvatar] cache load failed', error);
    return { purchasedAvatars: [...FREE_AVATARS], selectedAvatar: DEFAULT_SELECTION };
  }
};

export const useAvatarStore = create<AvatarState>((set, get) => {
  const syncState = async (
    purchasedAvatars: AvatarName[],
    selectedAvatar: AvatarName | null,
  ) => {
    set({ purchasedAvatars, selectedAvatar });
    await persistLocal(purchasedAvatars, selectedAvatar);

    const userId = useAuth.getState().user?.id;
    if (!userId) {
      return;
    }

    try {
      await upsertUserAvatarState(userId, purchasedAvatars, selectedAvatar);
    } catch (error) {
      console.warn('[useAvatar] remote sync failed', error);
    }
  };

  const loadFromSupabase = async () => {
    set({ loading: true, hydrated: false });
    const userId = useAuth.getState().user?.id;

    try {
      if (!userId) {
        const cached = await loadCached();
        set({ ...cached, loading: false, hydrated: true });
        return;
      }

      const row = await fetchOrCreateUserAvatar(userId);
      const purchasedAvatars = normalizePurchased(row.purchased_avatars);
      const selectedAvatar = isAvatarName(row.selected_avatar)
        ? row.selected_avatar
        : purchasedAvatars[0] ?? DEFAULT_SELECTION;

      set({ purchasedAvatars, selectedAvatar, loading: false, hydrated: true });
      await persistLocal(purchasedAvatars, selectedAvatar);
    } catch (error) {
      console.warn('[useAvatar] load failed, using cache', error);
      const cached = await loadCached();
        set({ ...cached, loading: false, hydrated: true });
    }
  };

  const selectAvatar = async (name: AvatarName) => {
    const owned = get().purchasedAvatars.includes(name);
    if (!owned) {
      Alert.alert('Locked avatar', 'Unlock this avatar in the Points Shop before selecting it.');
      return;
    }

    set({ loading: true });
    try {
      await syncState(get().purchasedAvatars, name);
    } finally {
      set({ loading: false });
    }
  };

  const purchaseAvatar = async (name: AvatarName) => {
    if (!isAvatarName(name)) {
      return;
    }

    const { purchasedAvatars } = get();
    if (purchasedAvatars.includes(name)) {
      await selectAvatar(name);
      return;
    }

    const price = getAvatarPrice(name);
    if (price > 0) {
      const success = usePoints.getState().spendPoints(price);
      if (!success) {
        Alert.alert('Not enough points', 'You need more points to unlock this avatar.');
        return;
      }
    }

    const updatedPurchased = normalizePurchased([...purchasedAvatars, name]);
    const nextSelected = name;

    set({ loading: true });
    try {
      await syncState(updatedPurchased, nextSelected);
    } finally {
      set({ loading: false });
    }
  };

  return {
    purchasedAvatars: [...FREE_AVATARS],
    selectedAvatar: DEFAULT_SELECTION,
    loading: false,
    hydrated: false,
    loadFromSupabase,
    purchaseAvatar,
    selectAvatar,
  };
});
