import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DayStrip } from '@/components/DayStrip';
import { HourColumn } from '@/components/HourColumn';
import { PlanEditor } from '@/components/PlanEditor';
import { PlanGrid } from '@/components/PlanGrid';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlans, type PlanBlock, type PlanCategory } from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';
import { useT } from '@/i18n';
import { usePoints } from '@/store/usePoints';

const HOURS_PER_DAY = 24;
const GRID_START = 0;
const GRID_END = HOURS_PER_DAY;
const STEP = 30;
const MIN_BLOCK = 60;
const TAP_BLOCK_DURATION = 30;
const PX_PER_MIN = 1;
const HOUR_COPIES = 3;
const DAY_MINUTES = HOURS_PER_DAY * 60;
const DAY_HEIGHT = DAY_MINUTES * PX_PER_MIN;

const toISO = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const nextRoundedStart = () => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = Math.min(Math.ceil(minutes / STEP) * STEP, 24 * 60 - MIN_BLOCK);
  return start;
};

type EditorValues = {
  title: string;
  startMin: number;
  endMin: number;
  note?: string;
  category: PlanCategory;
  done: boolean;
};

export default function PlanScreen() {
  const { palette } = useTheme();
  const t = useT();
  const heading = t ? t('plan') : 'Plan';
  const [selectedDate, setSelectedDate] = useState(() => toISO(new Date()));
  const loadPlans = usePlans((state) => state.load);
  const addPlan = usePlans((state) => state.add);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);
  const blocks = usePlans((state) => state.blocks);
  const totalPoints = usePoints((state) => state.total);
  const dailyBlocks = useMemo(
    () => blocks.filter((block) => block.date === selectedDate),
    [blocks, selectedDate],
  );

  const blocksForDay = dailyBlocks;
  const blockCount = blocksForDay.length;
  const totalMinutes = blocksForDay.reduce(
    (sum, b) => sum + Math.max(b.endMin - b.startMin, 0),
    0,
  );
  const totalHours = totalMinutes / 60;

  const dateLabel = useMemo(() => {
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateInstance = new Date(year, month - 1, day);
      const dayName = dateInstance.toLocaleDateString(undefined, { weekday: 'long' });
      const monthName = dateInstance.toLocaleDateString(undefined, { month: 'long' });
      return `${dayName} • ${day} ${monthName}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorInitial, setEditorInitial] = useState<Partial<PlanBlock> | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    setEditorVisible(false);
    setEditingId(null);
    setEditorInitial(undefined);
  }, [selectedDate]);

  const openAddEditor = useCallback(() => {
    const startMin = nextRoundedStart();
    setEditorInitial({
      startMin,
      endMin: Math.min(startMin + MIN_BLOCK, 24 * 60),
      category: 'focus',
    });
    setEditingId(null);
    setEditorVisible(true);
  }, []);

  const openEditEditor = useCallback(
    (id: string) => {
      const current = blocks.find((block) => block.id === id);
      if (!current) return;
      setEditorInitial(current);
      setEditingId(id);
      setEditorVisible(true);
    },
    [blocks],
  );

  const closeEditor = useCallback(() => {
    setEditorVisible(false);
    setEditingId(null);
    setEditorInitial(undefined);
  }, []);

  const handleSave = useCallback(
    async (values: EditorValues) => {
      if (editingId) {
        await updatePlan(editingId, values);
      } else {
        await addPlan({ ...values, date: selectedDate });
      }
      closeEditor();
    },
    [addPlan, closeEditor, editingId, selectedDate, updatePlan],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await removePlan(id);
      closeEditor();
    },
    [closeEditor, removePlan],
  );

  const handleCreateAtMinute = useCallback(
    (minute: number) => {
      const safeStart = Math.max(0, Math.min(minute, DAY_MINUTES - 1));
      const safeEnd = Math.min(safeStart + TAP_BLOCK_DURATION, DAY_MINUTES);
      setEditorInitial({
        startMin: safeStart,
        endMin: safeEnd,
        category: 'focus',
      });
      setEditingId(null);
      setEditorVisible(true);
    },
    [setEditorInitial, setEditorVisible, setEditingId],
  );

  const handleMove = useCallback(
    (id: string, newStartMin: number, newEndMin: number) => {
      updatePlan(id, { startMin: newStartMin, endMin: newEndMin });
    },
    [updatePlan],
  );

  const scrollRef = useRef<ScrollView>(null);
  const wrapScrollRef = useRef(false);
  const contentHeight = DAY_HEIGHT * HOUR_COPIES;

  useEffect(() => {
    const target = DAY_HEIGHT + 8 * 60 * PX_PER_MIN;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: target, animated: false });
    });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (wrapScrollRef.current) {
        wrapScrollRef.current = false;
        return;
      }
      const offsetY = event.nativeEvent.contentOffset.y;
      const lowerThreshold = DAY_HEIGHT * 0.5;
      const upperThreshold = DAY_HEIGHT * 1.5;
      let nextOffset: number | null = null;

      if (offsetY < lowerThreshold) {
        nextOffset = offsetY + DAY_HEIGHT;
      } else if (offsetY > upperThreshold) {
        nextOffset = offsetY - DAY_HEIGHT;
      }

      if (nextOffset !== null && scrollRef.current) {
        wrapScrollRef.current = true;
        scrollRef.current.scrollTo({ y: nextOffset, animated: false });
      }
    },
    [],
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={[styles.heading, { color: palette.text }]}>{heading}</Text>
            <Text style={[styles.subtitle, { color: palette.text }]}>{dateLabel}</Text>
          </View>
          <View
            style={[
              styles.pointsBadge,
              { borderColor: palette.border, backgroundColor: palette.card },
            ]}>
            <Text style={[styles.pointsLabel, { color: palette.text }]}>{totalPoints} pts</Text>
          </View>
        </View>
        <DayStrip selected={selectedDate} onSelect={setSelectedDate} />
        <View style={[styles.summaryRow, { borderColor: palette.border, backgroundColor: palette.card }]}>
          <Text style={[styles.summaryText, { color: palette.text }]}>
            {blockCount > 0
              ? `${blockCount} plan${blockCount === 1 ? '' : 's'} and ${totalHours.toFixed(1)} hours total`
              : 'No plan for this day yet. Use the grid below to add your first block.'}
          </Text>
        </View>
        <View style={styles.gridRow}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { height: contentHeight }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
          >
            <View style={styles.innerRow}>
              <HourColumn startHour={GRID_START} endHour={GRID_END} pxPerMin={PX_PER_MIN} />
              <View style={styles.gridArea}>
                <PlanGrid
                  date={selectedDate}
                  blocks={dailyBlocks}
                  onMove={handleMove}
                  onEdit={openEditEditor}
                  onCreateAtMinute={handleCreateAtMinute}
                  step={STEP}
                  startHour={GRID_START}
                  endHour={GRID_END}
                  pxPerMin={PX_PER_MIN}
                  contentHeight={contentHeight}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      <Pressable
        onPress={openAddEditor}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: palette.accent,
            opacity: pressed ? 0.8 : 1,
          },
        ]}>
        <Text style={[styles.fabText, { color: palette.background }]}>+</Text>
      </Pressable>
      <PlanEditor
        visible={editorVisible}
        initial={editorInitial}
        date={selectedDate}
        onCancel={closeEditor}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitles: {
    flex: 1,
    marginRight: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  pointsBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  pointsLabel: {
    fontWeight: '600',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gridArea: {
    flex: 1,
    marginLeft: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  summaryRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  summaryText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 32,
  },
});
