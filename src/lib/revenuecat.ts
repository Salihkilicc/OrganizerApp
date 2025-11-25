import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

// NOTE: I will replace this key with my real iOS PUBLIC API key from RevenueCat dashboard.
const REVENUECAT_API_KEY_IOS = "appl_fDTZBOwOwKRCylSFTSStbRdzleV";

// Entitlement ID exactly as defined in RevenueCat (e.g. "sale" or "Sale")
export const ENTITLEMENT_ID = 'pro';

export function configureRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({
    apiKey: REVENUECAT_API_KEY_IOS,
  });
}

export async function getCurrentOfferings(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

export function getMonthlyAndYearlyPackages(
  offering: PurchasesOffering | null,
): { monthly?: PurchasesPackage; yearly?: PurchasesPackage } {
  if (!offering) {
    return {};
  }
  const monthly = offering.availablePackages.find(
    (pkg) => pkg.product.identifier === 'planora.month',
  );
  const yearly = offering.availablePackages.find(
    (pkg) => pkg.product.identifier === 'planora.year',
  );
  return {
    monthly,
    yearly,
  };
}

export async function purchasePackageAndGetCustomerInfo(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restoreAndGetCustomerInfo(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export function isEntitledToPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
}
