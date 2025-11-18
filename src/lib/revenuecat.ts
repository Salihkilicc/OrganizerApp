import { Platform } from 'react-native';

import Purchases, {
  CustomerInfo,
  PACKAGE_TYPE,
  PurchasesError,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesOffering,
} from 'react-native-purchases';
import RevenueCatUI, {
  PAYWALL_RESULT,
  PresentCustomerCenterParams,
  PresentPaywallIfNeededParams,
  PresentPaywallParams,
} from 'react-native-purchases-ui';

export const ORGANIZER_PRO_ENTITLEMENT = 'Organizer Pro';
export const PRODUCT_IDENTIFIERS = {
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
} as const;
export type ProductIdentifier = (typeof PRODUCT_IDENTIFIERS)[keyof typeof PRODUCT_IDENTIFIERS];

const PRODUCT_IDENTIFIER_SET = new Set<string>(Object.values(PRODUCT_IDENTIFIERS));
const PACKAGE_PRIORITY: Partial<Record<PACKAGE_TYPE, number>> = {
  [PACKAGE_TYPE.LIFETIME]: 0,
  [PACKAGE_TYPE.ANNUAL]: 1,
  [PACKAGE_TYPE.MONTHLY]: 2,
  [PACKAGE_TYPE.WEEKLY]: 3,
  [PACKAGE_TYPE.THREE_MONTH]: 4,
  [PACKAGE_TYPE.SIX_MONTH]: 5,
  [PACKAGE_TYPE.TWO_MONTH]: 6,
  [PACKAGE_TYPE.CUSTOM]: 7,
  [PACKAGE_TYPE.UNKNOWN]: 8,
};

const REVENUECAT_API_KEY = 'test_QSlbGcDaxfriPMXHavEkaXDQDUg';
const IS_WEB = Platform.OS === 'web';

let isConfigured = false;

/**
 * Configure the RevenueCat SDK with the public API key and the recommended defaults.
 * Additional configuration can be added here (observer mode, log level, StoreKit version, etc.).
 */
export function configureRevenueCat() {
  if (isConfigured) {
    return;
  }
  if (IS_WEB) {
    isConfigured = true;
    if (__DEV__) {
      console.info('[RevenueCat] Skipping configuration: not supported on web.');
    }
    return;
  }
  Purchases.configure({
    apiKey: REVENUECAT_API_KEY,
    shouldShowInAppMessagesAutomatically: false,
  });
  void Purchases.setDebugLogsEnabled(__DEV__).catch((error) => {
    if (__DEV__) {
      console.info('[RevenueCat] Debug logs not enabled:', error?.message ?? error);
    }
  });
  isConfigured = true;
}

export function addCustomerInfoListener(callback: (info: CustomerInfo) => void) {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}

export async function fetchCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function loadOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function presentPaywall(params: PresentPaywallParams = {}) {
  return RevenueCatUI.presentPaywall(params);
}

export async function presentPaywallIfNeeded(params: PresentPaywallIfNeededParams) {
  return RevenueCatUI.presentPaywallIfNeeded(params);
}

export async function presentCustomerCenter(params?: PresentCustomerCenterParams) {
  return RevenueCatUI.presentCustomerCenter(params);
}

export function isEntitlementActive(info: CustomerInfo | null) {
  return Boolean(info?.entitlements?.active?.[ORGANIZER_PRO_ENTITLEMENT]?.isActive);
}

export function getSupportedPackages(offerings: PurchasesOfferings | null) {
  const currentOffering = getCurrentOffering(offerings);
  if (!currentOffering) {
    return [];
  }
  return currentOffering.availablePackages
    .filter((pkg) => PRODUCT_IDENTIFIER_SET.has(pkg.product.identifier))
    .sort(
      (a, b) =>
        (PACKAGE_PRIORITY[a.packageType] ?? Number.MAX_SAFE_INTEGER) -
        (PACKAGE_PRIORITY[b.packageType] ?? Number.MAX_SAFE_INTEGER),
    );
}

export function getCurrentOffering(
  offerings: PurchasesOfferings | null,
): PurchasesOffering | null {
  if (!offerings) {
    return null;
  }
  if (offerings.current) {
    return offerings.current;
  }
  const first = Object.values(offerings.all ?? {})[0];
  return first ?? null;
}

export function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function getPaywallResultMessage(result: PAYWALL_RESULT | null | undefined) {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'Purchase confirmed via RevenueCat paywall.';
    case PAYWALL_RESULT.RESTORED:
      return 'Restored entitlements via RevenueCat paywall.';
    case PAYWALL_RESULT.CANCELLED:
      return 'Paywall closed without action.';
    case PAYWALL_RESULT.ERROR:
      return 'Paywall encountered an error.';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'Paywall was not presented because entitlement is already active.';
    default:
      return null;
  }
}
