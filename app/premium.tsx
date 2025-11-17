import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { useRouter } from 'expo-router';
import { useTheme } from '@/store/useTheme';
import { useRevenueCatStore } from '@/store/useRevenueCat';
import { useTranslation } from '@/i18n';
import type { TranslationKey } from '@/i18n/translations';
import {
  getCurrentOffering,
  getPaywallResultMessage,
  getSupportedPackages,
  isEntitlementActive,
  isPurchasesError,
  ORGANIZER_PRO_ENTITLEMENT,
  presentCustomerCenter,
  presentPaywallIfNeeded,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenuecat';
import { PURCHASES_ERROR_CODE } from '@revenuecat/purchases-typescript-internal';

type PremiumFeature = {
  icon: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

const premiumFeatures: PremiumFeature[] = [
  {
    icon: '🧠',
    titleKey: 'premium.feature.aiPlanning',
    descriptionKey: 'premium.feature.aiPlanningDesc',
  },
  {
    icon: '⏱️',
    titleKey: 'premium.feature.focusMode',
    descriptionKey: 'premium.feature.focusModeDesc',
  },
  {
    icon: '🔥',
    titleKey: 'premium.feature.streaks',
    descriptionKey: 'premium.feature.streaksDesc',
  },
  {
    icon: '📊',
    titleKey: 'premium.feature.weeklySummary',
    descriptionKey: 'premium.feature.weeklySummaryDesc',
  },
];

const formatFriendlyError = (error: unknown) => {
  if (isPurchasesError(error)) {
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return 'The purchase was cancelled.';
    }
    return error.message ?? 'Unable to complete the transaction.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Try again later.';
};

const formatDateLabel = (value?: string | null) => {
  if (value === null) {
    return 'Lifetime';
  }
  if (!value) {
    return 'Never';
  }
  return new Date(value).toLocaleDateString();
};

export default function PremiumScreen() {
  const palette = useTheme((s) => s.palette);
  const router = useRouter();
  const { t } = useTranslation();
  const customerInfo = useRevenueCatStore((state) => state.customerInfo);
  const offerings = useRevenueCatStore((state) => state.offerings);
  const loadingOfferings = useRevenueCatStore((state) => state.loadingOfferings);
  const loadingCustomerInfo = useRevenueCatStore((state) => state.loadingCustomerInfo);
  const storeError = useRevenueCatStore((state) => state.error);
  const refreshCustomerInfo = useRevenueCatStore((state) => state.refreshCustomerInfo);
  const refreshOfferings = useRevenueCatStore((state) => state.refreshOfferings);
  const setCustomerInfo = useRevenueCatStore((state) => state.setCustomerInfo);
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!offerings) {
      void refreshOfferings();
    }
  }, [offerings, refreshOfferings]);

  useEffect(() => {
    if (!customerInfo) {
      void refreshCustomerInfo();
    }
  }, [customerInfo, refreshCustomerInfo]);

  const availablePackages = useMemo(() => getSupportedPackages(offerings), [offerings]);
  const currentOffering = useMemo(() => getCurrentOffering(offerings), [offerings]);
  const entitlement = customerInfo?.entitlements.active[ORGANIZER_PRO_ENTITLEMENT];
  const isPremiumActive = Boolean(entitlement?.isActive);
  const statusColor = isPremiumActive ? palette.accent : palette.text;
  const activeEntitlements = Object.keys(customerInfo?.entitlements.active ?? {});
  const latestExpiration = formatDateLabel(entitlement?.expirationDate ?? customerInfo?.latestExpirationDate);
  const activeSubscriptions = customerInfo?.activeSubscriptions?.length
    ? customerInfo.activeSubscriptions.join(', ')
    : 'None';
  const recentProduct = customerInfo?.allPurchasedProductIdentifiers?.slice(-1).join(', ') ?? 'None';
  const loadingAny = loadingOfferings || loadingCustomerInfo;

  const handlePurchasePackage = useCallback(
    async (pkgId: string) => {
      const pkg = availablePackages.find((item) => item.identifier === pkgId);
      if (!pkg) {
        return;
      }
      setLocalError(null);
      setPurchasingPackageId(pkgId);
      try {
        const info = await purchasePackage(pkg);
        setCustomerInfo(info);
        const successMessage = isEntitlementActive(info)
          ? 'Organizer Pro is unlocked.'
          : 'Purchase succeeded, RevenueCat is syncing your entitlement.';
        Alert.alert('Purchase complete', successMessage);
      } catch (error) {
        const message = formatFriendlyError(error);
        setLocalError(message);
        Alert.alert('Could not purchase', message);
      } finally {
        setPurchasingPackageId(null);
        void refreshCustomerInfo();
      }
    },
    [availablePackages, refreshCustomerInfo, setCustomerInfo],
  );

  const handleRestore = useCallback(async () => {
    setLocalError(null);
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      Alert.alert('Restore complete', 'Restored purchases and refreshed entitlements.');
    } catch (error) {
      const message = formatFriendlyError(error);
      setLocalError(message);
      Alert.alert('Restore failed', message);
    } finally {
      void refreshCustomerInfo();
    }
  }, [refreshCustomerInfo, setCustomerInfo]);

  const handleShowPaywall = useCallback(async () => {
    setLocalError(null);
    try {
      const result = await presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ORGANIZER_PRO_ENTITLEMENT,
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });
      const message = getPaywallResultMessage(result);
      if (message) {
        Alert.alert('RevenueCat Paywall', message);
      }
    } catch (error) {
      const message = formatFriendlyError(error);
      setLocalError(message);
      Alert.alert('Paywall failed', message);
    } finally {
      void refreshCustomerInfo();
    }
  }, [currentOffering, refreshCustomerInfo]);

  const handlePresentCustomerCenter = useCallback(async () => {
    try {
      await presentCustomerCenter();
    } catch (error) {
      const message = formatFriendlyError(error);
      setLocalError(message);
      Alert.alert('Customer center failed', message);
    }
  }, []);

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

        <Text style={[styles.title, { color: palette.text }]}>{t('premium.title')}</Text>
        <Text style={[styles.subtitle, { color: palette.text, opacity: 0.85 }]}>
          {t('premium.subtitle')}
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
            <Text style={[styles.heroTitle, { color: palette.text }]}>{t('premium.heroTitle')}</Text>
            <Text style={[styles.heroDescription, { color: palette.text, opacity: 0.75 }]}>
              {t('premium.heroDescription')}
            </Text>
          </View>
        </View>

        <View style={styles.features}>
          {premiumFeatures.map((feature) => (
            <View
              key={feature.titleKey}
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
                  {t(feature.titleKey)}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: palette.text, opacity: 0.75 },
                  ]}
                >
                  {t(feature.descriptionKey)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Subscription status</Text>
            <Text style={[styles.statusBadge, { color: statusColor }]}>
              {isPremiumActive ? 'Organizer Pro' : 'Free'},
            </Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>Entitlements</Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {activeEntitlements.length ? activeEntitlements.join(', ') : 'None'}
              </Text>
            </View>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>Expires</Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {latestExpiration}
              </Text>
            </View>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>Active subscriptions</Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {activeSubscriptions}
              </Text>
            </View>
            <View style={styles.statusColumn}>
              <Text style={[styles.statusLabel, { color: palette.text }]}>Last product</Text>
              <Text style={[styles.statusValue, { color: palette.text }]}>
                {recentProduct}
              </Text>
            </View>
          </View>
          {loadingCustomerInfo && (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loaderText, { color: palette.text }]}>
                Fetching customer info...
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Subscription options</Text>
          <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: 0.7 }]}>
            {t('premium.subtitle')}
          </Text>
          {loadingOfferings ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={[styles.loaderText, { color: palette.text }]}>
                Loading plans...
              </Text>
            </View>
          ) : availablePackages.length ? (
            <View style={styles.packageList}>
              {availablePackages.map((pkg) => (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => handlePurchasePackage(pkg.identifier)}
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
            <Text style={[styles.sectionSubtitle, { color: palette.text, opacity: 0.6 }]}>
              No products are configured yet.
            </Text>
          )}
          {localError && <Text style={styles.errorText}>{localError}</Text>}
          {storeError && <Text style={styles.errorText}>{storeError}</Text>}
        </View>

        <View style={[styles.section, { borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>RevenueCat tools</Text>
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
                Open paywall (Organizer Pro)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCustomerCenter(true)}
              style={({ pressed }) => [
                styles.toolButton,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.toolLabel, { color: palette.text }]}>Customer Center (embedded)</Text>
            </Pressable>
            <Pressable
              onPress={handlePresentCustomerCenter}
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
                Customer Center (native)
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
            <Text style={[styles.restoreLabel, { color: palette.text }]}>Restore purchases</Text>
          </Pressable>
        </View>

        <Text style={[styles.infoText, { color: palette.text, opacity: 0.7 }]}>
          {t('premium.info')}
        </Text>
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
            <Text style={styles.purchaseText}>{t('premium.cta')}</Text>
          )}
        </Pressable>
        <Text style={[styles.purchaseSubtext, { color: palette.text }]}>
          {t('premium.footerNote')}
        </Text>
      </View>

      <Modal
        visible={showCustomerCenter}
        onRequestClose={() => setShowCustomerCenter(false)}
        animationType="slide"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          <View style={[styles.modalHeader, { borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>Customer Center</Text>
            <Pressable onPress={() => setShowCustomerCenter(false)}>
              <Text style={[styles.modalClose, { color: palette.accent }]}>Close</Text>
            </Pressable>
          </View>
          <RevenueCatUI.CustomerCenterView
            style={styles.customerCenterView}
            shouldShowCloseButton={false}
            onDismiss={() => setShowCustomerCenter(false)}
            onRestoreCompleted={({ customerInfo: info }) => setCustomerInfo(info)}
            onRestoreFailed={({ error }) => {
              const message = formatFriendlyError(error);
              setLocalError(message);
              Alert.alert('Restore failed', message);
            }}
          />
        </SafeAreaView>
      </Modal>
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
