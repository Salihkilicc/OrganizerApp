import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlanEditor } from '@/components/PlanEditor';
import { Popup } from '@/components/Popup';
import { AVATAR_IMAGES } from '@/constants/avatars';
import { useI18n } from '@/i18n/useI18n';
import { getFrameDecoration } from '@/lib/frameStyles';
import { useAuth } from '@/store/useAuth';
import { useAvatarStore } from '@/store/useAvatar';
import { useFocusMode } from '@/store/useFocusMode';
import { PlanBlock, todayDate, usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { useStreak } from '@/store/useStreak';
import { useTheme } from '@/store/useTheme';
import { useWater, WATER_BOTTLE_COUNT } from '@/store/useWater';
import { useWeather } from '@/store/useWeather';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';

const padNumber = (value: number) => value.toString().padStart(2, '0');
const formatTime = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${padNumber(hours)}:${padNumber(minutes)}`;
};
const formatRange = (block: PlanBlock) =>
  `${formatTime(block.startMin)} - ${formatTime(block.endMin)}`;
const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
};
const getCategoryIcon = (category: PlanBlock['category']) => {
  switch (category) {
    case 'focus':
      return '🎯';
    case 'study':
      return '📚';
    case 'work':
      return '💼';
    case 'gym':
      return '🏋️';
    default:
      return '⭐';
  }
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const BUTTON_CORNER_RADIUS = 20;
const bottleSvg = `
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="m87.102 100.758h-46.191c-1.669 0-3.033 1.35-3.033 3.019v15.388c0 4.87 3.965 8.835 8.835 8.835h34.588c4.87 0 8.835-3.965 8.835-8.835v-15.388c-.001-1.669-1.364-3.019-3.034-3.019zm-3.839-19.283h-38.539c-3.784 0-6.859 3.074-6.859 6.859 0 3.771 3.061 6.845 6.832 6.859h38.595c3.756-.014 6.817-3.089 6.817-6.859-.001-3.784-3.076-6.859-6.846-6.859zm0-19.27h-38.539c-3.784 0-6.859 3.074-6.859 6.845 0 3.784 3.074 6.859 6.859 6.859h38.539c3.771 0 6.845-3.074 6.845-6.859 0-3.77-3.075-6.845-6.845-6.845zm.82-32.083-8.78-12.41h-22.621l-8.765 12.424c-3.951 5.579-6.038 12.146-6.038 18.978v4.494c0 1.669 1.363 3.019 3.033 3.019h46.191c1.669 0 3.033-1.35 3.033-3.019v-4.48c-.001-6.846-2.101-13.414-6.053-19.006zm-12.758-30.122h-14.65c-1.46 0-2.643 1.183-2.643 2.643v9.488h19.937v-9.488c0-1.46-1.183-2.643-2.644-2.643z"/>
</svg>
`;
const WaterBottleIcon = ({ color, filled }: { color: string; filled: boolean }) => (
  <View style={styles.bottleWrapper}>
    <SvgXml xml={bottleSvg} width={38} height={56} color={color} opacity={filled ? 1 : 0.25} />
  </View>
);
const createBottleScaleValues = () =>
  Array.from({ length: WATER_BOTTLE_COUNT }, () => new Animated.Value(1));

export default function TodayScreen() {
  const palette = useTheme((state) => state.palette);
  const { t } = useI18n();
  const router = useRouter();
  const goToPlan = () => {
    router.push('/plan');
  };
  const loadPlans = usePlans((state) => state.load);
  const user = useAuth((state) => state.user);
  const isGuest = useAuth((state) => state.isGuest);
  const points = usePoints((state) => state.total);
  const dailyPoints = usePoints((state) => state.daily);
  const todayPoints = dailyPoints.planPoints + dailyPoints.focusPoints;
  const blocks = usePlans((state) => state.blocks);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);
  const streakDays = useStreak((state) => state.streakDays);
  const initializeStreak = useStreak((state) => state.initialize);
  const startFocusForBlock = useFocusMode((state) => state.startFocusForBlock);

  const [selectedBlock, setSelectedBlock] = useState<PlanBlock | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [weatherModalVisible, setWeatherModalVisible] = useState(false);
  const weatherAnimation = useRef(new Animated.Value(0)).current;
  const temperature = useWeather((state) => state.temperature);
  const icon = useWeather((state) => state.icon);
  const weekly = useWeather((state) => state.weekly);
  const weatherLoading = useWeather((state) => state.loading);
  const weatherError = useWeather((state) => state.error);
  const locationPermissionRequired = weatherError === 'Location permission required';
  const fetchWeather = useWeather((state) => state.fetchWeather);
  const setError = useWeather((state) => state.setError);
  const [friendsVisible, setFriendsVisible] = useState(false);
  const isMounted = useRef(true);

  const water = useWater((state) => state.water);
  const ensureTodayInitialized = useWater((state) => state.ensureTodayInitialized);
  const drinkBottle = useWater((state) => state.drinkBottle);
  const bottleScaleRef = useRef<Animated.Value[]>(createBottleScaleValues());
  const bottleScales = bottleScaleRef.current;
  const bottleStates = useMemo(
    () =>
      Array.from({ length: WATER_BOTTLE_COUNT }, (_, index) => water[index] ?? true),
    [water],
  );
  const handleWaterPress = (index: number, isFull: boolean) => {
    if (!isFull) return;
    const scaleValue = bottleScales[index];
    if (!scaleValue) return;
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    drinkBottle(index);
  };

  const frameId = useProfileAppearance((state) => state.frameId);
  const frameDecoration = getFrameDecoration(frameId);
  const selectedAvatar = useAvatarStore((state) => state.selectedAvatar);
  const avatarFrameStyle = frameDecoration
    ? {
      borderWidth: frameDecoration.borderWidth,
      borderColor: frameDecoration.borderColor,
      shadowColor: frameDecoration.shadowColor ?? frameDecoration.borderColor,
      shadowOpacity: frameDecoration.shadowOpacity ?? 0.4,
      shadowOffset: frameDecoration.shadowOffset ?? { width: 0, height: 4 },
      shadowRadius: frameDecoration.shadowRadius ?? 10,
      elevation: frameDecoration.elevation ?? 3,
    }
    : {
      borderWidth: 1,
      borderColor: palette.border,
    };
  const avatarSource = selectedAvatar ? AVATAR_IMAGES[selectedAvatar] : null;
  const fallbackName = isGuest
    ? t((d) => d.common.guestUser)
    : user?.email?.split('@')[0] ?? t((d) => d.common.user);
  const displayName = user?.user_metadata?.full_name ?? fallbackName;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const categoryLabels = useMemo(
    () => ({
      focus: t((d) => d.plan.categories.focus),
      study: t((d) => d.plan.categories.study),
      work: t((d) => d.plan.categories.work),
      gym: t((d) => d.plan.categories.gym),
      meeting: t((d) => d.plan.categories.meeting),
      reading: t((d) => d.plan.categories.reading),
      break: t((d) => d.plan.categories.break),
      personal: t((d) => d.plan.categories.personal),
      other: t((d) => d.plan.categories.other),
    }),
    [t],
  );
  const formatCategoryLabel = (category: PlanBlock['category']) =>
    categoryLabels[category ?? 'other'] ?? categoryLabels.other;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadWeatherForLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted.current) return;
      if (status !== 'granted') {
        setError('Location permission required');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      if (!isMounted.current) return;
      await fetchWeather(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      console.error('[TodayScreen] Weather error', err);
      if (isMounted.current) {
        setError('Weather unavailable');
      }
    }
  }, [fetchWeather, setError]);

  const handleWeatherPress = useCallback(() => {
    setWeatherModalVisible(true);
    if (weatherLoading) return;
    if (temperature !== null || weekly.length) return;
    void loadWeatherForLocation();
  }, [loadWeatherForLocation, temperature, weatherLoading, weekly.length]);

  useEffect(() => {
    initializeStreak();
  }, [initializeStreak]);

  const today = todayDate();
  useEffect(() => {
    ensureTodayInitialized();
  }, [ensureTodayInitialized, today]);

  useEffect(() => {
    Animated.timing(weatherAnimation, {
      toValue: weatherModalVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [weatherAnimation, weatherModalVisible]);

  useEffect(() => {
    loadPlans().catch((error) => console.warn('[TodayScreen] Failed to load plans', error));
  }, [loadPlans]);
  const weeklyPreview = weekly.slice(0, 7);

  const todayBlocks = useMemo(() => {
    return blocks
      .filter((block) => block.date === today)
      .sort((a, b) => a.startMin - b.startMin);
  }, [blocks, today]);

  const pendingBlocks = useMemo(() => {
    return todayBlocks.filter((block) => !(block.done ?? false));
  }, [todayBlocks]);

  const totalPlans = todayBlocks.length;
  const totalHours =
    todayBlocks.reduce((sum, block) => sum + (block.endMin - block.startMin), 0) / 60;
  const planHoursDisplay =
    Math.abs(totalHours - Math.round(totalHours)) < 0.0001
      ? Math.round(totalHours).toString()
      : totalHours.toFixed(1);
  const planStatsText =
    totalPlans === 0
      ? t((d) => d.today.planStatsEmpty)
      : t((d) => d.today.planStats, {
        total: totalPlans,
        plural: totalPlans === 1 ? '' : 's',
        hours: planHoursDisplay,
      });
  const nextBlock = useMemo(() => {
    if (!pendingBlocks.length) return null;
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const upcoming = pendingBlocks.find((block) => block.startMin > currentMinutes);
    return upcoming ?? pendingBlocks[0];
  }, [pendingBlocks]);

  const weatherModalStyle = useMemo(
    () => ({
      opacity: weatherAnimation,
      transform: [
        {
          scale: weatherAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.92, 1],
          }),
        },
      ],
    }),
    [weatherAnimation],
  );

  const handleStartFocus = (block: PlanBlock | null) => {
    if (!block) return;
    const durationMinutes = Math.max(1, block.endMin - block.startMin);
    startFocusForBlock(block.id, durationMinutes);
    router.push({
      pathname: '/focus',
      params: {
        id: block.id,
        title: block.title,
        startMin: block.startMin.toString(),
        endMin: block.endMin.toString(),
        category: block.category,
      },
    });
  };

  const handleAvatarPress = () => {
    router.push('/profile');
  };

  const handleBlockPress = (block: PlanBlock) => {
    setSelectedBlock(block);
    setEditorVisible(true);
  };

  const toggleDone = (block: PlanBlock, event: GestureResponderEvent) => {
    event.stopPropagation();
    const nextDone = !(block.done ?? false);
    void updatePlan(block.id, { done: nextDone });
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setSelectedBlock(null);
  };

  const handleEditorSave = async (values: {
    title: string;
    startMin: number;
    endMin: number;
    note?: string;
    category: PlanBlock['category'];
  }) => {
    if (!selectedBlock) return;
    await updatePlan(selectedBlock.id, { ...values, done: selectedBlock.done ?? false });
    closeEditor();
  };

  const handleEditorDelete = async (id: string) => {
    await removePlan(id);
    closeEditor();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="always"
        showsVerticalScrollIndicator={false}>

        {/* Header Row: Avatar/Friends | Streak | Shop */}
        <View style={styles.headerRow}>
          {/* Left: Avatar + Friends */}
          <View style={styles.avatarColumn}>
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [
                styles.avatar,
                {
                  backgroundColor: avatarSource ? palette.background : palette.card,
                  opacity: pressed ? 0.8 : 1,
                },
                avatarFrameStyle,
              ]}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: palette.text }]}>
                  {initials}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setFriendsVisible(true)}
              style={({ pressed }) => [
                styles.friendsButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.friendsLabel, { color: palette.text }]}>
                {t((d) => d.today.friends)}
              </Text>
            </Pressable>
          </View>

          {/* Center: Streak */}
          <View style={styles.streakCenter}>
            <Text style={[styles.streakLabel, { color: palette.text }]}>
              {t((d) => d.today.streak)}
            </Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={[styles.streakDays, { color: palette.text }]}>
                {t((d) => d.today.streakValue, { count: streakDays })}
              </Text>
            </View>
          </View>

          {/* Right: Shop Button */}
          <Pressable
            onPress={() => router.push('/points')}
            style={({ pressed }) => [
              styles.shopButton,
              styles.buttonShadow,
              {
                backgroundColor: palette.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[styles.shopButtonText, { color: palette.background }]}>
              SHOP
            </Text>
          </Pressable>
        </View>

        {/* Next Up Card */}
        <View
          style={[
            styles.nextUpCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.nextUpLabel, { color: palette.text }]}>
            {t((d) => d.today.nextUp)}
          </Text>
          {nextBlock ? (
            <>
              <Text style={[styles.nextUpTitle, { color: palette.text }]}>
                {nextBlock.title}
              </Text>
              <View style={styles.nextUpMetaRow}>
                <Text style={[styles.nextUpMeta, { color: palette.text }]}>
                  {formatRange(nextBlock)}
                </Text>
                <View
                  style={[
                    styles.nextUpCategory,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.background,
                    },
                  ]}>
                  <Text style={[styles.nextUpCategoryText, { color: palette.text }]}>
                    {`${getCategoryIcon(nextBlock.category)} ${formatCategoryLabel(
                      nextBlock.category,
                    )}`}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => handleStartFocus(nextBlock)}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  styles.buttonShadow,
                  {
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  {t((d) => d.today.startFocus)}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.nextUpEmpty, { color: palette.text }]}>
                {t((d) => d.today.noNextBlock)}
              </Text>
              <Pressable
                onPress={goToPlan}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  styles.buttonShadow,
                  {
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  {t((d) => d.today.createPlan)}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Daily Waters Section */}
        <View style={styles.waterSection}>
          <Text style={[styles.waterSectionLabel, { color: palette.text }]}>
            {t((d) => d.today.waterDaily)}
          </Text>
          <Text style={[styles.waterSectionSubLabel, { color: palette.text }]}>
            {t((d) => d.today.waterWaters)}
          </Text>
          <View style={styles.waterBottleRow}>
            {bottleStates.map((isFull, index) => (
              <AnimatedTouchableOpacity
                key={`water-${index}`}
                onPress={() => handleWaterPress(index, isFull)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[
                  styles.waterButton,
                  {
                    transform: [{ scale: bottleScales[index] }],
                  },
                ]}>
                <WaterBottleIcon color={palette.tint} filled={isFull} />
              </AnimatedTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Plan Section */}
        <View
          style={[
            styles.planCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <View style={styles.planHeaderRow}>
            <Text style={[styles.planTitle, { color: palette.text }]}>
              {t((d) => d.today.planSectionTitle)}
            </Text>
            <Text style={[styles.planStatsText, { color: palette.text }]}>{planStatsText}</Text>
          </View>
          {todayBlocks.length === 0 ? (
            <View style={styles.planEmptyState}>
              <Text style={[styles.planEmptyTitle, { color: palette.text }]}>
                {t((d) => d.today.planEmptyTitle)}
              </Text>
              <Text style={[styles.planEmptyHint, { color: palette.text }]}>
                {t((d) => d.today.planEmptyHint)}
              </Text>
              <Pressable
                onPress={goToPlan}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  styles.buttonShadow,
                  {
                    alignSelf: 'center',
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 16,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  {t((d) => d.today.openPlanner)}
                </Text>
              </Pressable>
            </View>
          ) : (
            todayBlocks.map((block) => {
              const accentColor = block.color ?? palette.accent;
              const isDone = Boolean(block.done);
              return (
                <Pressable
                  key={block.id}
                  onPress={() => handleBlockPress(block)}
                  style={({ pressed }) => [
                    styles.blockRow,
                    styles.buttonShadow,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.background,
                      opacity: pressed ? 0.65 : 1,
                    },
                  ]}>
                  <Pressable
                    onPress={(event) => toggleDone(block, event)}
                    style={[
                      styles.completionToggle,
                      {
                        borderColor: palette.accent,
                        backgroundColor: isDone ? palette.accent : 'transparent',
                      },
                    ]}
                    hitSlop={6}>
                    {isDone && (
                      <Text style={[styles.completionCheck, { color: palette.background }]}>✓</Text>
                    )}
                  </Pressable>
                  <View style={[styles.blockAccent, { backgroundColor: accentColor }]} />
                  <View
                    style={[
                      styles.blockCategoryIcon,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.card,
                      },
                    ]}>
                    <Text style={[styles.blockCategoryIconText, { color: palette.text }]}>
                      {getCategoryIcon(block.category)}
                    </Text>
                  </View>
                  <View style={styles.blockInfo}>
                    <Text style={[styles.blockTime, { color: palette.text }]}>
                      {formatRange(block)}
                    </Text>
                    <Text
                      style={[
                        styles.blockTitle,
                        {
                          color: palette.text,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                          opacity: isDone ? 0.6 : 1,
                        },
                      ]}
                      numberOfLines={1}>
                      {block.title}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <PlanEditor
        visible={editorVisible}
        initial={selectedBlock ?? undefined}
        date={selectedBlock?.date ?? today}
        onCancel={closeEditor}
        onSave={handleEditorSave}
        onDelete={handleEditorDelete}
      />
      <Popup
        visible={friendsVisible}
        title={t((d) => d.tabs.friendsComingSoon)}
        description={t((d) => d.tabs.friendsDescription)}
        icon="🤝"
        onClose={() => setFriendsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  friendsButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  friendsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  streakCenter: {
    alignItems: 'center',
    flex: 1,
  },
  streakLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    opacity: 0.8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakDays: {
    fontSize: 18,
    fontWeight: '700',
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopButtonText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  nextUpCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  nextUpLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nextUpTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  nextUpMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  nextUpMeta: {
    fontSize: 12,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 12,
  },
  nextUpCategory: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nextUpCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nextUpEmpty: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  nextUpEmptyContainer: {
    marginTop: 12,
  },
  startFocusButton: {
    borderRadius: BUTTON_CORNER_RADIUS,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  startFocusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planCardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 8,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planStatsText: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
  },
  waterButton: {
    width: 48,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  bottleWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 38,
    height: 56,
    transform: [{ rotate: '-8deg' }],
    paddingTop: 6,
  },
  bottleBody: {
    width: 28,
    height: 40,
    borderRadius: 14,
    borderWidth: 1.8,
    borderColor: '#cfdce9',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  waterSection: {
    marginBottom: 20,
  },
  waterSectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    opacity: 0.9,
  },
  waterSectionSubLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    opacity: 0.7,
  },
  waterBottleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  planEmptyState: {
    marginTop: 8,
    alignItems: 'center',
  },
  planEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  planEmptyHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  blockAccent: {
    width: 4,
    height: 48,
    borderRadius: 3,
    marginRight: 12,
  },
  blockCategoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionToggle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionCheck: {
    fontSize: 16,
    fontWeight: '700',
  },
  blockCategoryIconText: {
    fontSize: 16,
  },
  blockInfo: {
    flex: 1,
  },
  blockTime: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});
