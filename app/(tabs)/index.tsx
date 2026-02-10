import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AVATAR_IMAGES } from '@/constants/avatars';
import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';
import { type TranslationKeys } from '@/i18n/translations';
import { useI18n } from '@/i18n/useI18n';
import { notifyFocusStarted } from '@/lib/notifications';
import { useAuth } from '@/store/useAuth';
import { useAvatarStore } from '@/store/useAvatar';
import { PlanBlock, PlanCategory, usePlans } from '@/store/usePlans';
import { useSettings } from '@/store/useSettings';
import { useStreak } from '@/store/useStreak';
import { useTheme } from '@/store/useTheme';
import { useWater, WATER_BOTTLE_COUNT } from '@/store/useWater';
import { formatTime } from '@/utils/time';

import { Coachmark } from '@/components/ui/Coachmark';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { WelcomeFlow } from '@/components/ui/WelcomeFlow';
import { AiPlanModal } from '@/features/ai-planner/ui/AiPlanModal';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, themeKey } = useTheme();
  const { t } = useI18n();
  const { blocks, load, addMany } = usePlans();
  const user = useAuth((state) => state.user);
  const { selectedAvatar } = useAvatarStore();
  const { streakDays } = useStreak();
  const { water, drinkBottle } = useWater();
  const is24Hour = useSettings((state) => state.is24Hour);
  const hasSeenCoachmarks = useSettings((state) => state.hasSeenCoachmarks);
  const completeCoachmarks = useSettings((state) => state.completeCoachmarks);
  const hasSeenInteractiveTour = useSettings((state) => state.hasSeenInteractiveTour);
  const completeInteractiveTour = useSettings((state) => state.completeInteractiveTour);
  const resetTours = useSettings((state) => state.resetTours);

  const [refreshing, setRefreshing] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [coachmarkVisible, setCoachmarkVisible] = useState(false);

  // Animation Values
  const fireScale = useRef(new Animated.Value(1)).current;

  // Local Date Helper
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load Data
  const todayDateStr = getLocalDate();
  const currentAvatar = selectedAvatar ? AVATAR_IMAGES[selectedAvatar] : AVATAR_IMAGES.avatar1;

  // Next Block Logic
  const nextBlock = useMemo(() => {
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Sort today's blocks by start time
    const sortedToday = blocks
      .filter((b: PlanBlock) => b.date === todayDateStr)
      .sort((a: PlanBlock, b: PlanBlock) => a.startMin - b.startMin);

    // Find the current active block or the next upcoming block
    return sortedToday.find((b: PlanBlock) => !b.done && b.endMin > currentMin);
  }, [blocks, todayDateStr]);

  // Fire Breathing Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fireScale, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(fireScale, { toValue: 1.0, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [fireScale]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Show coachmark after a short delay if user hasn't seen it
  useEffect(() => {
    if (!hasSeenCoachmarks && !hasSeenInteractiveTour) {
      const timer = setTimeout(() => {
        setCoachmarkVisible(true);
      }, 1000); // Show after 1 second
      return () => clearTimeout(timer);
    }
  }, [hasSeenCoachmarks, hasSeenInteractiveTour]);

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12
      ? t((d) => d.today.greetings.morning)
      : h < 18
        ? t((d) => d.today.greetings.afternoon)
        : t((d) => d.today.greetings.evening);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'work': return 'briefcase';
      case 'study': return 'school';
      case 'gym': return 'barbell';
      case 'focus': return 'scan-circle';
      case 'meeting': return 'people';
      default: return 'ellipse';
    }
  };

  const isDark = ['dark', 'ninja', 'midnight', 'neon', 'ocean', 'coffee', 'default'].includes(themeKey);
  const headerHeight = 60 + insets.top;

  // Precision Coordinate Calculation for Tour
  const scrollViewPadding = 20;
  const waterCardHeight = 150;
  const gap = 12;
  const aiCardHeight = 160;

  const tourPositions = useMemo(() => ({
    // Step 1: AI (Middle Right - Higher)
    ai: {
      top: headerHeight + scrollViewPadding + waterCardHeight + gap + (aiCardHeight / 2) - 85,
      right: 10,
    },
    // Step 2: Water (Top Center - Kept Same)
    water: {
      top: headerHeight + scrollViewPadding + (waterCardHeight / 2) - 20,
      left: (width / 2) - 60,
    },
    // Step 3: Shop (Header Right - Align End)
    shop: {
      top: insets.top + 10,
      right: 20,
      alignItems: 'flex-end', // Aligns target circle to the right edge (over the button)
    }
  }), [headerHeight, insets.top]);

  return (
    <GradientBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={themeKey === 'light' ? 'dark' : 'light'} />

      {/* STICKY HEADER */}
      <View style={[styles.headerWrapper, { height: headerHeight }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.push('/profile')}>
              <View style={[styles.avatarContainer, { borderColor: palette.accent }]}>
                <Image source={currentAvatar} style={styles.avatar} />
              </View>
            </Pressable>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.greeting, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(255,255,255,0.6)' }]}>{getGreeting()},</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.username, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>
                  {user?.user_metadata?.full_name?.split(' ')[0] ?? t((d) => d.common.user)}
                </Text>
                {/* Friends Button */}
                <Pressable style={[styles.friendsBadge, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.2)' }]} onPress={() => {/* Friends Logic */ }}>
                  <Ionicons name="people" size={14} color={themeKey === 'light' ? '#1e1b4b' : '#fff'} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* Animated Streak */}
            <View style={[styles.streakContainer, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(0,0,0,0.3)' }]}>
              <Animated.Text style={{ fontSize: 22, transform: [{ scale: fireScale }] }}>🔥</Animated.Text>
              <Text style={[styles.streakText, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>{streakDays}</Text>
            </View>
            {/* Shop Button */}
            <Pressable onPress={() => router.push('/points')} style={[styles.shopButton, {
              backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)',
              borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)'
            }]}>
              <Ionicons name="cart-outline" size={24} color={themeKey === 'light' ? '#1e1b4b' : '#fff'} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: headerHeight + 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeKey === 'light' ? '#1e1b4b' : '#fff'} progressViewOffset={headerHeight} />}
      >
        {/* 2. HYDRATION (Water Drops) */}
        <GlassCard style={styles.hydrationCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="water" size={18} color="#06b6d4" />
              <Text style={[styles.cardTitle, { color: themeKey === 'light' ? '#5b21b6' : '#fff' }]}>{t((d) => d.today.hydration)}</Text>
            </View>
            <Text style={[styles.waterCount, { color: themeKey === 'light' ? 'rgba(91, 33, 182, 0.6)' : 'rgba(255,255,255,0.5)' }]}>{Object.values(water).filter(Boolean).length} / {WATER_BOTTLE_COUNT}</Text>
          </View>
          <View style={styles.dropsRow}>
            {Array.from({ length: WATER_BOTTLE_COUNT }).map((_, i) => (
              <WaterDrop key={i} index={i} isFull={water[i]} onPress={() => drinkBottle(i)} />
            ))}
          </View>
        </GlassCard>

        {/* 3. NEXT UP & ACTIONS */}
        <View style={styles.splitRow}>
          {/* Next Task */}
          <GlassCard style={[
            styles.nextUpCard,
            {
              flex: 1.5,
              borderColor: nextBlock ? (PLAN_CATEGORY_COLORS[nextBlock.category as PlanCategory]?.border || 'rgba(255,255,255,0.1)') : undefined,
            }
          ]}>
            <Text style={[
              styles.label,
              { color: nextBlock ? (PLAN_CATEGORY_COLORS[nextBlock.category as PlanCategory]?.border || 'rgba(255,255,255,0.5)') : (themeKey === 'light' ? '#5b21b6' : 'rgba(255,255,255,0.5)') }
            ]}>{t((d) => d.today.nextUp).toUpperCase()}</Text>
            {nextBlock ? (
              <>
                <Text numberOfLines={1} style={[styles.nextTitle, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>{nextBlock.title}</Text>

                {/* Visual Metadata Row */}
                <View style={styles.nextMetaRow}>
                  <View style={[
                    styles.tag,
                    { backgroundColor: PLAN_CATEGORY_COLORS[nextBlock.category as PlanCategory]?.background || 'rgba(255,255,255,0.1)' }
                  ]}>
                    <Ionicons name={getCategoryIcon(nextBlock.category) as any} size={12} color="#fff" />
                    <Text style={styles.tagText}>{t((d) => d.plan.categories[nextBlock.category as keyof TranslationKeys['plan']['categories']] ?? nextBlock.category)}</Text>
                  </View>
                  <Text style={[styles.nextTime, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.7)' : 'rgba(255,255,255,0.8)' }]}>
                    {formatTime(nextBlock.startMin, is24Hour)}
                  </Text>
                </View>

                {/* BIG FOCUS BUTTON */}
                <Pressable
                  style={[
                    styles.focusButton,
                    { backgroundColor: PLAN_CATEGORY_COLORS[nextBlock.category as PlanCategory]?.border || (themeKey === 'light' ? '#e2e8f0' : '#fff') }
                  ]}
                  onPress={() => {
                    notifyFocusStarted().catch((err) => console.warn('[Focus] Notification failed:', err));
                    router.push({ pathname: '/focus', params: { id: nextBlock.id } });
                  }}
                >
                  <Text style={[styles.focusBtnText, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>{t((d) => d.today.startFocus).toUpperCase()}</Text>
                  <Ionicons name="play" size={14} color={themeKey === 'light' ? '#1e1b4b' : '#fff'} />
                </Pressable>
              </>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <Text style={{ color: themeKey === 'light' ? 'rgba(91, 33, 182, 0.6)' : 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>{t((d) => d.today.noNextBlock)}</Text>
                <Pressable onPress={() => router.push('/plan')}>
                  <Text style={{ color: palette.accent, fontWeight: 'bold' }}>+ {t((d) => d.today.createPlan)}</Text>
                </Pressable>
              </View>
            )}
          </GlassCard>

          {/* Quick AI Action - Opens AI Modal with Ad System */}
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              setAiModalVisible(true);
              if (coachmarkVisible) {
                setCoachmarkVisible(false);
                completeCoachmarks();
              }
            }}
          >
            <GlassCard style={styles.aiCard}>
              <Ionicons name="sparkles" size={32} color="#FFD700" />
              <Text style={[styles.aiText, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>
                {t((d) => d.today.openPlanner)}
              </Text>
            </GlassCard>
          </Pressable>
        </View>

        {/* 4. YOUR SCHEDULE - Modern List View */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: themeKey === 'light' ? '#5b21b6' : '#fff' }]}>{t((d) => d.today.planSectionTitle)}</Text>

          {blocks.filter((b: PlanBlock) => b.date === todayDateStr).length === 0 ? (
            <GlassCard style={{ padding: 30, alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={48} color="#007AFF" />
              <Text style={{ color: '#007AFF', fontSize: 14, marginTop: 12, opacity: 0.8 }}>
                {t((d) => d.today.noTasks)}
              </Text>
              <Pressable
                onPress={() => router.push('/plan')}
                style={{ marginTop: 16, backgroundColor: palette.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t((d) => d.today.addTask)}</Text>
              </Pressable>
            </GlassCard>
          ) : (
            <View style={{ gap: 8 }}>
              {blocks
                .filter((b: PlanBlock) => b.date === todayDateStr)
                .sort((a: PlanBlock, b: PlanBlock) => a.startMin - b.startMin)
                .map((block: PlanBlock, index: number) => {
                  const color = PLAN_CATEGORY_COLORS[block.category as PlanCategory] || PLAN_CATEGORY_COLORS.other;
                  const nextBlock = blocks
                    .filter((b: PlanBlock) => b.date === todayDateStr)
                    .sort((a: PlanBlock, b: PlanBlock) => a.startMin - b.startMin)[index + 1];
                  const isConnected = nextBlock && nextBlock.startMin === block.endMin;

                  return (
                    <TaskCard
                      key={block.id}
                      block={block}
                      color={color}
                      isConnected={isConnected}
                      themeKey={themeKey}
                      onCheck={(id) => {
                        const { update } = usePlans.getState();
                        update(id, { done: !block.done });
                      }}
                      onPress={() => {
                        console.log('Edit block:', block.id);
                      }}
                    />
                  );
                })}

              {/* Create Next Plan - Subtle Button */}
              <Pressable
                onPress={() => router.push('/plan')}
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: '#007AFF33',
                  borderRadius: 12,
                  borderStyle: 'dashed',
                  padding: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#007AFF11'
                }}
              >
                <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>
                  {t((d) => d.today.draftNextMove)}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* RESET TOUR BUTTON (TEMPORARY) */}


      </ScrollView>

      <AiPlanModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        date={todayDateStr}
        onApply={(newBlocks: PlanBlock[]) => {
          addMany(newBlocks);
          setAiModalVisible(false);
        }}
      />

      {/* Coachmark Tutorial */}
      <Coachmark
        visible={coachmarkVisible && hasSeenInteractiveTour}
        text={t((d) => d.today.coachmark)}
        targetPosition={{
          top: headerHeight + 20 + 16 + 160 + 12 + 50, // Header + padding + hydration card + gap + center of AI card
          right: 20 + 50, // Right padding + center of AI card
        }}
        onDismiss={() => {
          setCoachmarkVisible(false);
          completeCoachmarks();
        }}
      />

      {/* Welcome Flow */}
      <WelcomeFlow
        visible={!hasSeenInteractiveTour}
        userName={user?.user_metadata?.full_name?.split(' ')[0] ?? 'User'}
        positions={tourPositions}
        onComplete={completeInteractiveTour}
      />
    </GradientBackground>
  );
}

// Water Drop Component with Animation
function WaterDrop({ index, isFull, onPress }: { index: number; isFull: boolean; onPress: () => void }) {
  const { themeKey } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();

    // Fast Shake + Scale Animation
    Animated.parallel([
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 30, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 30, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 30, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.85, duration: 60, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ])
    ]).start();
  };

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg']
  });

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={{ transform: [{ scale }, { rotate: rotateInterpolate }] }}>
        <Ionicons
          name={isFull ? "water" : "water-outline"}
          size={32}
          color={isFull ? "#06b6d4" : (themeKey === 'light' ? "rgba(30, 27, 75, 0.2)" : "rgba(255,255,255,0.2)")}
        />
      </Animated.View>
    </Pressable>
  );
}

// Task Card Component with Animation
function TaskCard({
  block,
  color,
  isConnected,
  onCheck,
  onPress,
  themeKey
}: {
  block: PlanBlock;
  color: { background: string; border: string };
  isConnected: boolean;
  onCheck: (id: string) => void;
  onPress: () => void;
  themeKey: string;
}) {
  const checkboxScale = useRef(new Animated.Value(1)).current;
  const checkboxRotate = useRef(new Animated.Value(0)).current;
  const [isChecked, setIsChecked] = useState(block.done || false);
  const is24Hour = useSettings((state) => state.is24Hour);
  const { t } = useI18n();

  const handleCheck = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Immediately update state for instant green transition
    setIsChecked(!isChecked);
    onCheck(block.id);

    // Fast Shake + Scale Animation (120ms total)
    Animated.parallel([
      Animated.sequence([
        Animated.timing(checkboxRotate, { toValue: 1, duration: 30, useNativeDriver: true }),
        Animated.timing(checkboxRotate, { toValue: -1, duration: 30, useNativeDriver: true }),
        Animated.timing(checkboxRotate, { toValue: 1, duration: 30, useNativeDriver: true }),
        Animated.timing(checkboxRotate, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(checkboxScale, { toValue: 0.85, duration: 60, useNativeDriver: true }),
        Animated.spring(checkboxScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
      ])
    ]).start();
  };

  const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    switch (cat) {
      case 'work': return 'briefcase';
      case 'study': return 'school';
      case 'gym': return 'barbell';
      case 'focus': return 'scan-circle';
      case 'meeting': return 'people';
      case 'reading': return 'book';
      case 'break': return 'cafe';
      case 'personal': return 'person';
      default: return 'ellipse';
    }
  };

  const rotateInterpolate = checkboxRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg']
  });

  return (
    <View>
      <Pressable onPress={onPress}>
        <GlassCard style={styles.taskCard}>
          {/* Colored Line */}
          <View style={styles.taskLineContainer}>
            <View style={[styles.taskLine, { backgroundColor: color.border }]} />
            {isConnected && <View style={[styles.taskLineConnector, { backgroundColor: color.border }]} />}
          </View>

          {/* Content */}
          <View style={styles.taskContent}>
            {/* Icon Badge */}
            <View style={[styles.taskIconBadge, { backgroundColor: color.background }]}>
              <Ionicons name={getCategoryIcon(block.category)} size={18} color="#fff" />
            </View>

            {/* Task Info */}
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]} numberOfLines={1}>{block.title}</Text>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskTime, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.7)' : 'rgba(255,255,255,0.7)' }]}>
                  {formatTime(block.startMin, is24Hour)} - {formatTime(block.endMin, is24Hour)}
                </Text>
                <Text style={[styles.taskCategory, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.5)' : 'rgba(255,255,255,0.5)' }]}>{t((d) => d.plan.categories[block.category as keyof TranslationKeys['plan']['categories']] ?? block.category)}</Text>
              </View>
            </View>

            {/* Animated Checkbox */}
            <Pressable onPress={handleCheck}>
              <Animated.View
                style={[
                  styles.taskCheckbox,
                  {
                    backgroundColor: isChecked ? '#10b981' : (themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.1)'),
                    borderColor: isChecked ? '#10b981' : (themeKey === 'light' ? 'rgba(30, 27, 75, 0.2)' : 'rgba(255,255,255,0.3)'),
                    transform: [{ scale: checkboxScale }, { rotate: rotateInterpolate }]
                  }
                ]}
              >
                {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
              </Animated.View>
            </Pressable>
          </View>
        </GlassCard>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden', // For blur to stay contained
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10, // Adjusted padding
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, padding: 2, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: '100%', height: '100%', borderRadius: 24 },
  greeting: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  username: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  friendsBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 12 },

  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  streakContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  streakText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  shopButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  hydrationCard: { padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  waterCount: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  dropsRow: { flexDirection: 'row', justifyContent: 'space-between' },

  splitRow: { flexDirection: 'row', gap: 12, height: 160 }, // Taller for elements
  nextUpCard: { padding: 14, justifyContent: 'space-between' },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  nextTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginVertical: 4 },
  nextMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  nextTime: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { color: '#fff', fontSize: 10, textTransform: 'capitalize' },

  focusButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 'auto',
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }
  },
  focusBtnText: { color: '#000', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  aiCard: { justifyContent: 'center', alignItems: 'center', gap: 8, height: '100%' },
  aiText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },

  // Task Card Styles
  taskCard: {
    padding: 0,
    overflow: 'hidden',
  },
  taskLineContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  taskLine: {
    width: 4,
    height: '100%',
  },
  taskLineConnector: {
    position: 'absolute',
    left: 0,
    bottom: -8,
    width: 4,
    height: 8,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 18,
    gap: 12,
  },
  taskIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  taskCategory: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
