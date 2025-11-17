import { create } from 'zustand';
import type { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';

import { isEntitlementActive, fetchCustomerInfo, loadOfferings } from '@/lib/revenuecat';
import { usePremium } from '@/store/usePremium';

type RevenueCatState = {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  loadingCustomerInfo: boolean;
  loadingOfferings: boolean;
  error: string | null;
  refreshCustomerInfo: () => Promise<CustomerInfo | null>;
  refreshOfferings: () => Promise<PurchasesOfferings | null>;
  setCustomerInfo: (info: CustomerInfo | null) => void;
  setOfferings: (offerings: PurchasesOfferings | null) => void;
};

const updatePremiumFlag = (info: CustomerInfo | null) => {
  const isPremium = isEntitlementActive(info);
  void usePremium.getState().setPremium(isPremium);
};

export const useRevenueCatStore = create<RevenueCatState>((set) => ({
  customerInfo: null,
  offerings: null,
  loadingCustomerInfo: false,
  loadingOfferings: false,
  error: null,
  refreshCustomerInfo: async () => {
    set({ loadingCustomerInfo: true, error: null });
    try {
      const info = await fetchCustomerInfo();
      updatePremiumFlag(info);
      set({ customerInfo: info, loadingCustomerInfo: false });
      return info;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load customer info';
      set({ error: message, loadingCustomerInfo: false });
      throw error;
    }
  },
  refreshOfferings: async () => {
    set({ loadingOfferings: true, error: null });
    try {
      const offerings = await loadOfferings();
      set({ offerings, loadingOfferings: false });
      return offerings;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load offerings';
      set({ error: message, loadingOfferings: false });
      throw error;
    }
  },
  setCustomerInfo: (info) => {
    updatePremiumFlag(info);
    set({ customerInfo: info });
  },
  setOfferings: (offerings) => set({ offerings }),
}));
