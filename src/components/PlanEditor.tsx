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

const parseTimeInput = (value: string): number | null => {
  const normalized = value.trim().replace(/\./g, ':');
  if (normalized.length === 0) {
    return null;
  }

  if (normalized.includes(':')) {
    const [hoursRaw, minutesRaw] = normalized.split(':');
    if (!hoursRaw || !minutesRaw) return null;
    if (!/^\d{1,2}$/.test(hoursRaw) || !/^\d{1,2}$/.test(minutesRaw)) return null;
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length < 3 || digitsOnly.length > 4) {
    return null;
  }
  const hours = Number(digitsOnly.slice(0, digitsOnly.length - 2));
  const minutes = Number(digitsOnly.slice(-2));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
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
    done: boolean;
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
  const [startInput, setStartInput] = useState(formatTime(defaultStart));
  const [endInput, setEndInput] = useState(formatTime(defaultEnd));
  const [category, setCategory] = useState<PlanCategory>(initial?.category ?? 'focus');
  const [done, setDone] = useState(initial?.done ?? false);

  useEffect(() => {
    const nextStart = initial?.startMin ?? defaultStart;
    const nextEnd = initial?.endMin ?? defaultEnd;
    setTitle(initial?.title ?? '');
    setNote(initial?.note ?? '');
    setStartMin(nextStart);
    setEndMin(nextEnd);
    setStartInput(formatTime(nextStart));
    setEndInput(formatTime(nextEnd));
  }, [initial, defaultStart, defaultEnd, visible]);

  useEffect(() => {
    setCategory(initial?.category ?? 'focus');
    setDone(initial?.done ?? false);
  }, [initial, visible]);

  const handleStartInputChange = (value: string) => {
    const parsed = parseTimeInput(value);
    if (parsed === null) {
      setStartInput(value);
      return;
    }
    const clampedStart = clamp(parsed, 0, 24 * 60 - MIN_DURATION);
    setStartMin(clampedStart);
    setStartInput(formatTime(clampedStart));
    if (endMin < clampedStart + MIN_DURATION) {
      const nextEnd = clamp(clampedStart + MIN_DURATION, clampedStart + MIN_DURATION, 24 * 60);
      setEndMin(nextEnd);
      setEndInput(formatTime(nextEnd));
    }
  };

  const handleEndInputChange = (value: string) => {
    const parsed = parseTimeInput(value);
    if (parsed === null) {
      setEndInput(value);
      return;
    }
    const minEnd = startMin + MIN_DURATION;
    const clampedEnd = clamp(parsed, minEnd, 24 * 60);
    setEndMin(clampedEnd);
    setEndInput(formatTime(clampedEnd));
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
        done,
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
          <View style={styles.timeRow}>
            <View style={[styles.timeInputContainer, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.text }]}>Start</Text>
              <TextInput
                style={[styles.timeInput, { color: palette.text }]}
                value={startInput}
                onChangeText={handleStartInputChange}
                placeholder="07:00"
                placeholderTextColor={palette.border}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View
              style={[styles.timeInputContainer, styles.timeInputContainerRight, { borderColor: palette.border }]}>
              <Text style={[styles.label, { color: palette.text }]}>End</Text>
              <TextInput
                style={[styles.timeInput, { color: palette.text }]}
                value={endInput}
                onChangeText={handleEndInputChange}
                placeholder="07:00"
                placeholderTextColor={palette.border}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
          {initial && (
            <View style={styles.doneActionRow}>
              <Text style={[styles.label, { color: palette.text }]}>Completed / Tamamlandı</Text>
              <Pressable
                onPress={() => setDone((value) => !value)}
                style={({ pressed }) => [
                  styles.doneButton,
                  {
                    borderColor: palette.accent,
                    backgroundColor: done ? palette.accent : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.doneButtonText,
                    { color: done ? palette.background : palette.accent },
                  ]}>
                  {done ? 'Completed' : 'Mark as completed'}
                </Text>
              </Pressable>
            </View>
          )}
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
  doneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  timeInputContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  timeInputContainerRight: {
    marginLeft: 8,
  },
  timeInput: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
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
  doneButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  deleteRow: {
    marginTop: 12,
  },
});
