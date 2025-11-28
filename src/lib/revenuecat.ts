import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// Entitlement ID exactly as defined in RevenueCat.
export const ENTITLEMENT_ID = 'pro';

const REVENUECAT_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_fDTZBOwOwKRCylSFTSStbRdzleV';
const REVENUECAT_API_KEY_ANDROID =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? 'goog_REPLACE_ME';

let customerInfoListener: ((info: CustomerInfo) => void) | null = null;

const getPlatformApiKey = () =>
  Platform.select({
    ios: REVENUECAT_API_KEY_IOS,
    android: REVENUECAT_API_KEY_ANDROID,
    default: REVENUECAT_API_KEY_IOS,
  }) ?? REVENUECAT_API_KEY_IOS;

export function configureRevenueCat(onCustomerInfo?: (info: CustomerInfo) => void) {
  const apiKey = getPlatformApiKey();
  if (!apiKey) {
    console.warn('[RevenueCat] API key missing for platform', Platform.OS);
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey });

  if (customerInfoListener) {
    Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
  }
  if (onCustomerInfo) {
    Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
    customerInfoListener = onCustomerInfo;
  }
}

export function removeRevenueCatListeners() {
  if (customerInfoListener) {
    Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    customerInfoListener = null;
  }
}

export async function getCurrentOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    console.warn('[RevenueCat] getOfferings failed', error);
    return null;
  }
}

export function getMonthlyAndYearlyPackages(
  offering: PurchasesOffering | null,
): { monthly?: PurchasesPackage; yearly?: PurchasesPackage } {
  if (!offering) {
    return {};
  }

  const monthly =
    offering.monthly ??
    offering.availablePackages.find((pkg) => pkg.product.identifier === 'planora.month');
  const yearly =
    offering.annual ??
    offering.availablePackages.find((pkg) => pkg.product.identifier === 'planora.year');

  return {
    monthly,
    yearly,
  };
}

export async function purchasePackageAndGetCustomerInfo(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  // Force-refresh to avoid stale customerInfo from purchase response.
  return Purchases.getCustomerInfo().catch(() => customerInfo);
}

export async function restoreAndGetCustomerInfo(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return Purchases.getCustomerInfo().catch(() => customerInfo);
}

export function isEntitledToPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]?.isActive);
}
