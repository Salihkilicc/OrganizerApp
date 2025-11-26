import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useRevenueCatStore } from '../src/store/useRevenueCat';
import {
  getMonthlyAndYearlyPackages,
  purchasePackageAndGetCustomerInfo,
  restoreAndGetCustomerInfo,
} from '../src/lib/revenuecat';
import { useTheme } from '../src/store/useTheme';

type SelectedPlan = 'monthly' | 'yearly';

const PaywallScreen = () => {
  const insets = useSafeAreaInsets();
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const { currentOffering, loading, refresh } = useRevenueCatStore();
  const [selected, setSelected] = useState<SelectedPlan>('yearly');
  const [monthlyPackage, setMonthlyPackage] = useState<any | null>(null);
  const [yearlyPackage, setYearlyPackage] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);

  // --- LOGLAMA VE PAKET AYRIŞTIRMA ---
  useEffect(() => {
    console.log('🔄 [Paywall] currentOffering değişti:', JSON.stringify(currentOffering, null, 2));
    
    if (currentOffering && currentOffering.availablePackages) {
      console.log('📦 [Paywall] Ham Paket Listesi:', currentOffering.availablePackages.map(p => p.identifier));
    }

    const { monthly, yearly } = getMonthlyAndYearlyPackages(currentOffering);
    
    console.log('✅ [Paywall] Ayrıştırılan Paketler:', { 
      monthlyFound: !!monthly, 
      yearlyFound: !!yearly,
      monthlyPrice: monthly?.product?.priceString,
      yearlyPrice: yearly?.product?.priceString
    });

    setMonthlyPackage(monthly || null);
    setYearlyPackage(yearly || null);
  }, [currentOffering]);

  // --- VERİ ÇEKME TETİKLEYİCİSİ ---
  useEffect(() => {
    console.log(`hz [Paywall] Durum Kontrolü -> Loading: ${loading}, Offering Var mı: ${!!currentOffering}`);
    if (!currentOffering && !loading) {
      console.log('🚀 [Paywall] Offering yok, refresh() çağırılıyor...');
      void refresh();
    }
  }, [currentOffering, loading, refresh]);

  const handlePurchase = async () => {
    const pkg = selected === 'monthly' ? monthlyPackage : yearlyPackage;
    
    console.log('🛒 [Paywall] Satın alma başlatılıyor. Seçilen Paket:', pkg?.identifier);

    if (!pkg) {
      Alert.alert('Hata', 'Seçilen paket şu an yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
      return;
    }
    try {
      setProcessing(true);
      await purchasePackageAndGetCustomerInfo(pkg);
      Alert.alert('Teşekkürler!', 'Planora Pro aboneliğiniz aktif.');
    } catch (err: any) {
      console.error('❌ [Paywall] Satın alma hatası:', err);
      Alert.alert('Satın alma başarısız', err?.message ?? 'Lütfen tekrar deneyin.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setProcessing(true);
      console.log('♻️ [Paywall] Restore işlemi başladı');
      await restoreAndGetCustomerInfo();
      Alert.alert('Başarılı', 'Önceki satın alımlarınız geri yüklendi.');
    } catch (err: any) {
      console.error('❌ [Paywall] Restore hatası', err);
      Alert.alert('Hata', err?.message ?? 'Lütfen tekrar deneyin.');
    } finally {
      setProcessing(false);
    }
  };

  const primary = (palette as any).primary ?? palette.accent;
  const selectedPackage = selected === 'monthly' ? monthlyPackage : yearlyPackage;
  
  // canPurchase kontrolünü loglayalım
  const canPurchase = Boolean(selectedPackage);

  const highlightColor = '#F7C948';
  const renderPlanCard = (
    plan: SelectedPlan,
    pkg: any | null,
    title: string,
    badge: string,
    helper?: string,
  ) => {
    const isSelected = selected === plan;
    const price = pkg?.product?.priceString ?? '—';

    return (
      <TouchableOpacity
        onPress={() => setSelected(plan)}
        style={[
          styles.planCard,
          {
            borderColor: isSelected ? highlightColor : 'rgba(255,255,255,0.25)',
            borderWidth: isSelected ? 2 : 1,
            shadowColor: isSelected ? highlightColor : '#12051d',
          },
        ]}
        activeOpacity={0.9}
        disabled={processing}
      >
        <View style={styles.planCardHeader}>
          <Text style={[styles.planBadge, { color: isSelected ? highlightColor : '#E3E5F1' }]}>
            {badge}
          </Text>
          {isSelected ? (
            <Text style={[styles.checkMark, { color: highlightColor }]}>✓</Text>
          ) : null}
        </View>

        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planPrice}>{price}</Text>
        {helper ? <Text style={styles.planHelper}>{helper}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View pointerEvents="none" style={[styles.gradientLayer, styles.gradientTop]} />
      <View pointerEvents="none" style={[styles.gradientLayer, styles.gradientMid]} />
      <View pointerEvents="none" style={[styles.gradientLayer, styles.gradientBottom]} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + insets.bottom, paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.7}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
                return;
              }
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.closeIcon}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.topBadge}>Planora</Text>
          <Text style={styles.heroTitle}>See who swiped right on you and chat now</Text>
          <Text style={styles.heroSubtitle}>
            Brighter matches, instant replies, and premium boosts in one place.
          </Text>
        </View>

        <View style={styles.planRow}>
          <View style={styles.planCardWrapper}>
            {renderPlanCard(
              'yearly',
              yearlyPackage,
              '1 YEAR',
              'Popular',
              'Save more vs monthly.',
            )}
          </View>
          <View style={styles.planCardWrapper}>
            {renderPlanCard(
              'monthly',
              monthlyPackage,
              '1 MONTH',
              'Flexible',
              'Try Pro month by month.',
            )}
          </View>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Included Planora Plus</Text>
          {['See who added you', 'Free Boost every week', 'Unlimited swipes'].map((item) => (
            <View key={item} style={styles.featureRow}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handlePurchase}
          disabled={processing || !canPurchase}
          style={[
            styles.purchaseButton,
            { opacity: processing || !canPurchase ? 0.6 : 1 },
          ]}
          activeOpacity={0.9}
        >
          <Text style={styles.purchaseButtonText}>
            {`Continue - ${selectedPackage?.product?.priceString ?? '—'} total`}
          </Text>
        </TouchableOpacity>

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={primary} style={styles.loader} />
            <Text style={[styles.processingText, { color: palette.text }]}>
              Processing your purchase...
            </Text>
          </View>
        ) : null}

        <Text style={styles.renewalNote}>Auto-renewable. Cancel anytime.</Text>

        <View style={styles.footerLinks}>
          <Text style={[styles.footerLink, { color: palette.text }]}>Terms of Use</Text>
          <Text style={[styles.footerSeparator, { color: palette.text }]}>•</Text>
          <Text style={[styles.footerLink, { color: palette.text }]}>Privacy Policy</Text>
          <Text style={[styles.footerSeparator, { color: palette.text }]}>•</Text>
          <TouchableOpacity onPress={handleRestore} disabled={processing}>
            <Text style={[styles.footerLink, { color: palette.text }]}>Restore</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030013',
  },
  gradientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gradientTop: {
    top: 0,
    height: 280,
    backgroundColor: '#020011',
  },
  gradientMid: {
    top: 220,
    height: 280,
    backgroundColor: '#2A0A5C',
    opacity: 0.9,
  },
  gradientBottom: {
    top: 420,
    height: 500,
    backgroundColor: '#05020D',
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 22,
    color: '#fff',
    lineHeight: 24,
  },
  heroSection: {
    width: '100%',
    marginTop: 4,
    marginBottom: 20,
  },
  topBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 36,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    lineHeight: 22,
  },
  planRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planCardWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  planCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  checkMark: {
    fontSize: 18,
    fontWeight: '700',
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
  },
  planHelper: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },
  featuresCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  featuresTitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureBullet: {
    fontSize: 18,
    color: '#F7C948',
    marginRight: 10,
  },
  featureText: {
    color: '#F5F6FF',
    fontSize: 15,
  },
  purchaseButton: {
    width: '100%',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7C948',
    marginBottom: 12,
    shadowColor: '#F7C948',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#080a0d',
  },
  loader: {
    marginTop: 12,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 13,
  },
  renewalNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    fontSize: 12,
    textDecorationLine: 'underline',
    color: '#F3F4FF',
    marginHorizontal: 4,
  },
  footerSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 2,
  },
});
