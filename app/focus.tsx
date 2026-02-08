import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';
import { useI18n } from '@/i18n/useI18n';
import { useFocusMode } from '@/store/useFocusMode';
import type { PlanCategory } from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';

const DEFAULT_MINUTES = 30;
const EXTEND_MINUTES = 15;
const MINUTE_MS = 60 * 1000;

type FocusParams = {
  id?: string;
  title?: string;
  category?: PlanCategory;
  startMin?: string;
  endMin?: string;
};

const getCategoryIcon = (category?: PlanCategory): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'focus': return 'scan-circle';
    case 'study': return 'school';
    case 'work': return 'briefcase';
    case 'gym': return 'barbell';
    case 'meeting': return 'people';
    case 'reading': return 'book';
    case 'break': return 'cafe';
    case 'personal': return 'person';
    default: return 'star';
  }
};

export default function FocusScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<FocusParams>();
  const [tickTime, setTickTime] = useState(() => Date.now());
  const wasActiveRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { active, remainingMinutes, lastTickAt, startedAt, start, exit, addMinutes } =
    useFocusMode();

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
      other: t((d) => d.focus.categoryOther),
    }),
    [t],
  );

  const initialMinutes = useMemo(() => {
    const startMin = Number(params.startMin);
    const endMin = Number(params.endMin);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) {
      return DEFAULT_MINUTES;
    }
    const duration = Math.max(0, Math.floor(endMin - startMin));
    return duration > 0 ? duration : DEFAULT_MINUTES;
  }, [params.startMin, params.endMin]);

  // Pulse animation for countdown
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (!active) {
      start(initialMinutes);
    }
  }, [active, initialMinutes, start]);

  useEffect(() => {
    setTickTime(Date.now());
    const intervalId = setInterval(() => {
      setTickTime(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (active) {
      wasActiveRef.current = true;
      return;
    }

    if (wasActiveRef.current) {
      wasActiveRef.current = false;
      router.back();
    }
  }, [active, router]);

  const handleExit = () => {
    exit();
  };

  const handleExtend = () => {
    addMinutes(EXTEND_MINUTES);
  };

  const lastTick = lastTickAt ?? startedAt ?? tickTime;
  const elapsedMs = Math.min(MINUTE_MS, Math.max(0, tickTime - lastTick));
  const totalMsRemaining = Math.max(0, remainingMinutes * MINUTE_MS - elapsedMs);
  const displayMinutes = Math.floor(totalMsRemaining / MINUTE_MS);
  const displaySeconds = Math.floor((totalMsRemaining % MINUTE_MS) / 1000);
  const countdown = `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds
    .toString()
    .padStart(2, '0')}`;

  const title = params.title ?? t((d) => d.focus.sessionFallback);
  const categoryLabel = categoryLabels[params.category ?? 'other'] ?? categoryLabels.other;
  const categoryIcon = getCategoryIcon(params.category);
  const categoryColor = PLAN_CATEGORY_COLORS[params.category as PlanCategory] || PLAN_CATEGORY_COLORS.other;

  // Determine if light theme
  const isLightTheme = ['light', 'classic', 'sunset', 'sakura', 'minimal'].includes(palette.background);
  const lightGradient = ['#FFFFFF', `${categoryColor.border}15`, `${categoryColor.border}25`] as const; // White -> Category tint
  const darkGradient = [categoryColor.background, '#000'] as const;
  const gradientColors = isLightTheme ? lightGradient : darkGradient;
  const textColor = isLightTheme ? '#1a1a3e' : '#fff';
  const closeButtonBg = isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.3)';

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Close Button */}
        <Pressable onPress={handleExit} style={[styles.closeButton, { backgroundColor: closeButtonBg }]}>
          <Ionicons name="close" size={28} color={textColor} />
        </Pressable>

        <View style={styles.content}>
          {/* Category Badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor.border }]}>
            <Ionicons name={categoryIcon} size={24} color="#fff" />
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>

          {/* Task Title */}
          <Text style={[styles.title, { color: textColor }]} numberOfLines={2}>
            {title}
          </Text>

          {/* Countdown Timer */}
          <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={[styles.countdown, { color: textColor }]}>{countdown}</Text>
          </Animated.View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: isLightTheme ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)' }]}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={isLightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.statLabel, { color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>{displayMinutes} min left</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={20} color={isLightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.statLabel, { color: isLightTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}>+{displayMinutes} pts</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: isLightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)' }]}>
            Stay focused. You're earning 1 point per minute.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleExit}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                {
                  backgroundColor: isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)',
                  borderColor: isLightTheme ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)',
                  opacity: pressed ? 0.7 : 1
                },
              ]}
            >
              <Ionicons name="stop-circle-outline" size={20} color={textColor} />
              <Text style={[styles.buttonLabel, { color: textColor }]}>End Session</Text>
            </Pressable>

            <Pressable
              onPress={handleExtend}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: categoryColor.border,
                  opacity: pressed ? 0.85 : 1
                },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonLabel}>+{EXTEND_MINUTES} min</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 24,
  },
  categoryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 40,
  },
  timerContainer: {
    marginBottom: 32,
  },
  countdown: {
    color: '#fff',
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: -4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
