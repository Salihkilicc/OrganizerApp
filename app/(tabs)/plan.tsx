import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DayStrip } from '@/components/DayStrip';
import { FocusModeOverlay } from '@/components/FocusModeOverlay';
import { HourColumn } from '@/components/HourColumn';
import { PlanEditor } from '@/components/PlanEditor';
import { PlanGrid } from '@/components/PlanGrid';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  usePlans,
  type PlanBlock,
  type PlanCategory,
  isAfterToday,
  isBeforeToday,
  isToday as isDateToday,
} from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';
import { usePoints } from '@/store/usePoints';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

const parseISO = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
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
  const router = useRouter();
  const { palette } = useTheme();
  const [selectedDate, setSelectedDate] = useState(() => toISO(new Date()));
  const loadPlans = usePlans((state) => state.load);
  const addPlan = usePlans((state) => state.add);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);
  const blocks = usePlans((state) => state.blocks);
  const isPast = isBeforeToday(selectedDate);
  const isToday = isDateToday(selectedDate);
  const isFuture = isAfterToday(selectedDate);
  const isEditableDay = isToday || isFuture;
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

  const selectedDateInstance = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const selectedMonthIndex = selectedDateInstance.getMonth();
  const selectedYear = selectedDateInstance.getFullYear();
  const dateLabel = useMemo(() => {
    const dayName = selectedDateInstance.toLocaleDateString(undefined, { weekday: 'long' });
    const monthName = selectedDateInstance.toLocaleDateString(undefined, { month: 'long' });
    return `${dayName} • ${selectedDateInstance.getDate()} ${monthName}`;
  }, [selectedDateInstance]);
  const monthTitle = selectedDateInstance.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const selectedMonthKey = `${selectedYear}-${selectedMonthIndex}`;
  const monthOptions = useMemo(() => {
    const now = new Date();
    const rangeStart = -1;
    const rangeEnd = 12;
    return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => {
      const offset = rangeStart + index;
      const optionDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return {
        key: `${optionDate.getFullYear()}-${optionDate.getMonth()}`,
        label: optionDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        year: optionDate.getFullYear(),
        month: optionDate.getMonth(),
      };
    });
  }, []);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorInitial, setEditorInitial] = useState<Partial<PlanBlock> | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

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
      if (isBeforeToday(current.date)) {
        Alert.alert('Past plans cannot be edited.');
        return;
      }
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

  const openMonthPicker = useCallback(() => setMonthPickerVisible(true), []);
  const closeMonthPicker = useCallback(() => setMonthPickerVisible(false), []);
  const handleMonthSelect = useCallback(
    (year: number, month: number) => {
      const maxDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(selectedDateInstance.getDate(), maxDay);
      const nextDate = new Date(year, month, day);
      setSelectedDate(toISO(nextDate));
      setMonthPickerVisible(false);
    },
    [selectedDateInstance],
  );

  const openFocusMode = useCallback(() => setFocusVisible(true), []);
  const closeFocusMode = useCallback(() => setFocusVisible(false), []);

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
            <Pressable
              onPress={openMonthPicker}
              style={({ pressed }) => [
                styles.monthSelector,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.monthTitle, { color: palette.text }]}>{monthTitle}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={palette.text}
                style={styles.monthIcon}
              />
            </Pressable>
            <Text style={[styles.subtitle, { color: palette.text }]}>{dateLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={openFocusMode}
              style={({ pressed }) => [
                styles.focusButton,
                {
                  backgroundColor: palette.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.focusButtonText, { color: palette.background }]}>Focus</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/points')}
              style={({ pressed }) => [
                styles.pointsBadge,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.pointsLabel, { color: palette.text }]}>{totalPoints} pts</Text>
            </Pressable>
          </View>
        </View>
        <DayStrip
          selected={selectedDate}
          year={selectedYear}
          month={selectedMonthIndex}
          onSelect={setSelectedDate}
        />
        <Modal
          visible={monthPickerVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={closeMonthPicker}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={closeMonthPicker} />
            <View
              style={[
                styles.monthModal,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}>
              <View style={[styles.monthModalHandle, { backgroundColor: palette.border }]} />
              <Text style={[styles.monthModalTitle, { color: palette.text }]}>Select month</Text>
              <ScrollView
                style={styles.monthModalList}
                contentContainerStyle={styles.monthModalListContent}
              >
                {monthOptions.map((option) => {
                  const isActive = option.key === selectedMonthKey;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => handleMonthSelect(option.year, option.month)}
                      style={({ pressed }) => [
                        styles.monthItem,
                        {
                          borderColor: palette.border,
                          backgroundColor: isActive ? palette.accent : palette.card,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.monthItemText,
                          { color: isActive ? palette.background : palette.text },
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
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
                  onCreateAtMinute={isEditableDay ? handleCreateAtMinute : undefined}
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
      {!isPast && (
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
      )}
      <PlanEditor
        visible={editorVisible}
        initial={editorInitial}
        date={selectedDate}
        onCancel={closeEditor}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <FocusModeOverlay visible={focusVisible} onClose={closeFocusMode} />
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
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 12,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  monthIcon: {
    marginLeft: 6,
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
  focusButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  focusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  monthModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  monthModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  monthModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthModalList: {
    maxHeight: 320,
  },
  monthModalListContent: {
    paddingBottom: 12,
  },
  monthItem: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  monthItemText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  gridArea: {
    flex: 1,
    marginLeft: 8,
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
