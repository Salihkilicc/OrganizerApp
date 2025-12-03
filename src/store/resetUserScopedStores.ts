import { usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { usePremium } from '@/store/usePremium';
import { useRevenueCatStore } from '@/store/useRevenueCat';
import { useStreak } from '@/store/useStreak';
import { useWater } from '@/store/useWater';
import { useAvatarStore } from '@/store/useAvatar';

// On logout/guest, clear user-scoped data so previous account's plans/points/water/streak/premium are not visible in guest mode (App Store privacy).
export const resetUserScopedStores = () => {
  usePlans.getState().reset();
  usePoints.getState().reset();
  void useStreak.getState().reset();
  useWater.getState().reset();
  usePremium.getState().reset();
  useRevenueCatStore.getState().reset();
  void useAvatarStore.getState().reset();
};
