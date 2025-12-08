import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanBlock } from '@/store/usePlans';
import { AiPlanBlock, AiPlanRequest, generatePlanFromAI } from '@/lib/aiPlan';
import { checkAiLimit, type AiLimitResult } from '@/lib/aiUsage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { usePremium } from '@/store/usePremium';
import { usePlans } from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';
import LoadingOverlay from '@/components/LoadingOverlay';

type AiPlanModalProps = {
  visible: boolean;
  date: string;
  onClose: () => void;
  onApply: (blocks: PlanBlock[]) => void;
  hasExistingBlocks?: boolean;
  previousBlocks?: AiPlanBlock[];
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

const serializePlanBlocks = (blocks: AiPlanBlock[]) =>
  JSON.stringify(
    blocks.map((block) => ({
      title: block.title,
      note: block.note ?? undefined,
      start: formatMinutes(block.startMin),
      end: formatMinutes(block.endMin),
      category: block.category,
    })),
  );

const DEFAULT_WORK_START = '09:00';
const DEFAULT_WORK_END = '17:00';

const parseTimeString = (value: string) => {
  const normalized = value.trim();
  const parts = normalized.split(':');
  if (parts.length !== 2) return undefined;
  const [hoursPart, minutesPart] = parts;
  if (hoursPart.trim() === '' || minutesPart.trim() === '') return undefined;
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return undefined;
  }
  return hours * 60 + minutes;
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
  aiGenerated: true,
  done: false,
  rewarded: false,
});

export function AiPlanModal({
  visible,
  date,
  onClose,
  onApply,
  hasExistingBlocks,
  previousBlocks,
}: AiPlanModalProps) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const user = useAuth((state) => state.user);
  const status = useAuth((state) => state.status);
  const isGuest = useAuth((state) => state.isGuest);
  const isPremium = usePremium((state) => state.isPremium);
  const isAuthenticatedUser = status === 'authenticated' && !!user && !isGuest;
  const isGuestUser = !isAuthenticatedUser;
  const placeholderColor = `${palette.text}88`;
  const inputTextColor = `${palette.text}dd`;
  const sanitizeTimeInput = (value: string) => {
    const filtered = value.replace(/[^0-9:]/g, '');
    const colonIndex = filtered.indexOf(':');
    if (colonIndex === -1) {
      return filtered.slice(0, 4);
    }
    const before = filtered.slice(0, colonIndex).slice(0, 2);
    const after = filtered.slice(colonIndex + 1).replace(/:/g, '').slice(0, 2);
    return `${before}:${after}`;
  };
  const lastAiPlanString = usePlans((state) => state.lastAiPlanString ?? undefined);
  const setLastAiPlanString = usePlans((state) => state.setLastAiPlanString);
  const [wakeTime, setWakeTime] = useState('07:30');
  const [sleepTime, setSleepTime] = useState('23:30');
  const [workStart, setWorkStart] = useState(DEFAULT_WORK_START);
  const [workEnd, setWorkEnd] = useState(DEFAULT_WORK_END);
  const [works, setWorks] = useState(() => Boolean(DEFAULT_WORK_START && DEFAULT_WORK_END));
  const [priorities, setPriorities] = useState('');
  const [habits, setHabits] = useState('');
  const [previewBlocks, setPreviewBlocks] = useState<AiPlanBlock[]>([]);
  const [stage, setStage] = useState<'form' | 'preview'>('form');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [aiLimitRemaining, setAiLimitRemaining] = useState<AiLimitResult['remaining'] | null>(null);
  const [aiLimitAllowed, setAiLimitAllowed] = useState(true);
  const [aiLimitReason, setAiLimitReason] = useState<AiLimitResult['reason']>();
  const [aiLimitLoading, setAiLimitLoading] = useState(false);

  const workStartMinutes = works ? parseTimeString(workStart) : undefined;
  const workEndMinutes = works ? parseTimeString(workEnd) : undefined;
  let workValidationError: string | null = null;
  if (works) {
    if (workStartMinutes === undefined || workEndMinutes === undefined) {
      workValidationError = t((d) => d.aiPlanner.workInvalid);
    } else if (workEndMinutes <= workStartMinutes) {
      workValidationError = t((d) => d.aiPlanner.workEndBeforeStart);
    }
  }
  const isLoading = isGenerating || isRegenerating;
  const aiBlocked = isGuestUser || !aiLimitAllowed;
  const generateDisabled = isLoading || aiBlocked || aiLimitLoading || (works && Boolean(workValidationError));
  const regenerateDisabled = isLoading || aiBlocked || aiLimitLoading;

  const dateLabel = useMemo(() => formatDateLabel(date), [date]);
  const previewList = previewBlocks ?? [];
  const hasPreview = previewList.length > 0;
  const helperTexts = useMemo(
    () => ({
      priorities: t((d) => d.aiPlanner.prioritiesHelper),
      habits: t((d) => d.aiPlanner.habitsHelper),
      feedbackExamples: t((d) => d.aiPlanner.feedbackExamples),
    }),
    [t],
  );

  const updateLimitState = useCallback(
    (result: AiLimitResult) => {
      setAiLimitAllowed(result.allowed);
      setAiLimitRemaining(result.remaining ?? null);
      setAiLimitReason(result.reason);
    },
    [],
  );

  const refreshAiLimit = useCallback(async () => {
    if (!visible) {
      return;
    }
    if (isGuestUser) {
      updateLimitState({ allowed: false, reason: 'guest' });
      return;
    }
    if (isPremium) {
      updateLimitState({ allowed: true, remaining: '∞' });
      return;
    }
    setAiLimitLoading(true);
    try {
      const result = await checkAiLimit(supabase, isPremium);
      updateLimitState(result);
    } catch (refreshError) {
      console.warn('[AiPlanModal] Failed to refresh AI limit', refreshError);
      updateLimitState({ allowed: false, reason: 'error' });
    } finally {
      setAiLimitLoading(false);
    }
  }, [isGuestUser, isPremium, updateLimitState, visible]);

  useEffect(() => {
    void refreshAiLimit();
  }, [refreshAiLimit]);

  const ensureAiAllowed = useCallback(async () => {
    try {
      const result = await checkAiLimit(supabase, isPremium);
      updateLimitState(result);
      if (!result.allowed) {
        const message =
          result.reason === 'limit_reached'
            ? 'You have reached your 30 AI generations for this month.'
            : result.reason === 'guest'
              ? 'Please log in to use AI Planner.'
              : 'Unable to verify AI usage. Please try again.';
        Alert.alert('AI limit', message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[AiPlanModal] checkAiLimit failed', err);
      Alert.alert('AI limit', 'Unable to verify AI usage. Please try again.');
      return false;
    }
  }, [isPremium, updateLimitState]);

  const incrementUsage = useCallback(async () => {
    const { error: incrementError } = await supabase.rpc('increment_ai_usage');
    if (incrementError) {
      console.warn('[AiPlanModal] Failed to increment AI usage', incrementError);
      return;
    }
    if (!isPremium) {
      setAiLimitRemaining((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
      void refreshAiLimit();
    }
  }, [isPremium, refreshAiLimit]);

  const parseDurationFromText = useCallback((text: string): number | null => {
    const hoursMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:saat|hour|hr|h)\b/);
    if (hoursMatch) {
      const value = Number(hoursMatch[1].replace(',', '.'));
      if (Number.isFinite(value)) return Math.round(value * 60);
    }
    const minsMatch = text.match(/(\d+)\s*(?:dk|dakika|min|mins|minute|minutes)\b/);
    if (minsMatch) {
      const value = Number(minsMatch[1]);
      if (Number.isFinite(value)) return value;
    }
    return null;
  }, []);

  const formatListInput = useCallback((value: string) => {
    const parts = value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length <= 1) return value.trim();
    return parts.map((item) => `- ${item}`).join('\n');
  }, []);

  const adjustBlocksWithFeedback = useCallback(
    (blocks: AiPlanBlock[]) => {
      const text = feedback.trim().toLowerCase();
      if (!text) return blocks;

      const isExtend = /uzat|extend|longer|increase/.test(text);
      const isShorten = /kısalt|kisalt|shorten|shorter|reduce/.test(text);
      if (!isExtend && !isShorten) return blocks;

      const parsedMinutes = parseDurationFromText(text);
      const deltaMinutes = parsedMinutes ?? (isExtend ? 30 : 15);
      const delta = isExtend ? deltaMinutes : -deltaMinutes;

      return blocks.map((block) => {
        const duration = Math.max(1, block.endMin - block.startMin);
        const nextDuration = Math.max(1, duration + delta);
        let startMin = block.startMin;
        let endMin = startMin + nextDuration;
        if (endMin > 1439) {
          endMin = 1439;
          startMin = Math.max(0, endMin - nextDuration);
        }
        return { ...block, startMin, endMin };
      });
    },
    [feedback, parseDurationFromText],
  );

  const enforceWorkWindow = useCallback(
    (blocks: AiPlanBlock[]) => {
      if (!works || workStartMinutes === undefined || workEndMinutes === undefined) return blocks;
      const workTitle = t((d) => d.plan.categories.work);
      const start = workStartMinutes;
      const end = workEndMinutes;

      const nonWorkBlocks = blocks.filter((block) => block.category !== 'work');
      const overlapping: AiPlanBlock[] = [];
      const nonOverlapping: AiPlanBlock[] = [];

      nonWorkBlocks.forEach((block) => {
        const overlaps = block.startMin < end && block.endMin > start;
        if (overlaps) {
          overlapping.push(block);
        } else {
          nonOverlapping.push(block);
        }
      });

      const latestExistingEnd = nonOverlapping.reduce((max, block) => Math.max(max, block.endMin), end);

      let cursor = Math.max(end, latestExistingEnd);
      const rescheduled = overlapping
        .sort((a, b) => a.startMin - b.startMin)
        .map((block) => {
          const duration = Math.max(1, block.endMin - block.startMin);
          const startMin = cursor;
          const endMin = startMin + duration;
          cursor = endMin;
          return { ...block, startMin, endMin };
        });

      const workBlock: AiPlanBlock = {
        title: workTitle,
        note: undefined,
        startMin: start,
        endMin: end,
        category: 'work',
      };

      return [...nonOverlapping, workBlock, ...rescheduled].sort((a, b) => a.startMin - b.startMin);
    },
    [t, workEndMinutes, workStartMinutes, works],
  );
  const getPreviousPlanString = useCallback(() => {
    if (lastAiPlanString?.trim()) return lastAiPlanString.trim();
    if (previewBlocks.length) return serializePlanBlocks(previewBlocks);
    if (previousBlocks && previousBlocks.length) return serializePlanBlocks(previousBlocks);
    return undefined;
  }, [lastAiPlanString, previewBlocks, previousBlocks]);

  const resetState = useCallback(() => {
    setStage('form');
    setPreviewBlocks([]);
    setIsGenerating(false);
    setIsRegenerating(false);
    setError(null);
    setFeedback('');
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
    }
  }, [resetState, visible]);

  const buildRequestPayload = useCallback(
    (options?: { includePreviousPlanString?: boolean }): AiPlanRequest => {
      const normalizedFeedback = feedback.trim();
      const normalizedPriorities = formatListInput(priorities);
      const normalizedHabits = formatListInput(habits);
      const hasWorkWindow = works && workStart.trim() && workEnd.trim();
      return {
        date,
        wakeTime: wakeTime.trim(),
        sleepTime: sleepTime.trim(),
        workStart: hasWorkWindow ? workStart.trim() : undefined,
        workEnd: hasWorkWindow ? workEnd.trim() : undefined,
        priorities: normalizedPriorities || undefined,
        habits: normalizedHabits || undefined,
        feedback: normalizedFeedback || undefined,
        previousBlocks: previousBlocks && previousBlocks.length > 0 ? previousBlocks : undefined,
        previousPlanString: options?.includePreviousPlanString ? getPreviousPlanString() : undefined,
      };
    },
    [
      date,
      feedback,
      habits,
      priorities,
      wakeTime,
      sleepTime,
      workEnd,
      workStart,
      works,
      previousBlocks,
      getPreviousPlanString,
      formatListInput,
    ],
  );

  const handleGenerate = useCallback(async () => {
    if (works && workValidationError) {
      return;
    }
    if (hasExistingBlocks) {
      setError(t((d) => d.aiPlanner.existingBlocksError));
      return;
    }
    if (isGuestUser) {
      Alert.alert('AI Planner', 'Please log in to use AI Planner.');
      return;
    }
    const allowed = await ensureAiAllowed();
    if (!allowed) {
      return;
    }
    setIsGenerating(true);
    try {
      const payload = buildRequestPayload();
      console.log('[AiPlanModal] Request payload', payload);
      const { blocks } = await generatePlanFromAI(payload);
      console.log('[AiPlanModal] Received blocks', blocks);
      const blocksArray = Array.isArray(blocks) ? blocks : [];
      const feedbackAdjusted = adjustBlocksWithFeedback(blocksArray);
      const workAdjusted = enforceWorkWindow(feedbackAdjusted);
      setLastAiPlanString(serializePlanBlocks(workAdjusted));
      setPreviewBlocks(workAdjusted);
      if (workAdjusted.length === 0) {
        setError(t((d) => d.aiPlanner.noBlocks));
      } else {
        setError(null);
      }
      setStage('preview');
      await incrementUsage();
    } catch (err) {
      console.error('[AiPlanModal] Error generating plan', err);
      setPreviewBlocks([]);
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  }, [
    adjustBlocksWithFeedback,
    buildRequestPayload,
    enforceWorkWindow,
    hasExistingBlocks,
    incrementUsage,
    isGuestUser,
    ensureAiAllowed,
    setLastAiPlanString,
    t,
    workValidationError,
    works,
  ]);

  const handleRegenerate = useCallback(async () => {
    if (!date) return;
    if (isGuestUser) {
      Alert.alert('AI Planner', 'Please log in to use AI Planner.');
      return;
    }
    const allowed = await ensureAiAllowed();
    if (!allowed) {
      return;
    }
    setIsRegenerating(true);
    try {
      const payload = buildRequestPayload({ includePreviousPlanString: true });
      console.log('[AiPlanModal] Request payload (regenerate)', payload);
      const { blocks } = await generatePlanFromAI(payload);
      console.log('[AiPlanModal] Received blocks (regenerate)', blocks);
      const blocksArray = Array.isArray(blocks) ? blocks : [];
      const feedbackAdjusted = adjustBlocksWithFeedback(blocksArray);
      const workAdjusted = enforceWorkWindow(feedbackAdjusted);
      await incrementUsage();
      if (workAdjusted.length === 0) {
        setError(t((d) => d.aiPlanner.noBetterPlan));
        setPreviewBlocks([]);
        return;
      }
      setError(null);
      setLastAiPlanString(serializePlanBlocks(workAdjusted));
      setPreviewBlocks(workAdjusted);
    } catch (err) {
      console.error('[AiPlanModal] Error regenerating plan', err);
      setPreviewBlocks([]);
      setError(String(err));
    } finally {
      setIsRegenerating(false);
    }
  }, [
    adjustBlocksWithFeedback,
    buildRequestPayload,
    date,
    enforceWorkWindow,
    incrementUsage,
    isGuestUser,
    ensureAiAllowed,
    setLastAiPlanString,
    t,
  ]);

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

  const isLimitReached = aiLimitReason === 'limit_reached';
  const aiUsageText = isGuestUser
    ? 'Please log in to use AI Planner'
    : isPremium
      ? 'Unlimited AI generation'
      : `Remaining: ${aiLimitRemaining ?? (aiLimitLoading ? '…' : '0')} / 30`;
  const aiUsageColor = isLimitReached || isGuestUser ? palette.accent : palette.text;
  const showLimitSpinner = aiLimitLoading && !isPremium && !isGuestUser;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 24}
        style={styles.flex}>
        <LoadingOverlay
          visible={isLoading}
          label="Generating your plan…"
        />
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                shadowColor: palette.text,
                paddingBottom: 16 + insets.bottom,
              },
            ]}>
          <Text style={[styles.title, { color: palette.text }]}>{t((d) => d.aiPlanner.title)}</Text>
          <Text style={[styles.subTitle, { color: palette.text }]}>{dateLabel}</Text>

          {stage === 'form' ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.formContent,
                { paddingBottom: 18 + insets.bottom },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.wakeTime)}
                </Text>
                <TextInput
                  value={wakeTime}
                  onChangeText={(value) => setWakeTime(sanitizeTimeInput(value))}
                  style={[
                    styles.input,
                    { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                  ]}
                  placeholder="07:30"
                  placeholderTextColor={placeholderColor}
                  maxLength={5}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.sleepTime)}
                </Text>
                <TextInput
                  value={sleepTime}
                  onChangeText={(value) => setSleepTime(sanitizeTimeInput(value))}
                  style={[
                    styles.input,
                    { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                  ]}
                  placeholder="23:30"
                  placeholderTextColor={placeholderColor}
                  maxLength={5}
                />
              </View>
              <View style={styles.field}>
                <View style={styles.workToggleRow}>
                  <Text style={[styles.fieldLabel, { color: palette.text }]}>
                    {t((d) => d.aiPlanner.workToggle)}
                  </Text>
                  <Switch
                    value={works}
                    onValueChange={setWorks}
                    trackColor={{ true: palette.accent, false: palette.border }}
                    thumbColor={palette.background}
                  />
                </View>
                {works && (
                  <>
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldHalf}>
                        <Text style={[styles.fieldLabel, { color: palette.text }]}>
                          {t((d) => d.aiPlanner.workStart)}
                        </Text>
                        <TextInput
                          value={workStart}
                          onChangeText={(value) => setWorkStart(sanitizeTimeInput(value))}
                          style={[
                            styles.input,
                            { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                          ]}
                          placeholder="09:00"
                          placeholderTextColor={placeholderColor}
                          maxLength={5}
                        />
                      </View>
                      <View style={[styles.fieldHalf, styles.fieldHalfLast]}>
                        <Text style={[styles.fieldLabel, { color: palette.text }]}>
                          {t((d) => d.aiPlanner.workEnd)}
                        </Text>
                        <TextInput
                          value={workEnd}
                          onChangeText={(value) => setWorkEnd(sanitizeTimeInput(value))}
                          style={[
                            styles.input,
                            { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                          ]}
                          placeholder="17:00"
                          placeholderTextColor={placeholderColor}
                          maxLength={5}
                        />
                      </View>
                    </View>
                    {workValidationError ? (
                      <Text style={[styles.errorText, { color: palette.accent }]}>
                        {workValidationError}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.priorities)}
                </Text>
                <TextInput
                  value={priorities}
                  onChangeText={setPriorities}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                  ]}
                  placeholder={t((d) => d.aiPlanner.prioritiesPlaceholder)}
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.helperText, { color: palette.text }]}>
                  {helperTexts.priorities}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.habits)}
                </Text>
                <TextInput
                  value={habits}
                  onChangeText={setHabits}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                  ]}
                  placeholder={t((d) => d.aiPlanner.habitsPlaceholder)}
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.helperText, { color: palette.text }]}>
                  {helperTexts.habits}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.notes)}
                </Text>
                <TextInput
                  value={feedback}
                  onChangeText={setFeedback}
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: palette.background, borderColor: palette.border, color: inputTextColor },
                  ]}
                  placeholder={t((d) => d.aiPlanner.notesPlaceholder)}
                  placeholderTextColor={placeholderColor}
                  multiline
                  numberOfLines={3}
                />
                <Text style={[styles.helperText, { color: palette.text }]}>
                  {helperTexts.feedbackExamples}
                </Text>
              </View>
              <View style={styles.limitRow}>
                {showLimitSpinner ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                <Text style={[styles.limitText, { color: aiUsageColor }]}>
                  {aiUsageText}
                </Text>
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
                  <Text style={[styles.buttonLabel, { color: palette.text }]}>
                    {t((d) => d.common.cancel)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleGenerate}
                  disabled={generateDisabled}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: palette.accent,
                      opacity: isGenerating ? 0.6 : generateDisabled ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {isGenerating ? (
                    <ActivityIndicator color={palette.background} />
                  ) : (
                    <Text style={[styles.buttonLabel, { color: palette.background }]}>
                      {t((d) => d.aiPlanner.generate)}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          ) : (
              <View style={styles.previewContainer}>
                <Text style={[styles.previewTitle, { color: palette.text }]}>
                  {t((d) => d.aiPlanner.suggestedBlocks)}
                </Text>
                <View style={styles.limitRow}>
                  {showLimitSpinner ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                  <Text style={[styles.limitText, { color: aiUsageColor }]}>
                    {aiUsageText}
                  </Text>
                </View>
                <ScrollView
                  style={styles.previewList}
                  contentContainerStyle={[
                    styles.previewListContent,
                    { paddingBottom: 18 + insets.bottom },
                  ]}
                  showsVerticalScrollIndicator={false}
              >
                {previewList.length === 0 ? (
                  <Text style={[styles.previewEmptyText, { color: palette.text }]}>
                    {error ?? t((d) => d.aiPlanner.noBlocks)}
                  </Text>
                ) : (
                  previewList.map((block, index) => (
                    <View
                      key={`${block.startMin}-${block.title}-${index}`}
                      style={[
                        styles.previewItem,
                        {
                          borderColor: palette.border,
                          backgroundColor: palette.background,
                          shadowColor: palette.text,
                        },
                      ]}>
                      <Text style={[styles.previewTime, { color: palette.text }]}>
                        {formatMinutes(block.startMin)} – {formatMinutes(block.endMin)}
                      </Text>
                      <Text style={[styles.previewTitleRow, { color: palette.text }]}>{block.title}</Text>
                      <Text style={[styles.previewCategory, { color: palette.text }]}>{block.category}</Text>
                    </View>
                  ))
                )}
                  </ScrollView>
                  {stage === 'preview' && (
                    <View style={styles.feedbackSection}>
                      <Text style={[styles.feedbackLabel, { color: palette.text }]}>
                        {t((d) => d.aiPlanner.feedbackLabel)}
                      </Text>
                        <TextInput
                          style={[
                            styles.feedbackInput,
                            {
                              borderColor: palette.border,
                              color: inputTextColor,
                              backgroundColor: palette.background,
                            },
                          ]}
                        placeholder={t((d) => d.aiPlanner.feedbackPlaceholder)}
                        placeholderTextColor={placeholderColor}
                        multiline
                        value={feedback}
                        onChangeText={setFeedback}
                      />
                      <Pressable
                        onPress={handleRegenerate}
                        disabled={regenerateDisabled}
                        style={({ pressed }) => [
                          styles.feedbackButton,
                          {
                            borderColor: palette.border,
                            backgroundColor: palette.card,
                            opacity: regenerateDisabled ? 0.5 : pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.feedbackButtonText, { color: palette.text }]}>
                          {t((d) => d.aiPlanner.regenerate)}
                        </Text>
                      </Pressable>
                    </View>
                  )}
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
                  <Text style={[styles.buttonLabel, { color: palette.text }]}>
                    {t((d) => d.aiPlanner.back)}
                  </Text>
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
                  <Text style={[styles.buttonLabel, { color: palette.background }]}>
                    {t((d) => d.aiPlanner.apply)}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderRadius: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '90%',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
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
  workToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  helperText: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
  feedbackSection: {
    marginTop: 16,
  },
  feedbackLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  feedbackButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  feedbackButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  limitText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default AiPlanModal;
