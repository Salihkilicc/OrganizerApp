import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFocusMode } from '@/store/useFocusMode';
import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';
import type { PlanCategory } from '@/store/usePlans';

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

const getCategoryIcon = (category?: PlanCategory) => {
  switch (category) {
    case 'focus':
      return '🎯';
    case 'study':
      return '📚';
    case 'work':
      return '💼';
    case 'gym':
      return '🏋️';
    case 'meeting':
      return '🧑‍🤝‍🧑';
    case 'reading':
      return '📖';
    case 'break':
      return '☕';
    case 'personal':
      return '🌸';
    default:
      return '⭐';
  }
};

export default function FocusScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<FocusParams>();
  const [tickTime, setTickTime] = useState(() => Date.now());
  const wasActiveRef = useRef(false);
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <View style={styles.layout}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.heading, { color: palette.text }]}>{t((d) => d.focus.title)}</Text>
          <Text style={[styles.sessionTitle, { color: palette.text }]} numberOfLines={2}>
            {title}
          </Text>
          <View
            style={[
              styles.categoryChip,
              {
                borderColor: palette.border,
                backgroundColor: palette.background,
              },
            ]}>
            <Text style={[styles.categoryText, { color: palette.text }]}>
              {`${categoryIcon} ${categoryLabel}`}
            </Text>
          </View>
          <Text style={[styles.description, { color: palette.text }]}>
            {t((d) => d.focus.description)}
          </Text>
          <Text style={[styles.countdown, { color: palette.text }]}>{countdown}</Text>
          <Text style={[styles.description, { color: palette.text, marginTop: 6 }]}>
            {t((d) => d.focus.minutesLabel, { minutes: displayMinutes })}
          </Text>
          <Text style={[styles.description, { color: palette.text, marginTop: 4 }]}>
            {t((d) => d.focus.pointsPerMinute, { points: 1 })}
          </Text>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleExit}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <Text style={[styles.buttonLabel, { color: palette.text }]}>
                {t((d) => d.focus.exit)}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleExtend}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: palette.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text style={[styles.buttonLabel, { color: palette.background }]}>
                {t((d) => d.focus.addMinutes)}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  layout: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  sessionTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  countdown: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
