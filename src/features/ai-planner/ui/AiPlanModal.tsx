import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
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

import { AiLimitOverlay } from '@/components/AiLimitOverlay';
import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useI18n } from '@/i18n/useI18n';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/store/useTheme';
import { useAiPlanner, type UseAiPlannerProps } from '../hooks/useAiPlanner';

const AppIcon = require('@/assets/images/icon.png');

export type AiPlanModalProps = UseAiPlannerProps;

// --- Helper: Time Display ---
const pad = (n: number | string) => n.toString().padStart(2, '0');
const sanitize = (val: string) => val.replace(/[^0-9]/g, '').slice(0, 2);

// Converts minutes (e.g. 540) to "09:00" or "9:00 AM"
const formatTimeDisplay = (minutes: number, is24Hour: boolean) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mStr = m.toString().padStart(2, '0');

  if (is24Hour) {
    return `${pad(h)}:${mStr}`;
  } else {
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${period}`;
  }
};

const parseTimeParts = (timeStr: string, is24Hour: boolean) => {
  const [hStr, mStr] = (timeStr || '00:00').split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr || '00';

  if (is24Hour) {
    return { hour: pad(h), minute: pad(m), period: null };
  } else {
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return { hour: pad(h), minute: pad(m), period };
  }
};

const formatTimeBack = (h: string, m: string, p: string | null, is24Hour: boolean) => {
  let hour = parseInt(h, 10) || 0;
  if (!is24Hour && p) {
    if (p === 'PM' && hour < 12) hour += 12;
    if (p === 'AM' && hour === 12) hour = 0;
  }
  hour = Math.min(23, Math.max(0, hour));
  return `${pad(hour)}:${pad(m)}`;
};

// --- Helper Component: Time Input Group ---
const TimeInputGroup = ({
  label,
  value,
  onChange,
  is24Hour,
  palette,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  is24Hour: boolean;
  palette: any;
}) => {
  const [parts, setParts] = useState(parseTimeParts(value, is24Hour));

  useEffect(() => {
    setParts(parseTimeParts(value, is24Hour));
  }, [value, is24Hour]);

  const update = (newParts: { hour: string; minute: string; period: string | null }) => {
    setParts(newParts);
    onChange(formatTimeBack(newParts.hour, newParts.minute, newParts.period, is24Hour));
  };

  return (
    <View style={styles.timeGroup}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={[
            styles.timeInput,
            { color: palette.text, borderColor: palette.border, backgroundColor: palette.background },
          ]}
          value={parts.hour}
          onChangeText={(t) => update({ ...parts, hour: sanitize(t) })}
          placeholder="HH"
          placeholderTextColor={`${palette.text}40`}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={[styles.colon, { color: palette.text }]}>:</Text>
        <TextInput
          style={[
            styles.timeInput,
            { color: palette.text, borderColor: palette.border, backgroundColor: palette.background },
          ]}
          value={parts.minute}
          onChangeText={(t) => update({ ...parts, minute: sanitize(t) })}
          placeholder="MM"
          placeholderTextColor={`${palette.text}40`}
          keyboardType="number-pad"
          maxLength={2}
        />
        {!is24Hour && (
          <Pressable
            style={[styles.periodBtn, { borderColor: palette.border, backgroundColor: palette.background }]}
            onPress={() => update({ ...parts, period: parts.period === 'AM' ? 'PM' : 'AM' })}
          >
            <Text style={{ color: palette.accent, fontWeight: 'bold', fontSize: 12 }}>{parts.period}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export function AiPlanModal(props: AiPlanModalProps) {
  const { visible } = props;
  const { palette, themeKey } = useTheme();
  const { t } = useI18n();
  const { is24Hour } = useSettings();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isDark = ['dark', 'ninja', 'midnight', 'neon', 'ocean', 'coffee', 'default'].includes(themeKey);

  // Rewarded ad hook
  const { loaded: adLoaded, loadAd, showAd } = useRewardedAd();

  const {
    // State
    wakeTime,
    setWakeTime,
    sleepTime,
    setSleepTime,
    workStart,
    setWorkStart,
    workEnd,
    setWorkEnd,
    works,
    setWorks,
    priorities,
    setPriorities,
    habits,
    setHabits,
    feedback,
    setFeedback,
    stage,
    setStage,
    error,
    isGenerating,
    isRegenerating,
    aiLimitRemaining,
    aiLimitLoading,

    // Derived
    workValidationError,
    isLoading,
    generateDisabled,
    regenerateDisabled,
    dateLabel,
    previewList,
    hasPreview,
    helperTexts,
    isLimitReached,
    isGuestUser,
    isPremium,
    aiUsageText,
    showLimitSpinner,

    // Methods
    sanitizeTimeInput,
    handleGenerate,
    handleRegenerate,
    handleApply,
    handleClose,
    handleWatchAd,
    formatMinutes,
    showAdOverlay,
    setShowAdOverlay,
  } = useAiPlanner(props);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load ad when modal opens
  useEffect(() => {
    if (visible && !adLoaded) {
      loadAd();
    }
  }, [visible, adLoaded, loadAd]);

  // Animation Logic
  useEffect(() => {
    if (isGenerating || isRegenerating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -15,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isGenerating, isRegenerating]);

  const onGeneratePress = async () => {
    await handleGenerate();
  };

  const onRegeneratePress = async () => {
    await handleRegenerate();
  };

  const onWatchAdPress = async () => {
    setShowAdOverlay(false);
    const rewarded = await showAd();
    if (rewarded) {
      await handleWatchAd();
    } else {
      setShowAdOverlay(true);
    }
  };

  const onGoPremium = () => {
    setShowAdOverlay(false);
    router.push('/premium');
  };

  const onCloseOverlay = () => {
    setShowAdOverlay(false);
  };

  const titleColor = !isDark ? '#5b21b6' : palette.text;
  const subTitleColor = !isDark ? '#007AFF' : palette.text;
  const contentColor = !isDark ? '#000000' : palette.text;
  const derivedAiUsageColor = isLimitReached || isGuestUser ? palette.accent : subTitleColor;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <AiLimitOverlay
        visible={showAdOverlay}
        onWatchAd={onWatchAdPress}
        onGoPremium={onGoPremium}
        onClose={onCloseOverlay}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 24}
        style={styles.flex}
      >
        {(isGenerating || isRegenerating) && (
          <View style={[styles.loadingOverlay, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.loadingContainer}>
              <Animated.View
                style={{
                  transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
                  shadowColor: '#000',
                  shadowOpacity: 0.15,
                  shadowRadius: 15,
                  shadowOffset: { width: 0, height: 10 },
                }}
              >
                <Image source={AppIcon} style={styles.loadingIcon} />
              </Animated.View>

              <Text style={[styles.loadingText, { color: !isDark ? titleColor : '#000000', marginTop: 40 }]}>
                {isRegenerating ? 'Refining your plan...' : 'AI is crafting your plan...'}
              </Text>
              <Text style={[styles.loadingSub, { color: !isDark ? subTitleColor : '#666666' }]}>
                {isRegenerating ? 'Applying your feedback' : 'Analyzing your habits & goals'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View style={styles.modalContainer}>
            <BlurView
              intensity={Platform.OS === 'ios' ? 90 : 110}
              tint={isDark ? 'dark' : 'light'}
              style={[
                styles.glassCard,
                {
                  backgroundColor: isDark ? 'rgba(20,20,40,0.85)' : 'rgba(255,255,255,0.85)',
                  borderColor: isDark ? 'rgba(91,127,232,0.3)' : 'rgba(0,0,0,0.1)',
                },
              ]}
            >
              {/* Fixed Header */}
              <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="arrow-back" size={24} color={palette.text} />
                </Pressable>
                <View style={styles.headerTitles}>
                  <Text style={[styles.title, { color: titleColor }]}>
                    {stage === 'preview' ? 'Your AI Plan' : t((d) => d.aiPlanner.title)}
                  </Text>
                  <Text style={[styles.subTitle, { color: subTitleColor }]}>{dateLabel}</Text>
                </View>
              </View>

              {/* Scrollable Content */}
              <View style={styles.scrollContainer}>
                {stage === 'form' ? (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[styles.formContent, { paddingBottom: 18 }]}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Daily Routine Section */}
                    <Text style={[styles.sectionTitle, { color: titleColor }]}>
                      Daily Routine
                    </Text>
                    <View style={styles.timeRowContainer}>
                      <TimeInputGroup
                        label={t((d) => d.aiPlanner.wakeTime)}
                        value={wakeTime}
                        onChange={setWakeTime}
                        is24Hour={is24Hour}
                        palette={palette}
                      />
                      <TimeInputGroup
                        label={t((d) => d.aiPlanner.sleepTime)}
                        value={sleepTime}
                        onChange={setSleepTime}
                        is24Hour={is24Hour}
                        palette={palette}
                      />
                    </View>

                    {/* Work/Study Section */}
                    <View style={styles.workToggleRow}>
                      <Text style={[styles.sectionTitle, { color: titleColor, marginBottom: 0, flex: 1 }]}>
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
                        <View style={styles.timeRowContainer}>
                          <TimeInputGroup
                            label={t((d) => d.aiPlanner.workStart)}
                            value={workStart}
                            onChange={setWorkStart}
                            is24Hour={is24Hour}
                            palette={palette}
                          />
                          <TimeInputGroup
                            label={t((d) => d.aiPlanner.workEnd)}
                            value={workEnd}
                            onChange={setWorkEnd}
                            is24Hour={is24Hour}
                            palette={palette}
                          />
                        </View>
                        {workValidationError ? (
                          <Text style={[styles.errorText, { color: palette.accent }]}>{workValidationError}</Text>
                        ) : null}
                      </>
                    )}

                    {/* Priorities */}
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: titleColor }]}>
                        {t((d) => d.aiPlanner.priorities)}
                      </Text>
                      <TextInput
                        value={priorities}
                        onChangeText={setPriorities}
                        style={[
                          styles.input,
                          styles.multiline,
                          { backgroundColor: palette.background, borderColor: palette.border, color: contentColor },
                        ]}
                        placeholder={t((d) => d.aiPlanner.prioritiesPlaceholder)}
                        placeholderTextColor={`${palette.text}88`}
                        multiline
                        numberOfLines={3}
                      />
                      <Text style={[styles.helperText, { color: subTitleColor }]}>{helperTexts.priorities}</Text>
                    </View>

                    {/* Habits */}
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: titleColor }]}>{t((d) => d.aiPlanner.habits)}</Text>
                      <TextInput
                        value={habits}
                        onChangeText={setHabits}
                        style={[
                          styles.input,
                          styles.multiline,
                          { backgroundColor: palette.background, borderColor: palette.border, color: contentColor },
                        ]}
                        placeholder={t((d) => d.aiPlanner.habitsPlaceholder)}
                        placeholderTextColor={`${palette.text}88`}
                        multiline
                        numberOfLines={3}
                      />
                      <Text style={[styles.helperText, { color: subTitleColor }]}>{helperTexts.habits}</Text>
                    </View>

                    {/* Notes */}
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: titleColor }]}>{t((d) => d.aiPlanner.notes)}</Text>
                      <TextInput
                        value={feedback}
                        onChangeText={setFeedback}
                        style={[
                          styles.input,
                          styles.multiline,
                          { backgroundColor: palette.background, borderColor: palette.border, color: contentColor },
                        ]}
                        placeholder={t((d) => d.aiPlanner.notesPlaceholder)}
                        placeholderTextColor={`${palette.text}88`}
                        multiline
                        numberOfLines={3}
                      />
                      <Text style={[styles.helperText, { color: subTitleColor }]}>
                        {helperTexts.feedbackExamples}
                      </Text>
                    </View>

                    <View style={styles.limitRow}>
                      {showLimitSpinner ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                      <Text style={[styles.limitText, { color: derivedAiUsageColor }]}>{aiUsageText}</Text>
                    </View>
                    {error ? <Text style={[styles.errorText, { color: palette.accent }]}>{error}</Text> : null}

                    <View style={styles.buttonRow}>
                      <Pressable
                        onPress={handleClose}
                        style={({ pressed }) => [
                          styles.outlineButton,
                          { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={[styles.buttonLabel, { color: palette.text }]}>
                          {t((d) => d.common.cancel)}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={onGeneratePress}
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
                    <Text style={[styles.previewTitle, { color: titleColor }]}>
                      {t((d) => d.aiPlanner.suggestedBlocks)}
                    </Text>
                    <View style={styles.limitRow}>
                      {showLimitSpinner ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                      <Text style={[styles.limitText, { color: derivedAiUsageColor }]}>{aiUsageText}</Text>
                    </View>

                    <ScrollView
                      style={styles.previewList}
                      contentContainerStyle={[styles.previewListContent, { paddingBottom: 18 }]}
                      showsVerticalScrollIndicator={false}
                    >
                      {previewList.length === 0 ? (
                        <Text style={[styles.previewEmptyText, { color: palette.text }]}>
                          {error ?? t((d) => d.aiPlanner.noBlocks)}
                        </Text>
                      ) : (
                        previewList.map((block, index) => {
                          const color = PLAN_CATEGORY_COLORS[block.category] || PLAN_CATEGORY_COLORS.other;
                          return (
                            <View
                              key={`${block.startMin}-${block.title}-${index}`}
                              style={[
                                styles.previewItem,
                                {
                                  borderColor: color.border,
                                  backgroundColor: color.background,
                                },
                              ]}
                            >
                              <Text style={[styles.previewTime, { color: subTitleColor }]}>
                                {formatTimeDisplay(block.startMin, is24Hour)} – {formatTimeDisplay(block.endMin, is24Hour)}
                              </Text>
                              <Text style={[styles.previewTitleRow, { color: contentColor }]}>{block.title}</Text>
                              <Text style={[styles.previewCategory, { color: subTitleColor }]}>{block.category}</Text>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>

                    {stage === 'preview' && (
                      <View style={styles.feedbackSection}>
                        <Text style={[styles.feedbackLabel, { color: titleColor }]}>
                          {t((d) => d.aiPlanner.feedbackLabel)}
                        </Text>
                        <TextInput
                          style={[
                            styles.feedbackInput,
                            {
                              borderColor: palette.border,
                              color: contentColor,
                              backgroundColor: palette.background,
                            },
                          ]}
                          placeholder={t((d) => d.aiPlanner.feedbackPlaceholder)}
                          placeholderTextColor={`${palette.text}88`}
                          multiline
                          value={feedback}
                          onChangeText={setFeedback}
                        />
                        <Pressable
                          onPress={onRegeneratePress}
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
                          { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
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
            </BlurView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    height: '85%',
  },
  glassCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subTitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
  formContent: {},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 8,
    marginTop: 12,
  },
  timeRowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeGroup: { flex: 1 },
  label: { fontSize: 12, marginBottom: 4, opacity: 0.6 },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  colon: { marginHorizontal: 4, fontSize: 18, fontWeight: 'bold' },
  periodBtn: {
    width: 36,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  field: {
    marginBottom: 12,
  },
  workToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
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
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
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
    flex: 1,
    marginTop: 8,
    paddingBottom: 24,
  },
  previewList: {
    flex: 1,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 32,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingSub: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default AiPlanModal;
