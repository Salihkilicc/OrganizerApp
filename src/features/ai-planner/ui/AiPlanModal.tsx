import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
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
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/store/useTheme';
import { useAiPlanner, type UseAiPlannerProps } from '../hooks/useAiPlanner';

export type AiPlanModalProps = UseAiPlannerProps;

const AppIcon = require('@/assets/images/icon.png');



export function AiPlanModal(props: AiPlanModalProps) {
  const { visible } = props;
  const { palette, themeKey } = useTheme();
  const { t } = useI18n();
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

  const onGeneratePress = async () => {
    await handleGenerate();
  };

  const onRegeneratePress = async () => {
    await handleRegenerate();
  };

  const onWatchAdPress = async () => {
    // Close overlay first
    setShowAdOverlay(false);

    // Show real rewarded ad (this will be full screen)
    console.log('[AiPlanModal] Showing rewarded ad...');
    const rewarded = await showAd();

    if (rewarded) {
      // User watched ad and earned reward
      console.log('[AiPlanModal] Ad completed successfully');
      await handleWatchAd();
    } else {
      // Ad failed or user didn't complete it
      console.warn('[AiPlanModal] Ad not completed');
      // Show overlay again so user can retry
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

  // Load ad when modal opens
  useEffect(() => {
    if (visible && !adLoaded) {
      loadAd();
    }
  }, [visible, adLoaded, loadAd]);

  // Animation refs
  const translateXAnim = React.useRef(new Animated.Value(20)).current;
  const translateYAnim = React.useRef(new Animated.Value(-20)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isGenerating || isRegenerating) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(translateXAnim, {
              toValue: -20,
              duration: 1500, // Faster fly
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateXAnim, {
              toValue: 20,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(translateYAnim, {
              toValue: 20,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
              toValue: -20,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
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
          ]),
        ])
      ).start();
    } else {
      translateXAnim.setValue(20);
      translateYAnim.setValue(-20);
      scaleAnim.setValue(1);
    }
  }, [isGenerating, isRegenerating]);

  // Constants used in JSX
  const placeholderColor = `${palette.text}88`;
  const inputTextColor = `${palette.text}dd`;

  // Note: aiUsageColor was not returned by hook, need to derive it or check if I missed it.
  const derivedAiUsageColor = isLimitReached || isGuestUser ? palette.accent : palette.text;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <AiLimitOverlay
        visible={showAdOverlay}
        onWatchAd={onWatchAdPress}
        onGoPremium={onGoPremium}
        onClose={onCloseOverlay}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 24}
        style={styles.flex}>
        {(isGenerating || isRegenerating) && (
          <View style={[styles.loadingOverlay, { backgroundColor: '#FFFFFF' }]}>
            <View style={styles.loadingContainer}>
              <Animated.View style={{
                transform: [
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                  { scale: scaleAnim }
                ],
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowRadius: 15,
                shadowOffset: { width: 0, height: 10 }
              }}>
                <Image
                  source={AppIcon}
                  style={{ width: 100, height: 100, borderRadius: 20 }}
                />
              </Animated.View>

              <Text style={[styles.loadingText, { color: '#000000', marginTop: 40 }]}>
                {isRegenerating ? 'Refining your plan...' : 'AI is crafting your plan...'}
              </Text>
              <Text style={[styles.loadingSub, { color: '#666666' }]}>
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
                  style={({ pressed }) => [
                    styles.backButton,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Ionicons name="arrow-back" size={24} color={palette.text} />
                </Pressable>
                <View style={styles.headerTitles}>
                  <Text style={[styles.title, { color: palette.text }]}>{t((d) => d.aiPlanner.title)}</Text>
                  <Text style={[styles.subTitle, { color: palette.text }]}>{dateLabel}</Text>
                </View>
              </View>

              {/* Scrollable Content */}
              <View style={styles.scrollContainer}>

                {stage === 'form' ? (
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={[
                      styles.formContent,
                      { paddingBottom: 18 },
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
                    <Text style={[styles.previewTitle, { color: palette.text }]}>
                      {t((d) => d.aiPlanner.suggestedBlocks)}
                    </Text>
                    <View style={styles.limitRow}>
                      {showLimitSpinner ? <ActivityIndicator size="small" color={palette.accent} /> : null}
                      <Text style={[styles.limitText, { color: derivedAiUsageColor }]}>
                        {aiUsageText}
                      </Text>
                    </View>

                    {/* Scrollable plan blocks */}
                    <ScrollView
                      style={styles.previewList}
                      contentContainerStyle={[
                        styles.previewListContent,
                        { paddingBottom: 18 },
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

                    {/* Fixed footer section */}
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
            </BlurView>
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
