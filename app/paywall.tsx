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
  const cardBackground = palette.card ?? '#FFFFFF';
  const cardShadowColor = palette.text;
  const selectedPackage = selected === 'monthly' ? monthlyPackage : yearlyPackage;
  
  // canPurchase kontrolünü loglayalım
  const canPurchase = Boolean(selectedPackage);

  const renderPlanCard = (
    plan: SelectedPlan,
    pkg: any | null,
    title: string,
    badge: string,
    helper?: string,
  ) => {
    const isSelected = selected === plan;
    const price = pkg?.product?.priceString ?? '—'; // Opsiyonel zincirlemeyi güvenli hale getirdim
    
    return (
      <TouchableOpacity
        onPress={() => setSelected(plan)}
        style={[
          styles.planCard,
          {
            borderColor: isSelected ? primary : '#E1E4F0',
            borderWidth: isSelected ? 2 : 1,
            backgroundColor: cardBackground,
            shadowColor: cardShadowColor,
          },
        ]}
        activeOpacity={0.9}
        disabled={processing}
      >
        <View style={styles.planHeader}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: `${primary}12`,
                borderColor: isSelected ? primary : '#E5E7EB',
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: primary }]}>{badge}</Text>
          </View>
          {isSelected ? (
            <View style={[styles.selectedPill, { borderColor: primary }]}>
              <Text style={[styles.selectedText, { color: primary }]}>Selected</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.planTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.planPrice, { color: primary }]}>{price}</Text>
        {helper ? (
          <Text style={[styles.helperText, { color: palette.text }]}>{helper}</Text>
        ) : null}
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
          { paddingBottom: 32 + insets.bottom, paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: '#ffffff20' }]}>
          <Text style={[styles.heroBadgeText, { color: primary, backgroundColor: '#ffffff50' }]}>
            New Year 2025
          </Text>
          <View style={[styles.iconCircle, { backgroundColor: '#ffffff30' }]}>
            <Text style={[styles.icon, { color: primary }]}>🎆</Text>
          </View>
          <Text style={[styles.title, { color: palette.text }]}>Unlock Planora Pro ✨</Text>
          <Text style={[styles.subtitle, { color: palette.text }]}>
            AI planning, no ads, more focus.
          </Text>
          <Text style={[styles.tinyNote, { color: palette.text }]}>Holiday offer</Text>
        </View>

        <View style={[styles.benefitsCard, { backgroundColor: '#FFFFFF', shadowColor: primary }]}>
          <Text style={[styles.benefitBullet, { color: palette.text }]}>
            {`\u2022`} ✨ Unlimited AI-generated plans
          </Text>
          <Text style={[styles.benefitBullet, { color: palette.text }]}>
            {`\u2022`} 🎯 Focus tools & streaks
          </Text>
          <Text style={[styles.benefitBullet, { color: palette.text }]}>
            {`\u2022`} 🚫 No ads, just productivity
          </Text>
        </View>

        <View style={styles.cards}>
          {renderPlanCard(
            'yearly',
            yearlyPackage,
            'Yearly – Best value 🎁',
            'Best value',
            'Save more vs monthly.',
          )}
          {renderPlanCard(
            'monthly',
            monthlyPackage,
            'Monthly – Flexible 🎄',
            'Flexible',
            'Try Pro month by month.',
          )}
        </View>

        <TouchableOpacity
          onPress={handlePurchase}
          disabled={processing || !canPurchase}
          style={[
            styles.primaryButton,
            {
              backgroundColor: primary,
              opacity: processing || !canPurchase ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>
            {selected === 'yearly' ? 'Continue with yearly' : 'Continue with monthly'}
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

        <TouchableOpacity
          onPress={handleRestore}
          disabled={processing}
          style={[
            styles.linkButton,
            { opacity: processing ? 0.6 : 1 },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.linkText, { color: palette.text }]}>Restore purchases</Text>
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <Text style={[styles.footerLink, { color: palette.text }]}>Terms of Use</Text>
          <Text style={[styles.footerSeparator, { color: palette.text }]}>•</Text>
          <Text style={[styles.footerLink, { color: palette.text }]}>Privacy Policy</Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default PaywallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  gradientTop: {
    top: 0,
    height: 260,
    backgroundColor: '#0B1535',
  },
  gradientMid: {
    top: 220,
    height: 240,
    backgroundColor: '#1B1F5C',
    opacity: 0.7,
  },
  gradientBottom: {
    top: 420,
    height: 500,
    backgroundColor: '#F5F7FF',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroCard: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.8,
    textAlign: 'center',
  },
  tinyNote: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.7,
  },
  heroBadgeText: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    marginBottom: 10,
  },
  benefitsCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  benefitBullet: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  cards: {
    marginBottom: 18,
  },
  planCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  selectedPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#ffffff40',
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.75,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    marginTop: 12,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 13,
    opacity: 0.8,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 12,
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    opacity: 0.5,
    marginHorizontal: 8,
  },
});
