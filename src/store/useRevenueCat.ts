import { create } from 'zustand';
import Purchases, { type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';

import { useAuth } from '@/store/useAuth';
import { usePremium } from '@/store/usePremium';
import { getCurrentOfferings, isEntitledToPremium } from '@/lib/revenuecat';

type RevenueCatState = {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  reset: () => void;
};

const createInitialState = (): Pick<RevenueCatState, 'customerInfo' | 'currentOffering' | 'loading'> => ({
  customerInfo: null,
  currentOffering: null,
  loading: false,
});

export const useRevenueCatStore = create<RevenueCatState>((set, get) => ({
  ...createInitialState(),

  setCustomerInfo(info) {
    const authState = useAuth.getState();
    const isGuest = !authState.user || authState.status !== 'authenticated' || authState.isGuest;
    if (isGuest) {
      set({ customerInfo: null });
      usePremium.setState((state) => ({
        ...state,
        isPremium: false,
        userId: undefined,
        hydrated: true,
        loading: false,
        manualActive: false,
        expiresAt: null,
      }));
      return;
    }

    set({ customerInfo: info });
    const entitled = isEntitledToPremium(info);
    const premiumState = usePremium.getState();
    const manualValid =
      premiumState.manualActive &&
      (!premiumState.expiresAt || new Date(premiumState.expiresAt).getTime() > Date.now());
    // Keep premium state in sync, but allow manual Supabase grants to coexist.
    usePremium.setState((state) => ({
      ...state,
      isPremium: manualValid || entitled,
      hydrated: true,
      loading: false,
      userId: authState.user?.id,
    }));
  },

  async refresh() {
    if (get().loading) {
      return;
    }
    const authState = useAuth.getState();
    if (!authState.user || authState.isGuest || authState.status !== 'authenticated') {
      set({ ...createInitialState() });
      usePremium.setState((state) => ({
        ...state,
        isPremium: false,
        hydrated: true,
        loading: false,
        userId: undefined,
        manualActive: false,
        expiresAt: null,
      }));
      return;
    }
    set({ loading: true });
    try {
      const [offering, info] = await Promise.all([
        getCurrentOfferings(),
        Purchases.getCustomerInfo().catch((error) => {
          console.warn('[useRevenueCat] getCustomerInfo failed', error);
          return null;
        }),
      ]);
      set({ currentOffering: offering });
      get().setCustomerInfo(info);
    } catch (error) {
      console.warn('[useRevenueCat] refresh failed', error);
      get().setCustomerInfo(null);
    } finally {
      set({ loading: false });
    }
  },

  reset: () => {
    set(createInitialState());
  },
}));
