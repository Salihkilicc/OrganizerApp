import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';
import { useI18n } from '@/i18n/useI18n';
import type { PlanBlock, PlanCategory } from '@/store/usePlans';
import { useSettings } from '@/store/useSettings'; // Import Settings
import { useTheme } from '@/store/useTheme';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const pad = (value: number) => value.toString().padStart(2, '0');
const sanitizeDigits = (value: string) => value.replace(/\D/g, '').slice(0, 2);

// Helper to convert total minutes to display strings (HH, MM, AM/PM)
const minutesToDisplay = (totalMinutes: number, is24Hour: boolean) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (is24Hour) {
    return {
      hour: pad(h),
      minute: pad(m),
      period: null, // No period in 24h
    };
  } else {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12; // Convert 0 -> 12, 13 -> 1
    return {
      hour: pad(h12),
      minute: pad(m),
      period,
    };
  }
};

// Helper to convert display strings back to total minutes
const displayToMinutes = (hourStr: string, minuteStr: string, period: string | null, is24Hour: boolean) => {
  let h = parseInt(hourStr || '0', 10);
  const m = parseInt(minuteStr || '0', 10);

  if (isNaN(h)) h = 0;
  if (isNaN(m)) return 0; // Invalid minute

  if (is24Hour) {
    h = clamp(h, 0, 23);
  } else {
    // 12h Logic
    h = clamp(h, 1, 12);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
  }

  return h * 60 + clamp(m, 0, 59);
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
const ANIMATION_DURATION = 220;
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const CATEGORY_OPTIONS: { value: PlanCategory }[] = [
  { value: 'focus' },
  { value: 'study' },
  { value: 'work' },
  { value: 'gym' },
  { value: 'meeting' },
  { value: 'reading' },
  { value: 'break' },
  { value: 'personal' },
  { value: 'other' },
];

export const PlanEditor = ({ visible, initial, date, onCancel, onSave, onDelete }: Props) => {
  const { palette, themeKey } = useTheme();
  const { t } = useI18n();
  const { is24Hour } = useSettings(); // Use global setting
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [modalVisible, setModalVisible] = useState(visible);

  // Default Times (8:00 AM - 9:00 AM)
  const defaultStart = useMemo(() => initial?.startMin ?? 8 * 60, [initial]);
  const defaultEnd = useMemo(() => initial?.endMin ?? defaultStart + 60, [defaultStart, initial?.endMin]);

  // Form State
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [category, setCategory] = useState<PlanCategory>(initial?.category ?? 'focus');

  // Time Inputs State
  const [startHourText, setStartHourText] = useState('');
  const [startMinuteText, setStartMinuteText] = useState('');
  const [startPeriod, setStartPeriod] = useState<string | null>(null);

  const [endHourText, setEndHourText] = useState('');
  const [endMinuteText, setEndMinuteText] = useState('');
  const [endPeriod, setEndPeriod] = useState<string | null>(null);

  // Sync state when opening
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }).start();

      // Initialize Fields
      const s = minutesToDisplay(initial?.startMin ?? defaultStart, is24Hour);
      setStartHourText(s.hour);
      setStartMinuteText(s.minute);
      setStartPeriod(s.period);

      const e = minutesToDisplay(initial?.endMin ?? defaultEnd, is24Hour);
      setEndHourText(e.hour);
      setEndMinuteText(e.minute);
      setEndPeriod(e.period);

      setTitle(initial?.title ?? '');
      setNote(initial?.note ?? '');
      setCategory(initial?.category ?? 'focus');
    } else {
      if (modalVisible) {
        Animated.timing(fadeAnim, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setModalVisible(false);
        });
      }
    }
  }, [visible, initial, defaultStart, defaultEnd, is24Hour]); // Re-run if is24Hour changes

  const togglePeriod = (current: string | null, setter: (v: string | null) => void) => {
    if (!current) return;
    setter(current === 'AM' ? 'PM' : 'AM');
  };

  const handleSave = () => {
    try {
      const trimmedTitle = title.trim();
      const startMin = displayToMinutes(startHourText, startMinuteText, startPeriod, is24Hour);
      const endMin = displayToMinutes(endHourText, endMinuteText, endPeriod, is24Hour);

      if (trimmedTitle.length === 0) throw new Error(t((d) => d.plan.editor.errorTitleRequired));
      if (endMin <= startMin) throw new Error(t((d) => d.plan.editor.errorEndBeforeStart));

      onSave({
        title: trimmedTitle,
        note: note.trim() || undefined,
        startMin,
        endMin,
        category,
      });
    } catch (err) {
      Alert.alert(t((d) => d.plan.editor.saveErrorTitle), err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = () => {
    if (onDelete && initial?.id) {
      onDelete(initial.id);
      onCancel();
    }
  };

  if (!modalVisible && !visible) return null;

  return (
    <Modal visible={modalVisible || visible} animationType="none" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <AnimatedScrollView
          style={[styles.overlayScroll, { opacity: fadeAnim }]}
          contentContainerStyle={[styles.overlayContent, { paddingBottom: 20 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

          <View style={styles.centerContainer}>
            <View style={[styles.card, { backgroundColor: themeKey === 'dark' ? '#1A1A1A' : palette.card, borderColor: palette.border }]}>

              {/* TITLE */}
              <View style={styles.inputSection}>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
                  placeholder={t((d) => d.plan.editor.titlePlaceholder)}
                  placeholderTextColor={`${palette.text}66`}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* TIME ROW */}
              <View style={[styles.sectionGap, styles.timeRow]}>

                {/* START TIME */}
                <View style={styles.timeGroup}>
                  <Text style={[styles.label, { color: palette.text }]}>{t((d) => d.plan.editor.startLabel)}</Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                      value={startHourText}
                      onChangeText={(t) => setStartHourText(sanitizeDigits(t))}
                      placeholder="HH"
                      placeholderTextColor={`${palette.text}40`}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <Text style={[styles.colon, { color: palette.text }]}>:</Text>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                      value={startMinuteText}
                      onChangeText={(t) => setStartMinuteText(sanitizeDigits(t))}
                      placeholder="MM"
                      placeholderTextColor={`${palette.text}40`}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    {/* AM/PM Toggle */}
                    {!is24Hour && (
                      <Pressable
                        onPress={() => togglePeriod(startPeriod, setStartPeriod)}
                        style={[styles.periodBtn, { backgroundColor: palette.background, borderColor: palette.border }]}
                      >
                        <Text style={{ color: palette.accent, fontWeight: 'bold', fontSize: 12 }}>{startPeriod}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* END TIME */}
                <View style={styles.timeGroup}>
                  <Text style={[styles.label, { color: palette.text }]}>{t((d) => d.plan.editor.endLabel)}</Text>
                  <View style={styles.timeInputs}>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                      value={endHourText}
                      onChangeText={(t) => setEndHourText(sanitizeDigits(t))}
                      placeholder="HH"
                      placeholderTextColor={`${palette.text}40`}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    <Text style={[styles.colon, { color: palette.text }]}>:</Text>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.text }]}
                      value={endMinuteText}
                      onChangeText={(t) => setEndMinuteText(sanitizeDigits(t))}
                      placeholder="MM"
                      placeholderTextColor={`${palette.text}40`}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                    {/* AM/PM Toggle */}
                    {!is24Hour && (
                      <Pressable
                        onPress={() => togglePeriod(endPeriod, setEndPeriod)}
                        style={[styles.periodBtn, { backgroundColor: palette.background, borderColor: palette.border }]}
                      >
                        <Text style={{ color: palette.accent, fontWeight: 'bold', fontSize: 12 }}>{endPeriod}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* CATEGORIES */}
              <View style={styles.sectionGap}>
                <View style={[styles.categoryRow, { borderColor: palette.border }]}>
                  {CATEGORY_OPTIONS.map((option) => {
                    const selected = option.value === category;
                    const color = PLAN_CATEGORY_COLORS[option.value];
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setCategory(option.value)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: selected ? color.background : 'transparent',
                            borderColor: selected ? color.border : 'transparent'
                          }
                        ]}
                      >
                        <Text style={[
                          styles.categoryLabel,
                          { color: selected ? palette.text : `${palette.text}90`, fontWeight: selected ? '700' : '400' }
                        ]}>
                          {t((d) => d.plan.categories[option.value])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* NOTES */}
              <View style={styles.sectionGap}>
                <TextInput
                  style={[styles.input, styles.noteInput, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
                  placeholder={t((d) => d.plan.editor.notePlaceholder)}
                  placeholderTextColor={`${palette.text}66`}
                  multiline
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* ACTIONS */}
              <View style={styles.actions}>
                <Button title={t((d) => d.plan.editor.cancel)} onPress={onCancel} type="secondary" />
                <Button title={t((d) => d.plan.editor.save)} onPress={handleSave} />
              </View>

              {initial?.id && onDelete && (
                <Pressable onPress={handleDelete} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>{t((d) => d.plan.editor.delete)}</Text>
                </Pressable>
              )}

            </View>
          </View>
        </AnimatedScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlayScroll: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  overlayContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  centerContainer: { width: '100%', alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  sectionGap: { marginTop: 16 },
  inputSection: { width: '100%' },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
  },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  timeGroup: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', opacity: 0.7 },
  timeInputs: { flexDirection: 'row', alignItems: 'center' },
  timeInput: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  colon: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 4 },
  periodBtn: {
    marginLeft: 6,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 4 },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryLabel: { fontSize: 13 },
  actions: { flexDirection: 'row', marginTop: 24, gap: 16 },
  deleteBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
  deleteText: { color: '#FF453A', fontWeight: '600' },
});
