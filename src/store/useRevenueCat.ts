import { create } from 'zustand';
import Purchases, { type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';

import { usePremium } from '@/store/usePremium';
import { getCurrentOfferings, isEntitledToPremium } from '@/lib/revenuecat';

type RevenueCatState = {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setCustomerInfo: (info: CustomerInfo | null) => void;
};

export const useRevenueCatStore = create<RevenueCatState>((set, get) => ({
  customerInfo: null,
  currentOffering: null,
  loading: false,

  setCustomerInfo(info) {
    set({ customerInfo: info });
    const entitled = isEntitledToPremium(info);
    // Keep premium state in sync with RevenueCat entitlement updates.
    usePremium.setState((state) => ({
      ...state,
      isPremium: entitled,
      hydrated: true,
      loading: false,
    }));
  },

  async refresh() {
    if (get().loading) {
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
}));
