import { useEffect, useMemo, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PlanEditor } from '@/components/PlanEditor';
import { useAuth } from '@/store/useAuth';
import { usePoints } from '@/store/usePoints';
import { PlanBlock, todayDate, usePlans } from '@/store/usePlans';
import { useStreak } from '@/store/useStreak';
import { useTheme } from '@/store/useTheme';
import { useRouter } from 'expo-router';

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

export default function TodayScreen() {
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const goToPlan = () => {
    router.push('/plan');
  };
  const user = useAuth((state) => state.user);
  const points = usePoints((state) => state.total);
  const blocks = usePlans((state) => state.blocks);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);
  const streakDays = useStreak((state) => state.streakDays);
  const initializeStreak = useStreak((state) => state.initialize);

  const [selectedBlock, setSelectedBlock] = useState<PlanBlock | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);

  const isGuest = Boolean(user && 'guest' in user && user.guest);
  const fallbackName = isGuest ? 'Guest User' : user?.email?.split('@')[0] ?? 'User';
  const displayName = user?.user_metadata?.full_name ?? user?.name ?? fallbackName;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  useEffect(() => {
    initializeStreak();
  }, [initializeStreak]);

  const today = todayDate();

  const todayBlocks = useMemo(() => {
    return blocks
      .filter((block) => block.date === today)
      .sort((a, b) => a.startMin - b.startMin);
  }, [blocks, today]);

  const totalPlans = todayBlocks.length;
  const completedPlans = todayBlocks.filter((block) => Boolean(block.done)).length;
  const totalHours =
    todayBlocks.reduce((sum, block) => sum + (block.endMin - block.startMin), 0) / 60;
  const summaryText =
    totalPlans === 0
      ? 'No plans yet - your day is wide open.'
      : `${totalPlans} plan${totalPlans === 1 ? '' : 's'} • ${completedPlans} completed • ${totalHours.toFixed(
          1,
        )} hours`;

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
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleAvatarPress}
            style={({ pressed }) => [
              styles.avatar,
              {
                borderColor: palette.border,
                backgroundColor: palette.accent,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.avatarInitials, { color: palette.background }]}>
              {initials}
            </Text>
          </Pressable>

          <View style={styles.headerStats}>
            <View style={styles.statBlock}>
              <Text style={[styles.statLabel, { color: palette.text }]}>Streak</Text>
              <Text style={[styles.statValue, { color: palette.text }]}>
                {streakDays} days
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/points')}
              style={({ pressed }) => [
                styles.statBlock,
                styles.pointsPressable,
                pressed && styles.pointsPressed,
              ]}>
              <Text style={[styles.statLabel, { color: palette.text }]}>Points</Text>
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

        <View
          style={[
            styles.nextUpCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.nextUpLabel, { color: palette.text }]}>Next up</Text>
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
                  {
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  Start focus
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.nextUpEmptyContainer}>
              <Text style={[styles.nextUpEmpty, { color: palette.text }]}>
                No upcoming blocks today.
              </Text>
              <Pressable
                onPress={goToPlan}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  {
                    alignSelf: 'flex-start',
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  Create a plan
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View
          style={[styles.summaryCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.summaryText, { color: palette.text }]}>{summaryText}</Text>
        </View>

        <View style={[styles.planCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.planTitle, { color: palette.text }]}>Today’s plan</Text>
          {todayBlocks.length === 0 ? (
            <View style={styles.planEmptyState}>
              <Text style={[styles.planEmptyTitle, { color: palette.text }]}>
                You haven’t planned today yet.
              </Text>
              <Text style={[styles.planEmptyHint, { color: palette.text }]}>
                Tap below to open the planner and create your first block.
              </Text>
              <Pressable
                onPress={goToPlan}
                style={({ pressed }) => [
                  styles.startFocusButton,
                  {
                    alignSelf: 'center',
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                    marginTop: 16,
                  },
                ]}>
                <Text style={[styles.startFocusText, { color: palette.background }]}>
                  Open planner
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statBlock: {
    marginLeft: 18,
  },
  pointsPressable: {
    marginLeft: 18,
    paddingVertical: 2,
    alignItems: 'flex-start',
  },
  pointsPressed: {
    opacity: 0.75,
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
    padding: 20,
    marginBottom: 16,
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
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  startFocusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
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
