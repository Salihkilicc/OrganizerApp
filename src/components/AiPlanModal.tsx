import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PlanBlock } from '@/store/usePlans';
import { AiPlanBlock, AiPlanRequest, generatePlanFromAI } from '@/lib/aiPlan';
import { useTheme } from '@/store/useTheme';

type AiPlanModalProps = {
  visible: boolean;
  date: string;
  onClose: () => void;
  onApply: (blocks: PlanBlock[]) => void;
};

const formatDateLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatMinutes = (value: number) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${pad(hours)}:${pad(minutes)}`;
};

const buildPlanBlock = (date: string, block: AiPlanBlock): PlanBlock => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: block.title,
  category: block.category,
  startMin: block.startMin,
  endMin: block.endMin,
  note: block.note,
  date,
  createdAt: new Date().toISOString(),
  done: false,
  rewarded: false,
});

export function AiPlanModal({ visible, date, onClose, onApply }: AiPlanModalProps) {
  const { palette } = useTheme();
  const [wakeTime, setWakeTime] = useState('07:30');
  const [sleepTime, setSleepTime] = useState('23:30');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [focusHours, setFocusHours] = useState('3');
  const [priorities, setPriorities] = useState('');
  const [habits, setHabits] = useState('');
  const [previewBlocks, setPreviewBlocks] = useState<AiPlanBlock[]>([]);
  const [stage, setStage] = useState<'form' | 'preview'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLabel = useMemo(() => formatDateLabel(date), [date]);
  const hasPreview = Array.isArray(previewBlocks) && previewBlocks.length > 0;

  const resetState = useCallback(() => {
    setStage('form');
    setPreviewBlocks([]);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [resetState, visible]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const parsedFocus = Number(focusHours);
      const request: AiPlanRequest = {
        date,
        wakeTime: wakeTime.trim() || undefined,
        sleepTime: sleepTime.trim() || undefined,
        workStart: workStart.trim() || undefined,
        workEnd: workEnd.trim() || undefined,
        focusHours: Number.isFinite(parsedFocus) ? parsedFocus : undefined,
        priorities: priorities.trim() || undefined,
        habits: habits.trim() || undefined,
      };
      const { blocks } = await generatePlanFromAI(request);
      setError(null);
      setPreviewBlocks(Array.isArray(blocks) ? blocks : []);
      if (!Array.isArray(blocks) || blocks.length === 0) {
        setError('No blocks returned from AI.');
      }
      setStage('preview');
    } catch (err) {
      console.error('[AiPlanModal]', err);
      setPreviewBlocks([]);
      setError('Unable to generate a plan right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [date, focusHours, habits, priorities, wakeTime, sleepTime, workEnd, workStart]);

  const handleApply = useCallback(() => {
    const planBlocks = previewBlocks.map((block) => buildPlanBlock(date, block));
    onApply(planBlocks);
    resetState();
    onClose();
  }, [date, onApply, onClose, previewBlocks, resetState]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.text }]}>AI Plan</Text>
          <Text style={[styles.subTitle, { color: palette.text }]}>{dateLabel}</Text>

          {stage === 'form' ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Wake time</Text>
                <TextInput
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  style={[
                    styles.input,
                    { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="07:30"
                  placeholderTextColor={palette.text}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Sleep time</Text>
                <TextInput
                  value={sleepTime}
                  onChangeText={setSleepTime}
                  style={[
                    styles.input,
                    { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="23:30"
                  placeholderTextColor={palette.text}
                />
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={[styles.fieldLabel, { color: palette.text }]}>Work start</Text>
                  <TextInput
                    value={workStart}
                    onChangeText={setWorkStart}
                    style={[
                      styles.input,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    placeholder="09:00"
                    placeholderTextColor={palette.text}
                  />
                </View>
                <View style={[styles.fieldHalf, styles.fieldHalfLast]}>
                  <Text style={[styles.fieldLabel, { color: palette.text }]}>Work end</Text>
                  <TextInput
                    value={workEnd}
                    onChangeText={setWorkEnd}
                    style={[
                      styles.input,
                      { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                    ]}
                    placeholder="17:00"
                    placeholderTextColor={palette.text}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Focus hours</Text>
                <TextInput
                  value={focusHours}
                  onChangeText={setFocusHours}
                  keyboardType="numeric"
                  style={[
                    styles.input,
                    { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="3"
                  placeholderTextColor={palette.text}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Priorities</Text>
                <TextInput
                  value={priorities}
                  onChangeText={setPriorities}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="What matters today?"
                  placeholderTextColor={palette.text}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Habits</Text>
                <TextInput
                  value={habits}
                  onChangeText={setHabits}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="Morning habits, rituals, etc."
                  placeholderTextColor={palette.text}
                  multiline
                  numberOfLines={3}
                />
              </View>
              {error ? (
                <Text style={[styles.errorText, { color: palette.accent }]}>{error}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    {
                      borderColor: palette.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonLabel, { color: palette.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleGenerate}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: palette.accent,
                      opacity: loading ? 0.6 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={palette.background} />
                  ) : (
                    <Text style={[styles.buttonLabel, { color: palette.background }]}>Generate plan</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.previewContainer}>
              <Text style={[styles.previewTitle, { color: palette.text }]}>Suggested blocks</Text>
              <ScrollView
                style={styles.previewList}
                contentContainerStyle={styles.previewListContent}
                showsVerticalScrollIndicator={false}
              >
                {hasPreview ? (
                  previewBlocks.map((block, index) => (
                    <View key={`${block.startMin}-${block.title}-${index}`} style={styles.previewItem}>
                      <Text style={[styles.previewTime, { color: palette.text }]}>
                        {formatMinutes(block.startMin)} – {formatMinutes(block.endMin)}
                      </Text>
                      <Text style={[styles.previewTitleRow, { color: palette.text }]}>{block.title}</Text>
                      <Text style={[styles.previewCategory, { color: palette.text }]}>{block.category}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.previewEmptyText, { color: palette.text }]}>
                    {error ?? 'No blocks returned from AI.'}
                  </Text>
                )}
              </ScrollView>
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => setStage('form')}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    {
                      borderColor: palette.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonLabel, { color: palette.text }]}>Back</Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  disabled={!hasPreview}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: palette.accent,
                      opacity: !hasPreview ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonLabel, { color: palette.background }]}>Apply to my plan</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  formContent: {},
  field: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldHalf: {
    flex: 1,
    marginRight: 8,
  },
  fieldHalfLast: {
    marginRight: 0,
  },
  fieldLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
  },
  previewContainer: {
    marginTop: 8,
  },
  previewList: {
    maxHeight: 240,
    marginTop: 12,
  },
  previewListContent: {
    paddingBottom: 8,
  },
  previewItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    marginBottom: 10,
  },
  previewTime: {
    fontSize: 12,
    marginBottom: 2,
    opacity: 0.8,
  },
  previewTitleRow: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 6,
  },
  previewCategory: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewEmptyText: {
    padding: 16,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.75,
  },
});

export default AiPlanModal;
