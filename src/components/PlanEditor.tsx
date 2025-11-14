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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const pad = (value: number) => value.toString().padStart(2, '0');
const getTimeParts = (minutes: number) => ({
  hours: Math.floor(minutes / 60),
  minutes: minutes % 60,
});
const sanitizeDigits = (value: string) => value.replace(/\D/g, '').slice(0, 2);
const parseFieldNumber = (text: string, fallback: number, max: number) => {
  if (text.length === 0) return fallback;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 0, max);
};
const getMinutesFromFields = (hourText: string, minuteText: string, fallbackMinutes: number) => {
  const fallbackHours = Math.floor(fallbackMinutes / 60);
  const fallbackMinutesPart = fallbackMinutes % 60;
  const hours = parseFieldNumber(hourText, fallbackHours, 23);
  const minutes = parseFieldNumber(minuteText, fallbackMinutesPart, 59);
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
  const [startHourText, setStartHourText] = useState(() => pad(Math.floor(defaultStart / 60)));
  const [startMinuteText, setStartMinuteText] = useState(() => pad(defaultStart % 60));
  const [endHourText, setEndHourText] = useState(() => pad(Math.floor(defaultEnd / 60)));
  const [endMinuteText, setEndMinuteText] = useState(() => pad(defaultEnd % 60));
  const [category, setCategory] = useState<PlanCategory>(initial?.category ?? 'focus');
  const [done, setDone] = useState(initial?.done ?? false);
  useEffect(() => {
    const nextStart = initial?.startMin ?? defaultStart;
    const nextEnd = initial?.endMin ?? defaultEnd;
    setTitle(initial?.title ?? '');
    setNote(initial?.note ?? '');
    setStartMin(nextStart);
    setEndMin(nextEnd);
    const startParts = getTimeParts(nextStart);
    const endParts = getTimeParts(nextEnd);
    setStartHourText(pad(startParts.hours));
    setStartMinuteText(pad(startParts.minutes));
    setEndHourText(pad(endParts.hours));
    setEndMinuteText(pad(endParts.minutes));
  }, [initial, defaultStart, defaultEnd, visible]);

  useEffect(() => {
    setCategory(initial?.category ?? 'focus');
    setDone(initial?.done ?? false);
  }, [initial, visible]);

  const applyStartTime = (minutes: number) => {
    const nextStartMin = clamp(minutes, 0, 24 * 60 - MIN_DURATION);
    setStartMin(nextStartMin);
    const startParts = getTimeParts(nextStartMin);
    setStartHourText(pad(startParts.hours));
    setStartMinuteText(pad(startParts.minutes));

    const requiredEnd = nextStartMin + MIN_DURATION;
    if (endMin < requiredEnd) {
      const nextEndMin = clamp(requiredEnd, requiredEnd, 24 * 60);
      setEndMin(nextEndMin);
      const endParts = getTimeParts(nextEndMin);
      setEndHourText(pad(endParts.hours));
      setEndMinuteText(pad(endParts.minutes));
    }
  };

  const applyEndTime = (minutes: number, startReference?: number) => {
    const baseStartMin = typeof startReference === 'number' ? startReference : startMin;
    const requiredEnd = clamp(baseStartMin + MIN_DURATION, 0, 24 * 60);
    const nextEndMin = clamp(minutes, requiredEnd, 24 * 60);
    setEndMin(nextEndMin);
    const endParts = getTimeParts(nextEndMin);
    setEndHourText(pad(endParts.hours));
    setEndMinuteText(pad(endParts.minutes));
  };

  const commitStartFromFields = () => {
    const minutes = getMinutesFromFields(startHourText, startMinuteText, startMin);
    applyStartTime(minutes);
  };

  const commitEndFromFields = () => {
    const minutes = getMinutesFromFields(endHourText, endMinuteText, endMin);
    applyEndTime(minutes);
  };

  const handleStartHourChange = (value: string) => {
    setStartHourText(sanitizeDigits(value));
  };

  const handleStartMinuteChange = (value: string) => {
    setStartMinuteText(sanitizeDigits(value));
  };

  const handleEndHourChange = (value: string) => {
    setEndHourText(sanitizeDigits(value));
  };

  const handleEndMinuteChange = (value: string) => {
    setEndMinuteText(sanitizeDigits(value));
  };

  const derivedStartMin = getMinutesFromFields(startHourText, startMinuteText, startMin);
  const derivedEndMin = getMinutesFromFields(endHourText, endMinuteText, endMin);
  const isValid = title.trim().length > 0 && derivedEndMin > derivedStartMin;

  const handleSave = () => {
    try {
      const trimmedTitle = title.trim();
      const trimmedNote = note.trim() || undefined;
      const rawStart = getMinutesFromFields(startHourText, startMinuteText, startMin);
      const normalizedStart = clamp(rawStart, 0, 24 * 60 - MIN_DURATION);
      const rawEnd = getMinutesFromFields(endHourText, endMinuteText, endMin);
      const minEnd = clamp(normalizedStart + MIN_DURATION, 0, 24 * 60);
      const normalizedEnd = clamp(rawEnd, minEnd, 24 * 60);

      console.log('[PlanEditor/save]', {
        title: trimmedTitle,
        startMin: normalizedStart,
        endMin: normalizedEnd,
        category,
        date,
      });

      if (!Number.isFinite(normalizedStart) || !Number.isFinite(normalizedEnd)) {
        throw new Error('Start or end time is invalid');
      }
      if (normalizedEnd <= normalizedStart) {
        throw new Error('End time must be after start time');
      }
      if (trimmedTitle.length === 0) {
        throw new Error('Title is required');
      }

      applyStartTime(normalizedStart);
      applyEndTime(normalizedEnd, normalizedStart);

      onSave({
        title: trimmedTitle,
        note: trimmedNote,
        startMin: normalizedStart,
        endMin: normalizedEnd,
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
          <View style={styles.sectionGap}>
            <View style={styles.timeRow}>
              <View style={[styles.timeInputContainer, { borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.text }]}>Start</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[
                      styles.timeSegmentInput,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    value={startHourText}
                    onChangeText={handleStartHourChange}
                    onEndEditing={commitStartFromFields}
                    placeholder="HH"
                    placeholderTextColor={palette.border}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                  <Text style={[styles.timeSeparator, { color: palette.text }]}>:</Text>
                  <TextInput
                    style={[
                      styles.timeSegmentInput,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    value={startMinuteText}
                    onChangeText={handleStartMinuteChange}
                    onEndEditing={commitStartFromFields}
                    placeholder="MM"
                    placeholderTextColor={palette.border}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                </View>
              </View>
              <View
                style={[styles.timeInputContainer, styles.timeInputContainerRight, { borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.text }]}>End</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[
                      styles.timeSegmentInput,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    value={endHourText}
                    onChangeText={handleEndHourChange}
                    onEndEditing={commitEndFromFields}
                    placeholder="HH"
                    placeholderTextColor={palette.border}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                  <Text style={[styles.timeSeparator, { color: palette.text }]}>:</Text>
                  <TextInput
                    style={[
                      styles.timeSegmentInput,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    value={endMinuteText}
                    onChangeText={handleEndMinuteChange}
                    onEndEditing={commitEndFromFields}
                    placeholder="MM"
                    placeholderTextColor={palette.border}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                    autoCapitalize="none"
                    autoCorrect={false}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.sectionGap}>
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
          </View>
          <View style={styles.sectionGap}>
            <TextInput
              style={[
                styles.input,
                styles.noteInput,
                {
                  backgroundColor: palette.background,
                  color: palette.text,
                  borderColor: palette.border,
                },
              ]}
              placeholder="Note (optional)"
              placeholderTextColor={palette.border}
              multiline
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />
          </View>
          <View style={styles.actions}>
            {initial?.id && (
              <Pressable
                onPress={() => setDone((value) => !value)}
                style={({ pressed }) => [
                  styles.doneActionButton,
                  {
                    borderColor: palette.accent,
                    backgroundColor: done ? palette.accent : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text
                  style={[
                    styles.doneActionText,
                    { color: done ? palette.background : palette.accent },
                  ]}>
                  {done ? 'Completed' : 'Mark as completed'}
                </Text>
              </Pressable>
            )}
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    elevation: 6,
  },
  sectionGap: {
    marginTop: 18,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888',
    padding: 12,
    minHeight: 44,
  },
  noteInput: {
    minHeight: 84,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
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
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
  },
  timeInputContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  timeInputContainerRight: {
    marginLeft: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  timeSegmentInput: {
    width: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#888',
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 20,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 22,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 24,
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
  doneActionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  doneActionText: {
    fontWeight: '600',
    fontSize: 12,
  },
  deleteRow: {
    marginTop: 16,
  },
});
