import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/store/useTheme';
import type { PlanBlock, PlanCategory } from '@/store/usePlans';

const pad = (value: number) => value.toString().padStart(2, '0');
const formatTime = (min: number) => {
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  return `${pad(hours)}:${pad(minutes)}`;
};

type Props = {
  visible: boolean;
  initial?: Partial<PlanBlock>;
  date: string;
  onCancel: () => void;
  onSave: (values: {
    title: string;
    startMin: number;
    endMin: number;
    note?: string;
    category: PlanCategory;
  }) => void;
  onDelete?: (id: string) => void;
};

const MIN_DURATION = 30;
const CATEGORY_OPTIONS: { label: string; value: PlanCategory }[] = [
  { label: 'Focus', value: 'focus' },
  { label: 'Study', value: 'study' },
  { label: 'Work', value: 'work' },
  { label: 'Gym', value: 'gym' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Reading', value: 'reading' },
  { label: 'Break', value: 'break' },
  { label: 'Personal', value: 'personal' },
  { label: 'Other', value: 'other' },
];

export const PlanEditor = ({ visible, initial, date, onCancel, onSave, onDelete }: Props) => {
  const { palette } = useTheme();
  const defaultStart = useMemo(() => initial?.startMin ?? 8 * 60, [initial]);
  const defaultEnd = useMemo(
    () => initial?.endMin ?? defaultStart + 60,
    [defaultStart, initial?.endMin],
  );

  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [startMin, setStartMin] = useState(defaultStart);
  const [endMin, setEndMin] = useState(defaultEnd);
  const [category, setCategory] = useState<PlanCategory>(initial?.category ?? 'focus');

  useEffect(() => {
    setTitle(initial?.title ?? '');
    setNote(initial?.note ?? '');
    setStartMin(initial?.startMin ?? defaultStart);
    setEndMin(initial?.endMin ?? defaultEnd);
  }, [initial, defaultStart, defaultEnd, visible]);

  useEffect(() => {
    setCategory(initial?.category ?? 'focus');
  }, [initial, visible]);

  const increaseStart = (delta: number) => {
    setStartMin((prev) => {
      const next = clamp(prev + delta, 0, endMin - MIN_DURATION);
      if (next + MIN_DURATION > endMin) {
        setEndMin(next + MIN_DURATION);
      }
      return next;
    });
  };

  const increaseEnd = (delta: number) => {
    setEndMin((prev) => clamp(prev + delta, startMin + MIN_DURATION, 24 * 60));
  };

  const isValid = title.trim().length > 0 && endMin > startMin;

  const handleSave = () => {
    try {
      const trimmedTitle = title.trim();
      const trimmedNote = note.trim() || undefined;
      const safeStart = clamp(startMin, 0, 24 * 60);
      const safeEnd = clamp(endMin, 0, 24 * 60);

      console.log('[PlanEditor/save]', {
        title: trimmedTitle,
        startMin: safeStart,
        endMin: safeEnd,
        category,
        date,
      });

      if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd)) {
        throw new Error('Start or end time is invalid');
      }
      if (safeEnd <= safeStart) {
        throw new Error('End time must be after start time');
      }
      if (trimmedTitle.length === 0) {
        throw new Error('Title is required');
      }

      onSave({
        title: trimmedTitle,
        note: trimmedNote,
        startMin: safeStart,
        endMin: safeEnd,
        category,
      });
    } catch (err) {
      console.warn('[PlanEditor/error]', err);
      Alert.alert('Plan save failed', err instanceof Error ? err.message : String(err));
    }
  };

  const canDelete = Boolean(onDelete && initial?.id);
  const handleDelete = () => {
    if (!onDelete || !initial?.id) return;
    onDelete(initial.id);
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.heading, { color: palette.text }]}>Plan for {date}</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.background,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Title"
            placeholderTextColor={palette.border}
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.background,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Note (optional)"
            placeholderTextColor={palette.border}
            multiline
            value={note}
            onChangeText={setNote}
          />
          <View style={[styles.categoryRow, { borderColor: palette.border }]}>
            {CATEGORY_OPTIONS.map((option) => {
              const selected = option.value === category;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory(option.value)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: palette.border,
                      backgroundColor: selected ? palette.accent : 'transparent',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: selected ? palette.background : palette.text },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.row}>
            <View style={[styles.timeControl, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.text }]}>Start</Text>
              <Text style={[styles.timeValue, { color: palette.text }]}>{formatTime(startMin)}</Text>
              <View style={styles.controlRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepButton,
                    { borderColor: palette.border },
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => increaseStart(-MIN_DURATION)}>
                  <Text style={styles.stepText}>-</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepButton,
                    { borderColor: palette.border, marginLeft: 8 },
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => increaseStart(MIN_DURATION)}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={[styles.timeControl, styles.timeControlRight, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.text }]}>End</Text>
              <Text style={[styles.timeValue, { color: palette.text }]}>{formatTime(endMin)}</Text>
              <View style={styles.controlRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepButton,
                    { borderColor: palette.border },
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => increaseEnd(-MIN_DURATION)}>
                  <Text style={styles.stepText}>-</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.stepButton,
                    { borderColor: palette.border, marginLeft: 8 },
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => increaseEnd(MIN_DURATION)}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionGhost,
                { borderColor: palette.border },
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={[styles.actionText, { color: palette.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!isValid}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isValid ? palette.accent : palette.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text style={[styles.actionText, { color: palette.background }]}>Save</Text>
            </Pressable>
          </View>
          {canDelete && (
            <View style={styles.deleteRow}>
              <Button title="Delete plan" type="ghost" onPress={handleDelete} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 6,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888',
    padding: 12,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginTop: 12,
  },
  categoryChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeControl: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888',
    padding: 12,
    marginRight: 8,
  },
  timeControlRight: {
    marginRight: 0,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 6,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  actionGhost: {
    borderWidth: 1,
    borderColor: '#888',
    marginRight: 8,
  },
  actionText: {
    fontWeight: '600',
  },
  deleteRow: {
    marginTop: 12,
  },
});
