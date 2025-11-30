import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import React, { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { usePoints } from '@/store/usePoints';
import { useShop } from '@/store/useShop';
import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';
import { useRouter } from 'expo-router';
import type { TranslationKeys } from '@/i18n/translations';
import { AVATAR_CATALOG, type AvatarName } from '@/constants/avatars';
import { useAvatarStore } from '@/store/useAvatar';
import { themes } from '@/styles/colors';
import { FRAME_STYLES } from '@/lib/frameStyles';

const addAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) return hexColor;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function PointsScreen() {
  const router = useRouter();
  const palette = useTheme((state) => state.palette);
  const totalPoints = usePoints((state) => state.total);
  const items = useShop((state) => state.items);
  const buyWithPoints = useShop((state) => state.buyWithPoints);
  const equipItem = useShop((state) => state.equipItem);
  const { t } = useI18n();
  const {
    purchasedAvatars,
    selectedAvatar,
    loading: avatarsLoading,
    purchaseAvatar,
    selectAvatar,
  } = useAvatarStore();
  const scrollRef = useRef<ScrollView | null>(null);
  const sectionOffsets = useRef<{ themes: number; frames: number; photos: number }>({
    themes: 0,
    frames: 0,
    photos: 0,
  });

  const themeItems = items.filter((item) => item.category === 'theme');
  const frameItems = items.filter((item) => item.category === 'frame');

  const getItemVisuals = (item: typeof items[number]) => {
    const base = {
      cardBackground: palette.card,
      cardBorder: palette.border,
      accent: palette.accent,
      text: palette.text,
    };

    if (item.category === 'theme') {
      const themeKey = item.id.replace('theme-', '') as keyof typeof themes;
      const themePalette = themes[themeKey];
      if (themePalette) {
        return {
          cardBackground: themePalette.card,
          cardBorder: themePalette.accent,
          accent: themePalette.accent,
          text: themePalette.text,
        };
      }
    }

    if (item.category === 'frame') {
      const frameStyle = FRAME_STYLES[item.id];
      if (frameStyle) {
        const accent = frameStyle.borderColor;
        return {
          cardBackground: addAlpha(accent, 0.12),
          cardBorder: accent,
          accent,
          text: palette.text,
        };
      }
    }

    return base;
  };

  const renderAvatarCard = (entry: (typeof AVATAR_CATALOG)[number]) => {
    const name = entry.name as AvatarName;
    const owned = purchasedAvatars.includes(name);
    const isSelected = selectedAvatar === name;
    const canAfford = entry.price === 0 || totalPoints >= entry.price;
    const buttonDisabled = avatarsLoading || (owned ? isSelected : !canAfford);
    const statusLabel = owned
      ? isSelected
        ? 'Selected'
        : 'Unlocked'
      : entry.price === 0
        ? 'Free'
        : `${entry.price} pts`;

    return (
      <View
        key={entry.name}
        style={[
          styles.avatarCard,
          { backgroundColor: palette.card, borderColor: palette.border },
        ]}>
        <View
          style={[
            styles.avatarImageShell,
            {
              borderColor: isSelected ? palette.accent : palette.border,
              shadowColor: palette.text,
            },
          ]}>
          <Image source={entry.source} style={styles.avatarImage} />
          {!owned && (
            <View
              style={[
                styles.avatarLockOverlay,
                { backgroundColor: 'rgba(0,0,0,0.08)' },
              ]}>
              <Ionicons name="lock-closed" size={18} color={palette.text} />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.avatarStatus,
            { color: isSelected ? palette.accent : palette.text },
          ]}>
          {statusLabel}
        </Text>
        <Pressable
          onPress={() => {
            if (owned) {
              void selectAvatar(name);
            } else {
              void purchaseAvatar(name);
            }
          }}
          disabled={buttonDisabled}
          style={({ pressed }) => [
            styles.avatarButton,
            {
              backgroundColor: owned ? palette.background : palette.accent,
              borderColor: owned ? palette.border : palette.accent,
              opacity: pressed ? 0.85 : buttonDisabled ? 0.6 : 1,
            },
          ]}>
          <Text
            style={[
              styles.avatarButtonText,
              { color: owned ? palette.text : '#000000' },
            ]}>
            {owned ? (isSelected ? 'Selected' : 'Select') : t((d) => d.points.button.buy)}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderItem = (item: typeof items[number]) => {
    const visuals = getItemVisuals(item);
    const { cardBackground, cardBorder, accent, text } = visuals;
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
          { backgroundColor: cardBackground, borderColor: cardBorder },
        ]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: text }]}>{item.title}</Text>
          <View
            style={[
              styles.statusPill,
              {
                borderColor: cardBorder,
                backgroundColor: item.equipped ? accent : cardBackground,
              },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: item.equipped ? palette.background : text },
              ]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.cardSubtitle,
            { color: text, opacity: item.owned ? 0.85 : 0.65 },
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
                  backgroundColor: canBuy ? accent : palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.actionText,
                  { color: '#000000' },
                ]}>
                {t((d) => d.points.button.buy)}
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
                  backgroundColor: item.equipped ? palette.border : accent,
                  opacity: item.equipped ? 0.6 : pressed ? 0.8 : 1,
                },
              ]}>
                <Text
                  style={[
                    styles.actionText,
                    { color: item.equipped ? text : palette.background },
                  ]}>
                  {item.equipped
                    ? t((d) => d.points.button.equipped)
                    : t((d) => d.points.button.equip)}
                </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const statusLabelFor = (item: typeof items[number]) => {
    if (item.equipped) {
      return t((d) => d.points.status.equipped);
    }
    if (item.owned) {
      return t((d) => d.points.status.owned);
    }
    if (item.unlockType === 'points' && typeof item.cost === 'number') {
      return t((d) => d.points.status.price, { price: item.cost });
    }
    return t((d) => d.points.status.locked);
  };

  const jumpTo = (key: keyof typeof sectionOffsets.current) => {
    const target = sectionOffsets.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(target - 16, 0), animated: true });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.container}>
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: palette.card,
              borderBottomColor: palette.border,
              shadowColor: palette.text,
            },
          ]}>
          <View style={styles.leftHeaderRow}>
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
            <Text style={[styles.sectionHeadline, { color: palette.text }]} numberOfLines={1}>
              {t((d) => d.points.title)}
            </Text>
          </View>
          <View style={styles.pointsContainer}>
            <View
              style={[
                styles.pointsBadge,
                { backgroundColor: palette.accent, shadowColor: palette.text },
              ]}>
              <Text style={[styles.pointsValue, { color: palette.background }]}>{totalPoints}</Text>
            </View>
          </View>
        </View>

        <View style={styles.navDotsRow}>
          {[1, 2, 3].map((num) => (
            <Pressable
              key={num}
              onPress={() => jumpTo(num === 1 ? 'themes' : num === 2 ? 'frames' : 'photos')}
              style={({ pressed }) => [
                styles.navDot,
                {
                  borderColor: palette.border,
                  backgroundColor: pressed ? palette.accent : palette.card,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}>
              <Text style={[styles.navDotText, { color: palette.text }]}>{num}</Text>
            </Pressable>
          ))}
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            sectionOffsets.current.themes = event.nativeEvent.layout.y;
          }}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.points.themes)}
          </Text>
          <View style={styles.sectionGrid}>
            {themeItems.map((item) => renderItem(item))}
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            sectionOffsets.current.frames = event.nativeEvent.layout.y;
          }}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.points.frames)}
          </Text>
          <View style={styles.sectionGrid}>
            {frameItems.map((item) => renderItem(item))}
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            sectionOffsets.current.photos = event.nativeEvent.layout.y;
          }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {t((d) => d.points.profilePhotos)}
            </Text>
            {avatarsLoading && <ActivityIndicator size="small" color={palette.accent} />}
          </View>
          <View style={styles.avatarGrid}>
            {AVATAR_CATALOG.map((entry) => renderAvatarCard(entry))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
    marginTop: 0,
    marginHorizontal: -16,
    borderBottomWidth: 1,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    zIndex: 5,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
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
  leftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexShrink: 1,
    marginLeft:1,
  },
  sectionHeadline: {
    fontSize: 20,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  pointsBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop:-34,
    flexShrink: 0,
    marginLeft: 12,
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  navDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  navDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDotText: {
    fontSize: 12,
    fontWeight: '700',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatarImageShell: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarStatus: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 8,
  },
  avatarButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  avatarButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
