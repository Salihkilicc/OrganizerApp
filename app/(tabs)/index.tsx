import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PlanEditor } from '@/components/PlanEditor';
import { useAuth } from '@/store/useAuth';
import { usePoints } from '@/store/usePoints';
import { PlanBlock, todayDate, usePlans } from '@/store/usePlans';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { useStreak } from '@/store/useStreak';
import { useTheme } from '@/store/useTheme';
import { useTranslation } from '@/i18n';
import { useRouter } from 'expo-router';
import { useWeather } from '@/store/useWeather';
import * as Haptics from 'expo-haptics';
import { useWater, WATER_BOTTLE_COUNT } from '@/store/useWater';
import { getFrameDecoration } from '@/lib/frameStyles';
import * as Location from 'expo-location';

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
const formatCategoryLabel = (category: PlanBlock['category']) => {
  if (!category) return 'Other';
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
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
const BOTTLE_RIDGE_OFFSETS = [10, 22, 34, 46];
const BUTTON_CORNER_RADIUS = 20;
const WaterBottleIcon = ({ color, filled }: { color: string; filled: boolean }) => {
  const fillOpacity = filled ? 0.8 : 0;
  return (
    <View style={styles.bottleWrapper}>
      <View style={[styles.bottleBody, { borderColor: color }]}>
        <View style={[styles.bottleFill, { backgroundColor: color, opacity: fillOpacity }]} />
        {BOTTLE_RIDGE_OFFSETS.map((offset) => (
          <View
            key={offset}
            style={[
              styles.bottleRidge,
              {
                bottom: `${offset}%`,
                opacity: filled ? 1 : 0.25,
                backgroundColor: color,
              },
            ]}
          />
        ))}
        <View style={[styles.bottleNeck, { backgroundColor: color }]} />
        <View style={[styles.bottleCap, { backgroundColor: color }]} />
      </View>
    </View>
  );
};
const createBottleScaleValues = () =>
  Array.from({ length: WATER_BOTTLE_COUNT }, () => new Animated.Value(1));

export default function TodayScreen() {
  const palette = useTheme((state) => state.palette);
  const { t } = useTranslation();
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

  const [selectedBlock, setSelectedBlock] = useState<PlanBlock | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [showWeeklyForecast, setShowWeeklyForecast] = useState(false);
  const temperature = useWeather((state) => state.temperature);
  const icon = useWeather((state) => state.icon);
  const weekly = useWeather((state) => state.weekly);
  const weatherLoading = useWeather((state) => state.loading);
  const weatherError = useWeather((state) => state.error);
  const fetchWeather = useWeather((state) => state.fetchWeather);
  const setError = useWeather((state) => state.setError);

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
  const fallbackName = isGuest ? 'Guest User' : user?.email?.split('@')[0] ?? 'User';
  const displayName = user?.user_metadata?.full_name ?? fallbackName;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  useEffect(() => {
    initializeStreak();
  }, [initializeStreak]);

  useEffect(() => {
    let active = true;
    const loadWeatherForLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== 'granted') {
          setError('Location off');
          setShowWeeklyForecast(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        if (!active) return;
        await fetchWeather(location.coords.latitude, location.coords.longitude);
      } catch (err) {
        console.error('[TodayScreen] Weather error', err);
        if (active) {
          setError('Weather unavailable');
          setShowWeeklyForecast(false);
        }
      }
    };

    void loadWeatherForLocation();
    return () => {
      active = false;
    };
  }, [fetchWeather, setError]);

  const today = todayDate();
  useEffect(() => {
    ensureTodayInitialized();
  }, [ensureTodayInitialized, today]);

  useEffect(() => {
    loadPlans().catch((error) => console.warn('[TodayScreen] Failed to load plans', error));
  }, [loadPlans]);
  const weeklyPreview = weekly.slice(0, 7);

  const todayBlocks = useMemo(() => {
    return blocks
      .filter((block) => block.date === today)
      .sort((a, b) => a.startMin - b.startMin);
  }, [blocks, today]);

  const totalPlans = todayBlocks.length;
  const totalHours =
    todayBlocks.reduce((sum, block) => sum + (block.endMin - block.startMin), 0) / 60;
  const planHoursDisplay =
    Math.abs(totalHours - Math.round(totalHours)) < 0.0001
      ? Math.round(totalHours).toString()
      : totalHours.toFixed(1);
  const planStatsText =
    totalPlans === 0
      ? t('today.planStatsEmpty')
      : t('today.planStats', {
          total: totalPlans,
          plural: totalPlans === 1 ? '' : 's',
          hours: planHoursDisplay,
        });
  const nextBlock = useMemo(() => {
    if (!todayBlocks.length) return null;
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const upcoming = todayBlocks.find((block) => block.startMin > currentMinutes);
    return upcoming ?? todayBlocks[0];
  }, [todayBlocks]);

  const handleStartFocus = (block: PlanBlock | null) => {
    if (!block) return;
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
    done: boolean;
  }) => {
    if (!selectedBlock) return;
    await updatePlan(selectedBlock.id, values);
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
        showsVerticalScrollIndicator={false}
        onTouchStart={() => {
          if (showWeeklyForecast) {
            setShowWeeklyForecast(false);
          }
        }}>
        <View style={styles.headerRow}>
          <View style={styles.avatarColumn}>
            <Pressable
              onPress={handleAvatarPress}
              style={({ pressed }) => [
                styles.avatar,
                {
                  backgroundColor: palette.accent,
                  opacity: pressed ? 0.8 : 1,
                },
                avatarFrameStyle,
              ]}>
              <Text style={[styles.avatarInitials, { color: palette.background }]}>
                {initials}
              </Text>
            </Pressable>

            <View style={styles.friendsStrip}>
              <Text style={[styles.friendsLabel, { color: palette.text }]}>
                {t('today.friends')}
              </Text>
            </View>
          </View>

          <View style={styles.headerStats}>
            <View style={styles.statsInline}>
              <View style={[styles.statBlock, styles.streakBlock]}>
                <Text style={[styles.statLabel, { color: palette.text }]}>{t('today.streak')}</Text>
                <Text
                  style={[
                    styles.streakValue,
                    { color: palette.text },
                  ]}>
                  {streakDays} days
                </Text>
              </View>

              <Pressable
                onPress={() => setShowWeeklyForecast((prev) => !prev)}
                onTouchStart={(event) => event.stopPropagation()}
                style={({ pressed }) => [
                  styles.weatherBubble,
                  styles.buttonShadow,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.card,
                  },
                  pressed && styles.weatherBubblePressed,
                ]}>
                <Text
                  style={[
                    styles.weatherBubbleIcon,
                    { color: weatherError ? palette.accent : palette.text },
                  ]}>
                  {weatherLoading ? '' : weatherError ? '❗' : icon ?? '🌡️'}
                </Text>
                <Text style={[styles.weatherBubbleTemp, { color: palette.text }]}>
                  {weatherLoading
                    ? '--°'
                    : weatherError
                    ? weatherError === 'Location off'
                      ? weatherError
                      : '--°'
                    : temperature !== null
                    ? `${Math.round(temperature)}°`
                    : '--°'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/points')}
                style={({ pressed }) => [
                  styles.statBlock,
                  styles.pointsPressable,
                  styles.buttonShadow,
                  pressed && styles.pointsPressed,
                ]}>
                <Text style={[styles.statLabel, { color: palette.text }]}>{t('today.points')}</Text>
                <View
                  style={[
                    styles.pointsBadge,
                    { backgroundColor: palette.accent, shadowColor: palette.text },
                  ]}>
                  <Text style={[styles.pointsValue, { color: palette.background }]}>
                    {points}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {showWeeklyForecast && (
        <View
          onStartShouldSetResponder={() => true}
          onTouchStart={(event) => event.stopPropagation()}
          style={[
            styles.weeklyCard,
            styles.buttonShadow,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}>
            {weeklyPreview.length ? (
              weeklyPreview.map((day, index) => (
                <View
                  key={`${day.day}-${index}`}
                  style={[
                    styles.weeklyRow,
                    index === weeklyPreview.length - 1 && styles.weeklyRowLast,
                  ]}>
                  <Text style={[styles.weeklyDay, { color: palette.text }]}>{day.day}</Text>
                  <Text style={[styles.weeklyIcon, { color: palette.accent }]}>{day.icon}</Text>
                  <Text style={[styles.weeklyTemp, { color: palette.text }]}>
                    {day.temp}°C
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.weeklyUnavailable, { color: palette.text }]}>
                Weather unavailable
              </Text>
            )}
          </View>
        )}

        <View
          style={[
            styles.nextUpCard,
            styles.buttonShadow,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.nextUpLabel, { color: palette.text }]}>{t('today.nextUp')}</Text>
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
                  {t('today.startFocus')}
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.nextUpEmptyContainer}>
              <Text style={[styles.nextUpEmpty, { color: palette.text }]}>
                {t('today.noNextBlock')}
              </Text>
              <Pressable
                onPress={goToPlan}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  styles.buttonShadow,
                  {
                    alignSelf: 'flex-start',
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  {t('today.createPlan')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.planWaterRow}>
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
                  opacity: isFull ? 1 : 0.25,
                },
              ]}>
              <WaterBottleIcon color={palette.tint} filled={isFull} />
            </AnimatedTouchableOpacity>
          ))}
        </View>
        <View style={styles.planCardContainer}>
          <View
            style={[styles.planCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.planHeaderRow}>
              <Text style={[styles.planTitle, { color: palette.text }]}>{t('today.planSectionTitle')}</Text>
              <Text style={[styles.planStatsText, { color: palette.text }]}>{planStatsText}</Text>
            </View>
            {todayBlocks.length === 0 ? (
              <View style={styles.planEmptyState}>
                <Text style={[styles.planEmptyTitle, { color: palette.text }]}>
                  {t('today.planEmptyTitle')}
                </Text>
                <Text style={[styles.planEmptyHint, { color: palette.text }]}>
                  {t('today.planEmptyHint')}
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
                    {t('today.openPlanner')}
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
  },
  avatarColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  friendsStrip: {
    marginTop: 12,
    marginLeft: 4,
  },
  friendsLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexShrink: 0,
    marginLeft: 'auto',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 12,
    marginRight: 8,
  },
  statBlock: {
    alignItems: 'flex-start',
  },
  streakBlock: {
    marginLeft: 12,
    marginRight: 12,
  },
  buttonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  pointsPressable: {
    borderRadius: BUTTON_CORNER_RADIUS,
    paddingVertical: 2,
    alignItems: 'flex-start',
    marginLeft: 12,
    marginTop: -2,
  },
  pointsPressed: {
    opacity: 0.75,
  },
  weatherBubble: {
    marginLeft: 12,
    borderRadius: BUTTON_CORNER_RADIUS,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 72,
  },
  weatherBubblePressed: {
    opacity: 0.75,
  },
  weatherBubbleIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  weatherBubbleTemp: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  weeklyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  weeklyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weeklyRowLast: {
    marginBottom: 0,
  },
  weeklyDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  weeklyIcon: {
    fontSize: 16,
  },
  weeklyTemp: {
    fontSize: 14,
    fontWeight: '600',
  },
  weeklyUnavailable: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  streakValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointsBadge: {
    marginTop: 4,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: '600',
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
    width: '90%',
    maxWidth: 420,
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
  bottleFill: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 6,
    borderRadius: 10,
    height: '72%',
  },
  bottleRidge: {
    position: 'absolute',
    alignSelf: 'center',
    width: '66%',
    height: 3,
    borderRadius: 999,
  },
  bottleNeck: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 22,
    height: 12,
    borderRadius: 6,
  },
  bottleCap: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 26,
    height: 8,
    borderRadius: 4,
  },
  planWaterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionCheck: {
    fontSize: 14,
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
