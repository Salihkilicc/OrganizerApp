import { type PlanCategory, usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { useAuth } from '@/store/useAuth';
import { useTheme } from '@/store/useTheme';
import { useRouter } from 'expo-router';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { getFrameDecoration } from '@/lib/frameStyles';
import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { translations, type TranslationKeys } from '@/i18n/translations';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useAvatarStore } from '@/store/useAvatar';
import { AVATAR_IMAGES } from '@/constants/avatars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Popup } from '@/components/Popup';
import { useShop } from '@/store/useShop';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const { t, lang } = useI18n();
  const headerHeight = useHeaderHeight();
  const user = useAuth((state) => state.user);
  const setFromSession = useAuth((state) => state.setFromSession);
  const selectedAvatar = useAvatarStore((state) => state.selectedAvatar);
  const profilePhoto =
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.avatar_url ||
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.picture;
  const isGuest = useAuth((state) => state.isGuest);
  const totalPoints = usePoints((state) => state.total);
  const blocks = usePlans((state) => state.blocks);
  const frameId = useProfileAppearance((state) => state.frameId);
  const frameDecoration = getFrameDecoration(frameId);
  const avatarFrameStyle = frameDecoration
    ? {
        borderWidth: frameDecoration.borderWidth,
        borderColor: frameDecoration.borderColor,
        shadowColor: frameDecoration.shadowColor ?? frameDecoration.borderColor,
        shadowOpacity: frameDecoration.shadowOpacity ?? 0.4,
        shadowOffset: frameDecoration.shadowOffset ?? { width: 0, height: 4 },
        shadowRadius: frameDecoration.shadowRadius ?? 10,
        elevation: frameDecoration.elevation ?? 4,
      }
    : {
        borderWidth: 1,
        borderColor: palette.border,
      };
  const avatarSource = selectedAvatar
    ? AVATAR_IMAGES[selectedAvatar]
    : profilePhoto
      ? { uri: profilePhoto }
      : null;

  const fallbackName = isGuest
    ? t((d) => d.common.guestUser)
    : user?.email?.split('@')[0] ?? t((d) => d.common.user);
  const initialName = user?.user_metadata?.full_name ?? fallbackName;
  const initialEmail = user?.email ?? '';

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setFullName(initialName);
  }, [initialName]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setStatusMessage(null);
  }, [fullName, email]);

  const initials = useMemo(() => {
    const parts = fullName.split(' ').filter(Boolean);
    if (!parts.length) {
      return 'U';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return `${first}${last}`.toUpperCase();
  }, [fullName]);

  const streakDays = 0; // TODO: surface real streak metrics once focus tracking is wired.
  const totalFocusMinutes = 0; // TODO: replace with actual focus minutes from the tracker.

  const mostActiveCategory = useMemo<PlanCategory | null>(() => {
    if (!blocks.length) {
      return null;
    }
    const counts = blocks.reduce((acc, block) => {
      acc[block.category] = (acc[block.category] ?? 0) + 1;
      return acc;
    }, {} as Record<PlanCategory, number>);
    let bestCategory: PlanCategory | null = null;
    let bestCount = 0;
    (Object.keys(counts) as PlanCategory[]).forEach((category) => {
      const count = counts[category] ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestCategory = category;
      }
    });
    return bestCategory;
  }, [blocks]);

  const hydrateShop = useShop((state) => state.hydrate);
  const shopItems = useShop((state) => state.items);
  const badgeDetails =
    (translations[lang] ?? translations.en).points.badgeDetails as TranslationKeys['points']['badgeDetails'];
  const shopBadges = useMemo(
    () => shopItems.filter((item) => item.category === 'badge'),
    [shopItems],
  );
  const categoryLabels = useMemo(
    () => ({
      focus: t((d) => d.plan.categories.focus),
      study: t((d) => d.plan.categories.study),
      work: t((d) => d.plan.categories.work),
      gym: t((d) => d.plan.categories.gym),
      meeting: t((d) => d.plan.categories.meeting),
      reading: t((d) => d.plan.categories.reading),
      break: t((d) => d.plan.categories.break),
      personal: t((d) => d.plan.categories.personal),
      other: t((d) => d.plan.categories.other),
    }),
    [t],
  );
  const mostActiveCategoryLabel = mostActiveCategory
    ? categoryLabels[mostActiveCategory] ?? categoryLabels.other
    : null;

  const handleAvatarPress = () => {
    router.push('/points');
  };

  const storedName = (user?.user_metadata?.full_name ?? '').trim();
  const storedEmail = user?.email ?? '';
  const pendingName = fullName.trim();
  const pendingEmail = email.trim();
  const canEditProfile = Boolean(user?.id) && !isGuest;
  const hasProfileChanges =
    canEditProfile &&
    ((pendingName.length > 0 && pendingName !== storedName) ||
      (pendingEmail.length > 0 && pendingEmail !== storedEmail));

  const handleSaveProfile = async () => {
    if (!user || !canEditProfile) {
      Alert.alert(t((d) => d.common.error), t((d) => d.auth.loginError));
      return;
    }

    const nameChanged = pendingName.length > 0 && pendingName !== storedName;
    const emailChanged = pendingEmail.length > 0 && pendingEmail !== storedEmail;

    if (!nameChanged && !emailChanged) {
      setStatusMessage({
        type: 'success',
        text: t((d) => d.profile.saveNameMessage),
      });
      return;
    }

    if (emailChanged && !pendingEmail.includes('@')) {
      setStatusMessage({
        type: 'error',
        text: t((d) => d.auth.errors.fillAllFields),
      });
      return;
    }

    setSavingProfile(true);
    setStatusMessage(null);

    try {
      const payload: Parameters<typeof supabase.auth.updateUser>[0] = {};
      if (nameChanged) {
        payload.data = {
          ...(user.user_metadata ?? {}),
          full_name: pendingName,
        };
      }
      if (emailChanged) {
        payload.email = pendingEmail;
      }

      const { error } = await supabase.auth.updateUser(payload);
      if (error) {
        throw error;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && sessionData.session) {
        setFromSession(sessionData.session);
      }

      if (emailChanged) {
        setStatusMessage({
          type: 'success',
          text: t((d) => d.profile.changeEmailMessage, { email: pendingEmail }),
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: t((d) => d.profile.saveNameMessage),
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t((d) => d.common.error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const showPasswordSuccessToast = () => {
    const successText = t((d) => d.profile.changePasswordTitle);
    if (Platform.OS === 'android') {
      ToastAndroid.show(successText, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(successText);
  };

  const handlePasswordSubmit = async () => {
    if (!user || !canEditProfile) {
      Alert.alert(t((d) => d.common.error), t((d) => d.auth.loginError));
      return;
    }

    setPasswordError(null);
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setPasswordError(t((d) => d.auth.errors.passwordTooShort));
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError(t((d) => d.auth.errors.passwordMismatch));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) {
        throw error;
      }
      showPasswordSuccessToast();
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : t((d) => d.common.error));
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordLoading) return;
    setPasswordModalVisible(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  useEffect(() => {
    void hydrateShop();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight + 12}
        style={styles.flex}>
        <View style={styles.backRow}>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.card,
              },
            ]}>
            <Text style={[styles.backIcon, { color: palette.text }]}>‹</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets>
          <View style={styles.headerRow}>
            <View style={styles.avatarColumn}>
            <Pressable
              onPress={handleAvatarPress}
              style={[
                styles.avatar,
                { backgroundColor: avatarSource ? palette.background : palette.accent },
                avatarFrameStyle,
              ]}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: palette.background }]}>{initials}</Text>
              )}
            </Pressable>
            </View>
            <View style={styles.headerStats}>
            <Text style={[styles.headerStatValue, { color: palette.accent }]}>
              {t((d) => d.profile.totalPoints)}: {totalPoints} pts
            </Text>
            <Text style={[styles.headerStatSub, { color: palette.text }]}>
              {t((d) => d.profile.streak)}: {streakDays} {t((d) => d.profile.days)}
            </Text>
            </View>
          </View>

        <View
          style={[
            styles.sectionStack,
            { borderColor: palette.border, backgroundColor: palette.card },
          ]}>
          <View style={[styles.sectionStackRow, styles.sectionStackColumn]}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              {t((d) => d.profile.name)}
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder={t((d) => d.profile.name)}
              placeholderTextColor={palette.text + '99'}
              editable={canEditProfile}
              style={[
                styles.textInput,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                  color: palette.text,
                },
              ]}
            />
          </View>

          <View
            style={[
              styles.sectionStackRow,
              styles.sectionStackColumn,
              { borderTopWidth: 1, borderColor: palette.border },
            ]}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              {t((d) => d.profile.email)}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t((d) => d.profile.email)}
              placeholderTextColor={palette.text + '99'}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={canEditProfile}
              style={[
                styles.textInput,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                  color: palette.text,
                },
              ]}
            />
          </View>

          {statusMessage ? (
            <Text
              style={[
                styles.statusMessage,
                {
                  color: statusMessage.type === 'error' ? '#ef4444' : palette.accent,
                },
              ]}>
              {statusMessage.text}
            </Text>
          ) : null}

          <View style={[styles.sectionStackRow, styles.saveRow]}>
            <Button
              title={savingProfile ? t((d) => d.common.loading) : t((d) => d.profile.saveName)}
              onPress={handleSaveProfile}
              loading={savingProfile}
              disabled={!hasProfileChanges || savingProfile || !canEditProfile}
            />
          </View>

          <Pressable
            onPress={() => setPasswordModalVisible(true)}
            disabled={!canEditProfile}
            style={({ pressed }) => [
              styles.sectionStackRow,
              styles.sectionStackLastRow,
              {
                borderTopWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.card,
                opacity: !canEditProfile ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[styles.passwordText, { color: palette.text }]}>
              {t((d) => d.profile.changePassword)}
            </Text>
            <Text style={[styles.passwordText, { color: palette.accent }]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.profile.stats)}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statsCard,
              { borderColor: palette.border, backgroundColor: palette.card, marginRight: scaleValue(10) },
            ]}>
            <Text style={[styles.statsLabel, { color: palette.text }]}>
              {t((d) => d.profile.mostActiveCategory)}
            </Text>
            <Text style={[styles.statsValue, { color: palette.text }]}>
              {mostActiveCategoryLabel ?? t((d) => d.profile.mostActiveNone)}
            </Text>
          </View>
          <View
            style={[
              styles.statsCard,
              { borderColor: palette.border, backgroundColor: palette.card },
            ]}>
            <Text style={[styles.statsLabel, { color: palette.text }]}>
              {t((d) => d.profile.totalFocusTime)}
            </Text>
            <Text style={[styles.statsValue, { color: palette.text }]}>
              {t((d) => d.profile.totalFocusMinutesLabel, { minutes: totalFocusMinutes })}
            </Text>
          </View>
        </View>

        <View style={[styles.sectionHeader, styles.achievementHeader]}>
          <Text style={[styles.achievementHeading, { color: palette.text }]}>
            {t((d) => d.profile.achievements)}
          </Text>
        </View>
        <View style={styles.achievementGrid}>
          {shopBadges.map((badge) => {
            const locked = !badge.owned;
            return (
              <View
                key={badge.id}
                style={[
                  styles.achievementCard,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.card,
                    opacity: locked ? 0.75 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.achievementIcon,
                    { borderColor: palette.border, backgroundColor: palette.background },
                  ]}>
                  <Ionicons
                    name={locked ? 'lock-closed' : 'trophy'}
                    size={16}
                    color={locked ? palette.border : palette.accent}
                  />
                </View>
                <View style={styles.achievementBody}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      { color: locked ? palette.text : palette.text },
                    ]}>
                    {badgeDetails[badge.id]?.title ?? badge.title}
                  </Text>
                  {(badgeDetails[badge.id]?.description ?? badge.requirementDescription) ? (
                    <Text
                      style={[
                        styles.achievementSubtitle,
                        { color: locked ? palette.text + '99' : palette.text + 'CC' },
                      ]}>
                      {badgeDetails[badge.id]?.description ?? badge.requirementDescription}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.achievementStatus,
                    {
                      borderColor: locked ? palette.border : palette.accent,
                      backgroundColor: locked ? palette.background : palette.accent,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.achievementStatusText,
                      { color: locked ? palette.text : palette.background },
                    ]}>
                    {locked ? t((d) => d.profile.achievementLocked) : t((d) => d.profile.achievementUnlocked)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Popup
        visible={avatarModalVisible}
        title={t((d) => d.points.profilePhotos)}
        description={t((d) => d.points.profilePhotosDescription)}
        icon="🖼️"
        actionLabel={t((d) => d.today.close)}
        onClose={() => setAvatarModalVisible(false)}
      />

      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closePasswordModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCardWrapper}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                {t((d) => d.profile.changePassword)}
              </Text>
              <Text style={[styles.modalDescription, { color: palette.text + 'CC' }]}>
                {t((d) => d.profile.changePasswordMessage)}
              </Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t((d) => d.auth.passwordPlaceholder)}
                placeholderTextColor={palette.text + '88'}
                secureTextEntry
                style={[
                  styles.modalInput,
                  { borderColor: palette.border, backgroundColor: palette.background, color: palette.text },
                ]}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t((d) => d.auth.confirmPassword)}
                placeholderTextColor={palette.text + '88'}
                secureTextEntry
                style={[
                  styles.modalInput,
                  { borderColor: palette.border, backgroundColor: palette.background, color: palette.text },
                ]}
              />
              {passwordError ? (
                <Text style={[styles.statusMessage, { color: '#ef4444' }]}>{passwordError}</Text>
              ) : null}
              <View style={styles.modalActions}>
                <Button
                  title={t((d) => d.common.cancel)}
                  onPress={closePasswordModal}
                  disabled={passwordLoading}
                  type="ghost"
                />
                <View style={styles.modalActionSpacing} />
                <Button
                  title={passwordLoading ? t((d) => d.common.loading) : t((d) => d.profile.changePassword)}
                  onPress={handlePasswordSubmit}
                  loading={passwordLoading}
                  disabled={passwordLoading}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SIZE_SCALE = 0.9;
const scaleValue = (value: number) => value * SIZE_SCALE;
const AVATAR_BASE_SIZE = 112;
const AVATAR_SIZE = Math.round(AVATAR_BASE_SIZE * 1.5 * 0.9 * 1.05);
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const SF_MEDIUM_FONT_FAMILY =
  Platform.select({
    ios: 'SF Pro Display',
    web: '"SF Pro Display", "SF Pro Text", "-apple-system", "BlinkMacSystemFont", "Segoe UI", system-ui, sans-serif',
    default: 'SF Pro Display',
  }) ?? 'System';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: scaleValue(16),
    paddingBottom: scaleValue(34),
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleValue(6),
    marginTop: scaleValue(4),
    marginLeft: scaleValue(10),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: scaleValue(12),
  },
  avatarColumn: {
    marginRight: scaleValue(10),
    marginTop: -scaleValue(6),
    marginLeft: scaleValue(6),
  },
  backButton: {
    width: scaleValue(36),
    height: scaleValue(36),
    borderRadius: scaleValue(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backIcon: {
    fontSize: scaleValue(20),
    fontWeight: '700',
  },
  headerStats: {
    alignItems: 'flex-start',
    marginLeft: scaleValue(10),
    marginBottom: scaleValue(6),
  },
  headerStatValue: {
    fontSize: scaleValue(13),
    fontWeight: '500',
    fontFamily: SF_MEDIUM_FONT_FAMILY,
  },
  headerStatSub: {
    fontSize: scaleValue(11),
    fontWeight: '500',
    fontFamily: SF_MEDIUM_FONT_FAMILY,
    marginTop: scaleValue(2),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: scaleValue(32),
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  sectionStack: {
    borderWidth: 1,
    borderRadius: scaleValue(18),
    marginBottom: scaleValue(16),
    overflow: 'hidden',
    alignSelf: 'flex-start',
    width: '95%',
  },
  sectionStackRow: {
    paddingHorizontal: scaleValue(14),
    paddingVertical: scaleValue(10),
  },
  sectionStackColumn: {
    flexDirection: 'column',
  },
  sectionStackLastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: scaleValue(12),
    fontWeight: '600',
    marginBottom: scaleValue(6),
    textTransform: 'uppercase',
    letterSpacing: scaleValue(0.4),
  },
  textInput: {
    height: scaleValue(42),
    borderWidth: 1,
    borderRadius: scaleValue(12),
    paddingHorizontal: scaleValue(14),
    fontSize: scaleValue(14),
  },
  statusMessage: {
    paddingHorizontal: scaleValue(14),
    marginTop: scaleValue(6),
    fontSize: scaleValue(13),
    fontWeight: '600',
  },
  saveRow: {
    alignItems: 'flex-end',
  },
  passwordText: {
    fontSize: scaleValue(15),
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: scaleValue(12),
  },
  sectionTitle: {
    fontSize: scaleValue(15),
    fontWeight: '700',
  },
  achievementHeader: {
    marginTop: scaleValue(18),
  },
  achievementHeading: {
    fontSize: scaleValue(24), // 60% larger than base section title
    fontWeight: '800',
  },
  achievementSubheading: {
    fontSize: scaleValue(14.5), // ~20% larger than previous subtitle
    opacity: 0.85,
    marginTop: scaleValue(6),
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scaleValue(14),
    paddingHorizontal: scaleValue(10),
    paddingVertical: scaleValue(6),
    marginRight: scaleValue(8),
    marginBottom: scaleValue(8),
  },
  badgeIcon: {
    fontSize: scaleValue(16),
    marginRight: scaleValue(6),
  },
  badgeLabel: {
    fontSize: scaleValue(13),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: scaleValue(16),
    padding: scaleValue(12),
  },
  statsLabel: {
    fontSize: scaleValue(11),
    letterSpacing: scaleValue(0.4),
    textTransform: 'uppercase',
    marginBottom: scaleValue(6),
    fontWeight: '600',
  },
  statsValue: {
    fontSize: scaleValue(15),
    fontWeight: '700',
  },
  achievementGrid: {
    marginTop: scaleValue(4),
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scaleValue(14),
    paddingVertical: scaleValue(10),
    paddingHorizontal: scaleValue(12),
    marginBottom: scaleValue(10),
  },
  achievementIcon: {
    width: scaleValue(32),
    height: scaleValue(32),
    borderRadius: scaleValue(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: scaleValue(10),
  },
  achievementBody: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: scaleValue(14),
    fontWeight: '700',
  },
  achievementSubtitle: {
    fontSize: scaleValue(12),
    marginTop: scaleValue(2),
  },
  achievementStatus: {
    paddingHorizontal: scaleValue(10),
    paddingVertical: scaleValue(4),
    borderRadius: scaleValue(10),
    borderWidth: 1,
  },
  achievementStatusText: {
    fontSize: scaleValue(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: scaleValue(0.4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: scaleValue(16),
  },
  modalCardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: scaleValue(18),
    padding: scaleValue(16),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
    elevation: 10,
  },
  modalTitle: {
    fontSize: scaleValue(18),
    fontWeight: '700',
    marginBottom: scaleValue(6),
  },
  modalDescription: {
    fontSize: scaleValue(13),
    lineHeight: scaleValue(18),
    marginBottom: scaleValue(10),
  },
  modalInput: {
    height: scaleValue(44),
    borderWidth: 1,
    borderRadius: scaleValue(12),
    paddingHorizontal: scaleValue(12),
    fontSize: scaleValue(14),
    marginBottom: scaleValue(10),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: scaleValue(4),
  },
  modalActionSpacing: {
    width: scaleValue(10),
  },
});
