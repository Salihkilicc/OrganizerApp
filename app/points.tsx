import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { usePoints } from '@/store/usePoints';
import { ShopItemCategory, useShop } from '@/store/useShop';
import { useTheme } from '@/store/useTheme';
import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';

const sections: { titleKey: 'points.themes' | 'points.badges' | 'points.frames'; category: ShopItemCategory }[] =
  [
    { titleKey: 'points.themes', category: 'theme' },
    { titleKey: 'points.badges', category: 'badge' },
    { titleKey: 'points.frames', category: 'frame' },
  ];

export default function PointsScreen() {
  const router = useRouter();
  const palette = useTheme((state) => state.palette);
  const totalPoints = usePoints((state) => state.total);
  const items = useShop((state) => state.items);
  const buyWithPoints = useShop((state) => state.buyWithPoints);
  const equipItem = useShop((state) => state.equipItem);
  const { t } = useTranslation();

  const renderStatus = (itemStatus: string, equipped: boolean) => {
    const pillStyle = [
      styles.statusPill,
      {
        borderColor: palette.border,
        backgroundColor: equipped ? palette.accent : palette.background,
      },
    ];
    const textStyle = [
      styles.statusText,
      { color: equipped ? palette.background : palette.text },
    ];
    return (
      <View style={pillStyle}>
        <Text style={textStyle}>{itemStatus}</Text>
      </View>
    );
  };

  const renderItem = (item: typeof items[number]) => {
    const description = item.subtitle ?? item.requirementDescription ?? '';
    const statusLabel = statusLabelFor(item);
    const canBuy =
      item.unlockType === 'points' &&
      !item.owned &&
      typeof item.cost === 'number' &&
      totalPoints >= item.cost;

    return (
      <View
        key={item.id}
        style={[
          styles.card,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>{item.title}</Text>
          {renderStatus(statusLabel, Boolean(item.equipped))}
        </View>
        <Text
          style={[
            styles.cardSubtitle,
            { color: palette.text, opacity: item.owned ? 0.8 : 0.6 },
          ]}>
          {description}
        </Text>

        <View style={styles.cardFooter}>
          {item.unlockType === 'points' && !item.owned && (
            <Pressable
              onPress={() => buyWithPoints(item.id)}
              disabled={!canBuy}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: canBuy ? palette.accent : palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.actionText,
                  { color: canBuy ? palette.background : palette.text },
                ]}>
                {t('points.button.buy')}
              </Text>
            </Pressable>
          )}
          {(item.category === 'theme' || item.category === 'frame') && item.owned && (
            <Pressable
              onPress={() => equipItem(item.id)}
              disabled={Boolean(item.equipped)}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: item.equipped ? palette.border : palette.accent,
                  opacity: item.equipped ? 0.6 : pressed ? 0.8 : 1,
                },
              ]}>
                <Text
                  style={[
                    styles.actionText,
                    { color: item.equipped ? palette.text : palette.background },
                  ]}>
                  {item.equipped ? t('points.button.equipped') : t('points.button.equip')}
                </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const statusLabelFor = (item: typeof items[number]) => {
    if (item.equipped) {
      return t('points.status.equipped');
    }
    if (item.owned) {
      return t('points.status.owned');
    }
    if (item.unlockType === 'points' && typeof item.cost === 'number') {
      return t('points.status.price', { price: item.cost });
    }
    return t('points.status.locked');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.card,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.backIcon, { color: palette.text }]}>‹</Text>
          </Pressable>
          <View>
            <Text style={[styles.sectionHeadline, { color: palette.text }]}>
              {t('points.title')}
            </Text>
          </View>
          <View style={styles.pointsContainer}>
            <Text style={[styles.pointsLabel, { color: palette.text }]}>
              {t('points.totalPoints')}
            </Text>
            <View
              style={[
                styles.pointsBadge,
                { backgroundColor: palette.accent, shadowColor: palette.text },
              ]}>
              <Text style={[styles.pointsValue, { color: palette.background }]}>
                {totalPoints}
              </Text>
            </View>
          </View>
        </View>

        {sections.map((section) => {
          const filtered = items.filter((item) => item.category === section.category);
          return (
            <View key={section.category} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {t(section.titleKey)}
              </Text>
              <View style={styles.sectionGrid}>
                {filtered.map((item) => renderItem(item))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionHeadline: {
    fontSize: 20,
    fontWeight: '700',
  },
  pointsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    minHeight: 160,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 14,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
