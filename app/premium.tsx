import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesError, PurchasesPackage } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useRouter } from 'expo-router';
import { useTheme } from '@/store/useTheme';
import { useRevenueCatStore } from '@/store/useRevenueCat';
import { useI18n } from '@/i18n/useI18n';
import {
  ENTITLEMENT_ID,
  getMonthlyAndYearlyPackages,
  isEntitledToPremium,
  purchasePackageAndGetCustomerInfo,
  restoreAndGetCustomerInfo,
} from '@/lib/revenuecat';
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';

type PremiumFeature = {
  icon: string;
  title: string;
  description: string;
};

const TERMS_URL = 'https://planora.app/terms';
const PRIVACY_URL = 'https://planora.app/privacy';

const premiumFeatures: PremiumFeature[] = [
  {
    icon: '🧠',
    title: 'AI Planlama',
    description: 'Gününü saniyeler içinde dengeli ve dolu bir plana çevir.',
  },
  {
    icon: '⏱️',
    title: 'Odak + Streak',
    description: 'Kesintisiz odak oturumları ve seri kırılmasın diye akıllı hatırlatmalar.',
  },
  {
    icon: '🔥',
    title: 'Haftalık Özetler',
    description: 'Tamamladığın planlar, odak saatleri ve ilerleme trendi tek ekranda.',
  },
  {
    icon: '📊',
    title: 'Tema ve Çerçeveler',
    description: 'Kendine özel temalar, çerçeveler ve profil stilleriyle Planora’yı kişiselleştir.',
  },
];

const isPurchasesError = (value: unknown): value is PurchasesError =>
  typeof value === 'object' && value !== null && 'code' in value && 'message' in value;

type TranslateFn = ReturnType<typeof useI18n>['t'];

const formatFriendlyError = (error: unknown, t: TranslateFn) => {
  if (isPurchasesError(error)) {
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return t((d) => d.premium.purchaseCancelled);
    }
    return error.message ?? t((d) => d.premium.purchaseGenericError);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t((d) => d.premium.purchaseGenericError);
};

const getPaywallResultMessage = (
  result: PAYWALL_RESULT | null | undefined,
  t: TranslateFn,
) => {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return t((d) => d.premium.paywallResult.purchased);
    case PAYWALL_RESULT.RESTORED:
      return t((d) => d.premium.paywallResult.restored);
    case PAYWALL_RESULT.CANCELLED:
      return t((d) => d.premium.paywallResult.cancelled);
    case PAYWALL_RESULT.ERROR:
      return t((d) => d.premium.paywallResult.error);
    case PAYWALL_RESULT.NOT_PRESENTED:
      return t((d) => d.premium.paywallResult.notPresented);
    default:
      return null;
  }
};

const formatDateLabel = (value: string | null | undefined, t: TranslateFn) => {
  if (value === null) {
    return t((d) => d.premium.lifetime);
  }
  if (!value) {
    return t((d) => d.premium.never);
  }
  return new Date(value).toLocaleDateString();
};

export default function PremiumScreen() {
  const palette = useTheme((s) => s.palette);
  const router = useRouter();
  const { t } = useI18n();
  const customerInfo = useRevenueCatStore((state) => state.customerInfo);
  const currentOffering = useRevenueCatStore((state) => state.currentOffering);
  const loading = useRevenueCatStore((state) => state.loading);
  const refresh = useRevenueCatStore((state) => state.refresh);
  const setCustomerInfo = useRevenueCatStore((state) => state.setCustomerInfo);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const handleOpenUrl = useCallback((url: string) => {
    Linking.openURL(url).catch((error) =>
      console.warn('[Premium] Failed to open legal link', error),
    );
  }, []);

  useEffect(() => {
    if (!customerInfo || !currentOffering) {
      void refresh();
    }
  }, [currentOffering, customerInfo, refresh]);

  const { monthly, yearly } = useMemo(
    () => getMonthlyAndYearlyPackages(currentOffering),
    [currentOffering],
  );
  const subscriptionPackages = useMemo(() => {
    const list: PurchasesPackage[] = [];
    if (monthly) {
      list.push(monthly);
    }
    if (yearly) {
      list.push(yearly);
    }
    return list;
  }, [monthly, yearly]);
  const entitlement = customerInfo?.entitlements.active[ENTITLEMENT_ID];
  const isPremiumActive = Boolean(entitlement?.isActive);
  const statusColor = isPremiumActive ? palette.accent : palette.text;
  const activeEntitlements = Object.keys(customerInfo?.entitlements.active ?? {});
  const latestExpiration = formatDateLabel(
    entitlement?.expirationDate ?? customerInfo?.latestExpirationDate,
    t,
  );
  const activeSubscriptions = customerInfo?.activeSubscriptions?.length
    ? customerInfo.activeSubscriptions.join(', ')
    : t((d) => d.common.none);
  const recentProduct =
    customerInfo?.allPurchasedProductIdentifiers?.slice(-1).join(', ') ?? t((d) => d.common.none);
  const offeringMissing = !currentOffering;
  const loadingProducts = Boolean(loading);
  const loadingAny = Boolean(loading || purchasingPackageId);

  const handlePurchasePackage = useCallback(
    async (pkg: PurchasesPackage) => {
      setLocalError(null);
      setPurchasingPackageId(pkg.identifier);
      try {
        const info = await purchasePackageAndGetCustomerInfo(pkg);
        setCustomerInfo(info);
        const successMessage = isEntitledToPremium(info)
          ? t((d) => d.premium.purchaseCompleteEntitled)
          : t((d) => d.premium.purchaseCompletePending);
        Alert.alert(t((d) => d.premium.purchaseCompleteTitle), successMessage);
      } catch (error) {
        const message = formatFriendlyError(error, t);
        setLocalError(message);
        Alert.alert(t((d) => d.premium.purchaseFailedTitle), message);
      } finally {
        setPurchasingPackageId(null);
      }
    },
    [setCustomerInfo, t],
  );

  const handleRestore = useCallback(async () => {
    setLocalError(null);
    try {
      const info = await restoreAndGetCustomerInfo();
      setCustomerInfo(info);
      const message = isEntitledToPremium(info)
        ? t((d) => d.premium.restoreCompleteEntitled)
        : t((d) => d.premium.restoreCompleteNone);
      Alert.alert(t((d) => d.premium.restoreCompleteTitle), message);
    } catch (error) {
      const message = formatFriendlyError(error, t);
      setLocalError(message);
      Alert.alert(t((d) => d.premium.restoreFailedTitle), message);
    }
  }, [setCustomerInfo, t]);

  const handleShowPaywall = useCallback(async () => {
    setLocalError(null);
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });
      const message = getPaywallResultMessage(result, t);
      if (message) {
        Alert.alert(t((d) => d.premium.paywallResultTitle), message);
      }
    } catch (error) {
      const message = formatFriendlyError(error, t);
      setLocalError(message);
      Alert.alert(t((d) => d.premium.paywallResultTitle), message);
    } finally {
      void refresh();
    }
  }, [currentOffering, refresh, t]);


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.backIcon, { color: palette.text }]}>←</Text>
          </Pressable>
        </View>

        <Text style={[styles.title, { color: palette.text }]}>Planora Premium</Text>
        <Text style={[styles.subtitle, { color: palette.text, opacity: 0.85 }]}>
          AI destekli planlama, güçlü odak modu ve haftalık özetlerle rutininizi hızlandırın.
        </Text>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              shadowColor: palette.text,
            },
          ]}
        >
          <Text style={[styles.heroEmoji, { color: palette.accent }]}>✨</Text>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, { color: palette.text }]}>
              Her gün daha düzenli bir sen
            </Text>
            <Text style={[styles.heroDescription, { color: palette.text, opacity: 0.75 }]}>
              Planora Premium; AI Plan, odak modu, özetler ve kişiselleştirme ile gününü
              sorunsuzca akıtır.
            </Text>
          </View>
        </View>

        <View style={styles.features}>
          {premiumFeatures.map((feature) => (
            <View
              key={feature.title}
              style={[
                styles.featureRow,
                { borderColor: palette.border, backgroundColor: palette.card },
              ]}
            >
              <View
                style={[
                  styles.featureIcon,
                  {
                    borderColor: palette.accent,
                    backgroundColor: `${palette.accent}20`,
                  },
                ]}
              >
                <Text style={styles.featureIconLabel}>{feature.icon}</Text>
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { color: palette.text }]}>
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: palette.text, opacity: 0.75 },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {t((d) => d.premium.subscriptionStatusTitle)}
            </Text>
            <Text style={[styles.statusBadge, { color: statusColor }]}>
              {isPremiumActive
                ? t((d) => d.premium.statusActiveLabel)
                : t((d) => d.premium.statusInactiveLabel)}
              ,
            </Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>
                {t((d) => d.premium.entitlementsLabel)}
              </Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {activeEntitlements.length ? activeEntitlements.join(', ') : t((d) => d.common.none)}
              </Text>
            </View>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>
                {t((d) => d.premium.expiresLabel)}
              </Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {latestExpiration}
              </Text>
            </View>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>
                {t((d) => d.premium.activeSubscriptionsLabel)}
              </Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {activeSubscriptions}
              </Text>
            </View>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>
                {t((d) => d.premium.lastProductLabel)}
              </Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {recentProduct}
              </Text>
            </View>
          </View>
          {loading && (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loaderText, { color: palette.text }]}>
                {t((d) => d.premium.refreshing)}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.premium.subscriptionOptionsTitle)}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: 0.7 }]}>
            Premium’u açarak tüm Planora özelliklerini sınırsız kullanın.
          </Text>
          {loadingProducts ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loaderText, { color: palette.text }]}>
                {t((d) => d.premium.loadingPlans)}
              </Text>
            </View>
          ) : subscriptionPackages.length ? (
            <View style={styles.packageList}>
              {subscriptionPackages.map((pkg) => (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => handlePurchasePackage(pkg)}
                  disabled={Boolean(purchasingPackageId)}
                  style={({ pressed }) => [
                    styles.packageCard,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      opacity: pressed || Boolean(purchasingPackageId) ? 0.8 : 1,
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.packageTitle, { color: palette.text }]}>
                      {pkg.product.title}
                    </Text>
                    <Text style={[styles.packageDescription, { color: palette.text }]}>
                      {pkg.product.description}
                    </Text>
                  </View>
                  <View style={styles.packageFooter}>
                    <Text style={[styles.packagePrice, { color: palette.accent }]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={[styles.packageTag, { color: palette.text }]}>
                      {pkg.packageType.replace('_', ' ')}
                    </Text>
                  </View>
                  {purchasingPackageId === pkg.identifier && (
                    <ActivityIndicator color={palette.accent} style={styles.packageLoader} />
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <View>
              <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: 0.6 }]}>
                {t((d) => d.premium.noProducts)}
              </Text>
              {offeringMissing && (
                <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: 0.6 }]}>
                  {t((d) => d.premium.loadingPlans)}
                </Text>
              )}
            </View>
          )}
          {localError && <Text style={styles.errorText}>{localError}</Text>}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.premium.toolsTitle)}
          </Text>
          <View style={styles.toolRow}>
            <Pressable
              onPress={handleShowPaywall}
              style={({ pressed }) => [
                styles.toolButton,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.toolLabel, { color: palette.text }]}>
                {t((d) => d.premium.openPaywall)}
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={handleRestore}
            style={({ pressed }) => [
              styles.restoreButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.restoreLabel, { color: palette.text }]}>
              {t((d) => d.premium.restorePurchases)}
            </Text>
          </Pressable>
        </View>

        <View style={styles.legalContainer}>
          <Text style={[styles.infoText, { color: palette.text, opacity: 0.7 }]}>
            Planora Pro is an auto-renewable subscription. Monthly: $2.99/month. Yearly: $19.99/year.
            Payment will be charged to your Apple ID account and your subscription will automatically
            renew unless cancelled at least 24 hours before the end of the current period. You can
            manage or cancel your subscription in your App Store account settings.
          </Text>
          <Text style={[styles.legalText, { color: palette.text, opacity: 0.7 }]}>
            By subscribing you agree to our{' '}
            <Text style={styles.legalLink} onPress={() => handleOpenUrl(TERMS_URL)}>
              Terms of Use
            </Text>{' '}
            and{' '}
            <Text style={styles.legalLink} onPress={() => handleOpenUrl(PRIVACY_URL)}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleShowPaywall}
          disabled={loadingAny}
          style={({ pressed }) => [
            styles.purchaseButton,
            { backgroundColor: palette.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {loadingAny ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseText}>Premium’u Aç</Text>
          )}
        </Pressable>
        <Text style={[styles.purchaseSubtext, { color: palette.text }]}>
          Planora’yı sevmezsen deneme süresinde iptal edebilirsin.
        </Text>
      </View>

      {/* RevenueCat Customer Center removed because the installed UI package version lacks these APIs. */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  heroCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  features: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureIconLabel: {
    fontSize: 20,
  },
  featureCopy: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
    marginBottom: 16,
    textAlign: 'center',
  },
  legalContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  legalLink: {
    color: '#1975ff',
    fontWeight: '700',
  },
  section: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  statusBadge: {
    fontWeight: '700',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusColumn: {
    flex: 1,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loaderText: {
    marginLeft: 10,
    fontSize: 13,
  },
  packageList: {
    marginTop: 8,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  packageTag: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  packageLoader: {
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 6,
  },
  toolRow: {
    marginTop: 12,
  },
  toolButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  restoreLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  purchaseButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  purchaseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  purchaseSubtext: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 14,
    fontWeight: '600',
  },
  customerCenterView: {
    flex: 1,
  },
});
