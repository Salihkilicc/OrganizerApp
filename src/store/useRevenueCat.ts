import { create } from 'zustand';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

import { usePremium } from '@/store/usePremium';
import { getCurrentOfferings, isEntitledToPremium } from '@/lib/revenuecat';

type RevenueCatState = {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setFromCustomerInfo: (info: CustomerInfo | null) => void;
};

export const useRevenueCatStore = create<RevenueCatState>((set, get) => ({
  customerInfo: null,
  currentOffering: null,
  loading: false,

  setFromCustomerInfo(info) {
    set({ customerInfo: info });
    const entitled = isEntitledToPremium(info);
    void usePremium.getState().setPremium(entitled);
  },

  async refresh() {
    if (get().loading) {
      return;
    }
    set({ loading: true });
    try {
      const [offering, purchasesModule] = await Promise.all([
        getCurrentOfferings(),
        import('react-native-purchases'),
      ]);
      const customerInfo = await purchasesModule.default.getCustomerInfo();
      set({ currentOffering: offering });
      get().setFromCustomerInfo(customerInfo);
    } catch (error) {
      console.warn('[useRevenueCat] refresh failed', error);
    } finally {
      set({ loading: false });
    }
  },
}));
