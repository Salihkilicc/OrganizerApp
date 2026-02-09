import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiLimitOverlay } from '@/components/AiLimitOverlay';
import { CopyDayModal } from '@/components/CopyDayModal';
import { DayStrip } from '@/components/DayStrip';
import { FocusModeOverlay } from '@/components/FocusModeOverlay';
import { HourColumn } from '@/components/HourColumn';
import { PlanEditor } from '@/components/PlanEditor';
import { PlanGrid } from '@/components/PlanGrid';
import { AiPlanModal } from '@/features/ai-planner';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useI18n } from '@/i18n/useI18n';
import { AiPlanBlock } from '@/lib/aiPlan';
import { addAiCredit, checkAiLimit } from '@/lib/aiUsage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import type { SupportedLanguage } from '@/store/useLanguage';
import {
  isAfterToday,
  isBeforeToday,
  isToday as isDateToday,
  todayDate,
  usePlans,
  type PlanBlock,
  type PlanCategory,
} from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { usePremium } from '@/store/usePremium';
import { useTheme } from '@/store/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const HOURS_PER_DAY = 24;
const GRID_START = 0;
const GRID_END = HOURS_PER_DAY;
const STEP = 30;
const MIN_BLOCK = 60;
const TAP_BLOCK_DURATION = 30;
const PX_PER_MIN = 1;
const HOUR_COPIES = 1;
const DAY_MINUTES = HOURS_PER_DAY * 60;
const DAY_HEIGHT = DAY_MINUTES * PX_PER_MIN;
const AI_PLAN_CATEGORIES: AiPlanBlock['category'][] = ['focus', 'study', 'work', 'gym', 'other'];
const LANGUAGE_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-BR',
  ru: 'ru-RU',
  ar: 'ar',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  hi: 'hi-IN',
  nl: 'nl-NL',
  sv: 'sv-SE',
  pl: 'pl-PL',
};

const getLocaleForLanguage = (lang: SupportedLanguage) => LANGUAGE_LOCALE[lang] ?? lang;

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
};

export default function PlanScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { t, lang } = useI18n();
  const locale = useMemo(() => getLocaleForLanguage(lang), [lang]);
  const today = todayDate();
  const [selectedDate, setSelectedDateState] = useState(() => {
    const initial = toISO(new Date());
    return initial < today ? today : initial;
  });
  const handleSelectDate = useCallback(
    (value: string) => {
      const next = value < today ? today : value;
      setSelectedDateState(next);
    },
    [today],
  );
  const [aiVisible, setAiVisible] = useState(false);
  const [aiDate, setAiDate] = useState(selectedDate);
  const [showLimitOverlay, setShowLimitOverlay] = useState(false);
  const [limitOverlayReason, setLimitOverlayReason] = useState<'limit_reached' | 'guest'>('limit_reached');
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  const { loaded: adLoaded, loading: adLoading, loadAd, showAd } = useRewardedAd();

  // Load ad on mount
  useEffect(() => {
    loadAd();
  }, [loadAd]);

  // Handle ad reward
  const [adRewardPending, setAdRewardPending] = useState(false);

  const handleAdReward = useCallback(async () => {
    if (!adRewardPending) return;

    console.log('[PlanScreen] Processing ad reward...');
    try {
      const success = await addAiCredit(supabase);
      if (success) {
        console.log('[PlanScreen] AI credit granted after ad');
        setShowLimitOverlay(false);
        setAiVisible(true);
      } else {
        console.warn('[PlanScreen] Failed to grant AI credit');
        Alert.alert('Error', 'Failed to grant reward. Please try again.');
        setShowLimitOverlay(false);
      }
    } catch (error) {
      console.error('[PlanScreen] Error granting credit:', error);
      Alert.alert('Error', 'Failed to grant reward. Please try again.');
      setShowLimitOverlay(false);
    } finally {
      setAdRewardPending(false);
      // Reload ad for next time
      loadAd();
    }
  }, [adRewardPending, loadAd]);

  useEffect(() => {
    handleAdReward();
  }, [handleAdReward]);
  const loadPlans = usePlans((state) => state.load);
  const addPlan = usePlans((state) => state.add);
  const addMany = usePlans((state) => state.addMany);
  const updatePlan = usePlans((state) => state.update);
  const removePlan = usePlans((state) => state.remove);
  const copyDayToDates = usePlans((state) => state.copyDayToDates);
  const clearPlansByDate = usePlans((state) => state.clearByDate);
  const blocks = usePlans((state) => state.blocks);
  const pruneBeforeToday = usePlans((state) => state.pruneBeforeToday);
  const isPremium = usePremium((state) => state.isPremium);
  const isPast = isBeforeToday(selectedDate);
  const isToday = isDateToday(selectedDate);
  const isFuture = isAfterToday(selectedDate);
  const isEditableDay = isToday || isFuture;
  const totalPoints = usePoints((state) => state.total);
  const isGuest = useAuth((state) => state.isGuest);
  const dailyBlocks = useMemo(
    () => blocks.filter((block) => block.date === selectedDate),
    [blocks, selectedDate],
  );

  const previousAiPlanBlocks = useMemo<AiPlanBlock[]>(() => {
    return dailyBlocks
      .filter((block) => block.aiGenerated)
      .map((block) => {
        const normalizedCategory = AI_PLAN_CATEGORIES.includes(
          block.category as AiPlanBlock['category'],
        )
          ? (block.category as AiPlanBlock['category'])
          : 'other';
        return {
          title: block.title,
          note: block.note ?? undefined,
          startMin: block.startMin,
          endMin: block.endMin,
          category: normalizedCategory,
        };
      });
  }, [dailyBlocks]);

  const blocksForDay = dailyBlocks;
  const blockCount = blocksForDay.length;
  const totalMinutes = blocksForDay.reduce(
    (sum, b) => sum + Math.max(b.endMin - b.startMin, 0),
    0,
  );
  const totalHours = totalMinutes / 60;
  const summaryMessage =
    blockCount > 0
      ? t((d) => d.plan.summary.withPlans, {
        total: blockCount,
        plural: blockCount === 1 ? '' : 's',
        hours: totalHours.toFixed(1),
      })
      : t((d) => d.plan.summary.noPlans);

  const hasManualBlocks = dailyBlocks.some((block) => !block.aiGenerated);
  const selectedDateInstance = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const selectedMonthIndex = selectedDateInstance.getMonth();
  const selectedYear = selectedDateInstance.getFullYear();
  const selectedDateLabel = useMemo(() => {
    const dayName = selectedDateInstance.toLocaleDateString(locale, { weekday: 'long' });
    const monthName = selectedDateInstance.toLocaleDateString(locale, { month: 'long' });
    const dayNumber = selectedDateInstance.getDate();
    return `${dayName} ${dayNumber} ${monthName}`;
  }, [locale, selectedDateInstance]);
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
        label: optionDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        year: optionDate.getFullYear(),
        month: optionDate.getMonth(),
      };
    }).filter((option) => !(option.year === 2025 && option.month === 9));
  }, [locale]);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorInitial, setEditorInitial] = useState<Partial<PlanBlock> | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusVisible, setFocusVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [copyModalVisible, setCopyModalVisible] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    pruneBeforeToday?.();
  }, [pruneBeforeToday, today]);

  useEffect(() => {
    if (selectedDate < today) {
      setSelectedDateState(today);
    }
  }, [selectedDate, today]);

  useEffect(() => {
    setEditorVisible(false);
    setEditingId(null);
    setEditorInitial(undefined);
  }, [selectedDate]);

  useEffect(() => {
    if (!aiVisible) {
      setAiDate(selectedDate);
    }
  }, [aiVisible, selectedDate]);

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
        Alert.alert(t((d) => d.plan.pastPlansAlert));
        return;
      }
      setEditorInitial(current);
      setEditingId(id);
      setEditorVisible(true);
    },
    [blocks, t],
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
      handleSelectDate(toISO(nextDate));
      setMonthPickerVisible(false);
    },
    [selectedDateInstance, handleSelectDate],
  );

  const openFocusMode = useCallback(() => setFocusVisible(true), []);
  const closeFocusMode = useCallback(() => setFocusVisible(false), []);

  const handleSave = useCallback(
    async (values: EditorValues) => {
      const existing = editingId ? blocks.find((b) => b.id === editingId) : null;
      if (editingId) {
        await updatePlan(editingId, { ...values, done: existing?.done ?? false });
      } else {
        await addPlan({ ...values, date: selectedDate, done: false });
      }
      closeEditor();
    },
    [addPlan, blocks, closeEditor, editingId, selectedDate, updatePlan],
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

  const handleOverlayClose = useCallback(() => setShowLimitOverlay(false), []);

  const handleWatchAd = useCallback(async () => {
    console.log('[PlanScreen] Watch ad pressed, adLoaded:', adLoaded, 'adLoading:', adLoading);

    if (!adLoaded) {
      if (!adLoading) {
        console.log('[PlanScreen] Ad not loaded, loading now...');
        loadAd();
      }
      Alert.alert(t((d) => d.common.loading), 'Please wait, loading ad...');
      return;
    }

    // Close overlay first
    setShowLimitOverlay(false);

    // Show ad
    console.log('[PlanScreen] Showing ad...');
    const rewarded = await showAd();

    if (rewarded) {
      // Set pending and trigger reward handling
      setAdRewardPending(true);
    } else {
      console.warn('[PlanScreen] Ad not completed');
      // Show overlay again
      setShowLimitOverlay(true);
    }
  }, [adLoaded, adLoading, loadAd, showAd, t]);

  const handleGoPremium = useCallback(() => {
    setShowLimitOverlay(false);
    router.push('/paywall');
  }, [router]);

  const handleAiPlanPress = useCallback(async () => {
    if (isPremium) {
      setAiDate(selectedDate);
      setAiVisible(true);
      return;
    }

    if (isGuest) {
      setLimitOverlayReason('guest');
      setShowLimitOverlay(true);
      return;
    }

    if (isCheckingLimit) return;
    setIsCheckingLimit(true);
    try {
      const result = await checkAiLimit(supabase, false);
      if (result.allowed) {
        setAiDate(selectedDate);
        setAiVisible(true);
      } else {
        setLimitOverlayReason('limit_reached');
        setShowLimitOverlay(true);
      }
    } catch (err) {
      console.warn('Failed to check AI limit', err);
      // Fallback behavior on error: allow open (modal will re-check)
      setAiDate(selectedDate);
      setAiVisible(true);
    } finally {
      setIsCheckingLimit(false);
    }
  }, [isPremium, isGuest, isCheckingLimit, selectedDate]);

  // Reset when modal closes
  const handleAiModalClose = useCallback(() => {
    setAiVisible(false);
  }, []);

  const handleOpenCopyModal = useCallback(() => {
    if (blockCount === 0) return;
    setCopyModalVisible(true);
  }, [blockCount]);

  const handleCloseCopyModal = useCallback(() => setCopyModalVisible(false), []);

  const handleConfirmCopyModal = useCallback(
    (targetDates: string[]) => {
      if (!targetDates.length) return;
      const occupied = targetDates.some((targetDate) =>
        blocks.some((block) => block.date === targetDate),
      );
      if (occupied) {
        Alert.alert(
          t((d) => d.plan.copyConflictTitle),
          t((d) => d.plan.copyConflictMessage),
        );
        return;
      }
      copyDayToDates(selectedDate, targetDates);
    },
    [blocks, copyDayToDates, selectedDate, t],
  );

  const handleClearDayPlans = useCallback(() => {
    if (blockCount === 0) return;
    Alert.alert(t((d) => d.plan.deleteAllConfirmTitle), t((d) => d.plan.deleteAllConfirmMessage), [
      { text: t((d) => d.plan.deleteAllConfirmNo), style: 'cancel' },
      {
        text: t((d) => d.plan.deleteAllConfirmYes),
        style: 'destructive',
        onPress: () => {
          clearPlansByDate(selectedDate);
        },
      },
    ]);
  }, [blockCount, clearPlansByDate, selectedDate, t]);

  const handleAiApply = useCallback(
    async (blocks: PlanBlock[]) => {
      try {
        clearPlansByDate(aiDate);
        await addMany(blocks);
      } catch (error) {
        console.error('[PlanScreen] Failed to add AI plan blocks', error);
      } finally {
        setAiVisible(false);
      }
    },
    [addMany, setAiVisible],
  );

  /* replaced by handleAiModalClose */

  const handleMove = useCallback(
    (id: string, newStartMin: number, newEndMin: number) => {
      updatePlan(id, { startMin: newStartMin, endMin: newEndMin });
    },
    [updatePlan],
  );

  const handleCheck = useCallback(
    (id: string) => {
      const block = blocks.find((b) => b.id === id);
      if (block) {
        updatePlan(id, { done: !block.done });
      }
    },
    [blocks, updatePlan],
  );

  const scrollRef = useRef<ScrollView>(null);
  /* Increase to approx 120 mins extra space */
  const contentHeight = DAY_HEIGHT + 120 * PX_PER_MIN;

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
                  opacity: pressed ? 0.65 : 1,
                },
              ]}>
              <Text style={[styles.monthLabel, { color: palette.text }]}>
                {t((d) => d.plan.monthsLabel)}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={palette.text}
                style={styles.monthIcon}
              />
            </Pressable>
            <Text
              style={[styles.selectedDate, { color: palette.text }]}
              numberOfLines={2}
              ellipsizeMode="tail">
              {selectedDateLabel}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleAiPlanPress}
              style={({ pressed }) => [
                styles.aiButton,
                {
                  backgroundColor: palette.accent,
                  opacity: pressed ? 0.85 : 1,
                  borderColor: palette.border,
                  shadowColor: palette.accent,
                },
              ]}>
              <View style={styles.aiButtonContent}>
                <Ionicons name="sparkles" size={16} color={palette.background} />
                <Text style={[styles.aiButtonText, { color: palette.background }]}>
                  {t((d) => d.plan.aiButton)}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
        <DayStrip
          selected={selectedDate}
          year={selectedYear}
          month={selectedMonthIndex}
          onSelect={handleSelectDate}
          minDate={today}
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
              <Text style={[styles.monthModalTitle, { color: palette.text }]}>
                {t((d) => d.plan.selectMonth)}
              </Text>
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
        <View
          style={[
            styles.summaryRow,
            { borderColor: palette.border, backgroundColor: palette.card },
          ]}
        >
          <Text style={[styles.summaryText, { color: palette.text }]}>{summaryMessage}</Text>
          <View style={styles.summaryActions}>
            <Pressable
              onPress={handleOpenCopyModal}
              disabled={blockCount === 0}
              hitSlop={8}
              style={({ pressed }) => [
                styles.summaryIconWrapper,
                {
                  opacity: blockCount === 0 ? 0.4 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.summaryIconContent}>
                <Ionicons name="copy-outline" size={20} color={palette.accent} />
                <Text style={[styles.summaryIconLabel, { color: palette.text }]}>Copy days</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={handleClearDayPlans}
              disabled={blockCount === 0}
              hitSlop={8}
              style={({ pressed }) => [
                styles.summaryIconWrapper,
                {
                  opacity: blockCount === 0 ? 0.4 : pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={styles.summaryIconContent}>
                <Ionicons name="trash-outline" size={20} color={palette.text} />
                <Text style={[styles.summaryIconLabel, { color: palette.text }]}>Delete plans</Text>
              </View>
            </Pressable>
          </View>
        </View>
        <View style={styles.gridRow}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { height: contentHeight }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.innerRow}>
              <HourColumn startHour={GRID_START} endHour={GRID_END} pxPerMin={PX_PER_MIN} />
              <View style={styles.gridArea}>
                <PlanGrid
                  date={selectedDate}
                  blocks={dailyBlocks}
                  onMove={handleMove}
                  onEdit={openEditEditor}
                  onCheck={handleCheck}
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
        <AiPlanModal
          visible={aiVisible}
          date={aiDate}
          onClose={handleAiModalClose}
          onApply={handleAiApply}
          hasExistingBlocks={hasManualBlocks}
          previousBlocks={previousAiPlanBlocks}
        />
        <CopyDayModal
          visible={copyModalVisible}
          sourceDate={selectedDate}
          onClose={handleCloseCopyModal}
          onConfirm={handleConfirmCopyModal}
        />
        {!isPast && (
          <Pressable
            onPress={openAddEditor}
            style={({ pressed }) => [
              styles.fab,
              {
                backgroundColor: palette.card,
                opacity: pressed ? 0.8 : 1,
                shadowColor: palette.border,
              },
            ]}>
            <Ionicons name="add-circle" size={48} color={palette.tint} />
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
      <AiLimitOverlay
        visible={showLimitOverlay}
        onClose={handleOverlayClose}
        onWatchAd={handleWatchAd}
        onGoPremium={handleGoPremium}
      />
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
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 0,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginLeft: 12,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  monthIcon: {
    marginLeft: 6,
  },
  selectedDate: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginLeft: 12,
    flexShrink: 1,
    lineHeight: 22,
  },
  headerActions: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  aiButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
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
    paddingBottom: 100,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryText: {
    fontSize: 14,
    flex: 1,
  },
  summaryIconWrapper: {
    marginLeft: 10,
    padding: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContent: {
    alignItems: 'center',
  },
  summaryIconLabel: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  fabText: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 32,
  },
});
