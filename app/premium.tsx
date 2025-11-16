import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/store/useTheme';
import { usePremium } from '@/store/usePremium';

const features = [
  {
    icon: '🧠',
    title: 'AI planlama',
    description: 'Günün her anını senin için şekillendirir.',
  },
  {
    icon: '⏱️',
    title: 'Boşluk doldurma',
    description: 'Planında kalan boşluklara odak zamanları ekler.',
  },
  {
    icon: '🔥',
    title: 'Streak & puan',
    description: 'Motivasyon sağlayan streak ve puan bonusları.',
  },
  {
    icon: '📊',
    title: 'Haftalık özet',
    description: 'Zamanın nasıl geçtiğini görsel raporlarla takip et.',
  },
];

export default function PremiumScreen() {
  const palette = useTheme((s) => s.palette);
  const router = useRouter();
  const setPremium = usePremium((s) => s.setPremium);

  const handlePurchase = async () => {
    console.log('[Premium] Purchase pressed');
    await setPremium(true);
    router.push('/plan');
  };

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

        <Text style={[styles.title, { color: palette.text }]}>Organizer Premium</Text>
        <Text style={[styles.subtitle, { color: palette.text, opacity: 0.85 }]}>
          AI ile gününü senin yerine planlasın, sadece uygulamaya sadık kal.
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
              <Text style={[styles.heroTitle, { color: palette.text }]}>Akıllı günlük planlama</Text>
              <Text style={[styles.heroDescription, { color: palette.text, opacity: 0.75 }]}>
                Yapay zeka önerileriyle her blok, sana özel hedeflere uyacak şekilde şekilleniyor.
              </Text>
            </View>
          </View>

        <View style={styles.features}>
          {features.map((feature) => (
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

        <Text style={[styles.infoText, { color: palette.text, opacity: 0.7 }]}>
          Premium’u istediğin zaman iptal edebilirsin; AI destekli programın seninle kalır.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handlePurchase}
          style={({ pressed }) => [
            styles.purchaseButton,
            { backgroundColor: palette.accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.purchaseText}>Premium’u Aç</Text>
        </Pressable>
        <Text style={[styles.purchaseSubtext, { color: palette.text }]}>
          AI planlama + fokus modu entegrasyonları
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
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
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  purchaseButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 8,
  },
});
