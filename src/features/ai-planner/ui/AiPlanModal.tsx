import {
  ActivityIndicator,
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

import LoadingOverlay from '@/components/LoadingOverlay';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/store/useTheme';
import { useAiPlanner, type UseAiPlannerProps } from '../hooks/useAiPlanner';

export type AiPlanModalProps = UseAiPlannerProps;

export function AiPlanModal(props: AiPlanModalProps) {
  const { visible } = props;
  const { palette } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

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
    formatMinutes,
  } = useAiPlanner(props);

  // Constants used in JSX
  const placeholderColor = `${palette.text}88`;
  const inputTextColor = `${palette.text}dd`;

  // Note: aiUsageColor was not returned by hook, need to derive it or check if I missed it.
  // Checking usage color derived logic:
  // Original: const aiUsageColor = isLimitReached || isGuestUser ? palette.accent : palette.text;
  // Hook does not return this because it depends on palette.
  const derivedAiUsageColor = isLimitReached || isGuestUser ? palette.accent : palette.text;

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
                  <Text style={[styles.limitText, { color: derivedAiUsageColor }]}>
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
                  <Text style={[styles.limitText, { color: derivedAiUsageColor }]}>
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
