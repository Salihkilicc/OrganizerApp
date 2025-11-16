import { useMemo, useState } from 'react';
import {
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

export default function TodayScreen() {
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const points = usePoints((state) => state.total);
  const blocks = usePlans((state) => state.blocks);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);

  const [selectedBlock, setSelectedBlock] = useState<PlanBlock | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);

  const isGuest = Boolean(user && 'guest' in user && user.guest);
  const fallbackName = isGuest ? 'Guest User' : user?.email?.split('@')[0] ?? 'User';
  const displayName = user?.user_metadata?.full_name ?? user?.name ?? fallbackName;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const today = todayDate();

  const todayBlocks = useMemo(() => {
    return blocks
      .filter((block) => block.date === today)
      .sort((a, b) => a.startMin - b.startMin);
  }, [blocks, today]);

  const streakDays = 0; // TODO: wire real streak tracking from focus mode.

  const handleAvatarPress = () => {
    router.push('/profile');
  };

  const handleBlockPress = (block: PlanBlock) => {
    setSelectedBlock(block);
    setEditorVisible(true);
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
            <View style={styles.statBlock}>
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
            </View>
          </View>
        </View>

        <View style={[styles.planCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.planTitle, { color: palette.text }]}>Today’s plan</Text>
          {todayBlocks.length === 0 ? (
            <Text style={[styles.emptyState, { color: palette.text }]}>
              No plan for today – create one from the Plan tab.
            </Text>
          ) : (
            todayBlocks.map((block) => {
              const accentColor = block.color ?? palette.accent;
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
                  <View style={[styles.blockAccent, { backgroundColor: accentColor }]} />
                  <View style={styles.blockInfo}>
                    <Text style={[styles.blockTime, { color: palette.text }]}>
                      {formatRange(block)}
                    </Text>
                    <Text
                      style={[styles.blockTitle, { color: palette.text }]}
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
    alignItems: 'flex-start',
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
  emptyState: {
    fontSize: 14,
    lineHeight: 20,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  blockAccent: {
    width: 4,
    height: 48,
    borderRadius: 3,
    marginRight: 12,
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
