import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { DayStrip } from '@/components/DayStrip';
import { HourColumn } from '@/components/HourColumn';
import { PlanEditor } from '@/components/PlanEditor';
import { PlanGrid } from '@/components/PlanGrid';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlans, type PlanBlock } from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';
import { useT } from '@/i18n';

const GRID_START = 6;
const GRID_END = 24;
const STEP = 30;
const MIN_BLOCK = 60;

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
  const dailyBlocks = useMemo(
    () => blocks.filter((block) => block.date === selectedDate),
    [blocks, selectedDate],
  );

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
    setEditorInitial({ startMin, endMin: Math.min(startMin + MIN_BLOCK, 24 * 60) });
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
    (id: string) => {
      removePlan(id);
    },
    [removePlan],
  );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.heading, { color: palette.text }]}>{heading}</Text>
        <DayStrip selected={selectedDate} onSelect={setSelectedDate} />
        <View style={styles.gridRow}>
          <HourColumn startHour={GRID_START} endHour={GRID_END} pxPerMin={1} />
        <View style={styles.gridArea}>
          <PlanGrid
            date={selectedDate}
            blocks={dailyBlocks}
            onEdit={openEditEditor}
            onLongDelete={handleDelete}
            step={STEP}
            startHour={GRID_START}
            endHour={GRID_END}
            pxPerMin={1}
          />
        </View>
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
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
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
