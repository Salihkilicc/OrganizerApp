import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/store/useAuth';
import { type ThemeId, useTheme } from '@/store/useTheme';
import { useLanguage } from '@/store/useLanguage';
import { useSettings } from '@/store/useSettings';
import { usePremium } from '@/store/usePremium';
import { availableLanguages, getLanguageName, useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/Button';
import { CrownIcon } from '@/components/icons/CrownIcon';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { TranslationKeys } from '@/i18n/translations';
import { useAvatarStore } from '@/store/useAvatar';
import { AVATAR_IMAGES } from '@/constants/avatars';

const formatThemeLabel = (key: ThemeId) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\w/, (char) => char.toUpperCase());

const themeLabelMap: Partial<Record<ThemeId, (dict: TranslationKeys) => string>> = {
  light: (d) => d.settings.themeLight,
  dark: (d) => d.settings.themeDark,
  ninja: (d) => d.settings.themeNinja,
};

const SHOW_REFLECTION_NOTIFICATION_TOGGLE = false;

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
};

export default function SettingsScreen() {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const palette = useTheme((state) => state.palette);
  const themeKey = useTheme((state) => state.themeKey);
  const setTheme = useTheme((state) => state.setTheme);
  const themeLabelSelector = themeLabelMap[themeKey] ?? (() => formatThemeLabel(themeKey));
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const profilePhoto =
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.avatar_url ||
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.picture;
  const status = useAuth((state) => state.status);
  const signOut = useAuth((state) => state.signOut);
  const { t } = useI18n();
  const currentLanguage = useLanguage((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const isPremium = usePremium((state) => state.isPremium);
  const notificationTypes = useSettings((state) => state.notificationTypes);
  const toggleNotificationType = useSettings((state) => state.toggleNotificationType);
  const waterReminderEnabled = useSettings((state) => state.waterReminderEnabled);
  const toggleWaterReminder = useSettings((state) => state.toggleWaterReminder);
  const selectedAvatar = useAvatarStore((state) => state.selectedAvatar);
  const avatarSource = profilePhoto
    ? { uri: profilePhoto }
    : selectedAvatar
      ? AVATAR_IMAGES[selectedAvatar]
      : null;

  const displayName =
    user?.user_metadata?.full_name ?? user?.name ?? t((d) => d.common.user);
  const isGuest = status === 'guest';
  const guestLabel = t((d) => d.profile.guestLabel);
  const userLabel = isGuest ? guestLabel : user?.email ?? guestLabel;
  const initials = useMemo(() => getInitials(displayName), [displayName]);
  const authButtonLabel =
    status === 'authenticated' ? t((d) => d.settings.signOut) : t((d) => d.common.logIn);

  const handleSelectLanguage = (code: (typeof availableLanguages)[number]['code']) => {
    setLanguage(code);
  };

  const handleCycleTheme = () => {
    const nextTheme: ThemeId = themeKey === 'light' ? 'dark' : 'light';
    void setTheme(nextTheme);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t((d) => d.settings.deleteAccount),
      t((d) => d.settings.deleteAccountWarning),
      [
        { text: t((d) => d.settings.deleteAccountCancel), style: 'cancel' },
        {
          text: t((d) => d.settings.deleteAccountConfirm),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t((d) => d.settings.deleteAccount),
              t((d) => d.settings.deleteAccountSupport),
              [{ text: t((d) => d.settings.deleteAccountCancel), style: 'cancel' }],
            );
          },
        },
      ],
    );
  };

  const handleAuthAction = async () => {
    if (status !== 'authenticated') {
      router.replace('/(auth)/login');
      return;
    }

    await signOut();
  };

  const handleToggleWater = () => {
    const nextValue = !notificationTypes.enableWaterReminders;
    toggleNotificationType('enableWaterReminders');
    if (waterReminderEnabled !== nextValue) {
      toggleWaterReminder();
    }
  };

  const renderNotificationToggle = (
    label: string,
    value: boolean,
    onToggle: () => void,
  ) => (
    <View
      style={[
        styles.sectionRow,
        styles.sectionShadow,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}>
      <View style={styles.sectionText}>
        <Text style={[styles.sectionLabel, { color: palette.text }]}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={palette.background}
        trackColor={{ false: palette.border, true: palette.accent }}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, styles.headerMargin]}>
          <Text style={[styles.heading, { color: palette.text }]}>{t((d) => d.settings.title)}</Text>
        </View>

        <View
          style={[styles.profileCard, styles.cardShadow, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={[styles.avatar, { backgroundColor: avatarSource ? palette.background : palette.accent }]}>
            {avatarSource ? (
              <Image source={avatarSource} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: palette.background }]}>{initials}</Text>
            )}
          </View>
          <View style={styles.profileBody}>
            <Text style={[styles.profileName, { color: palette.text }]}>{displayName}</Text>
            <Text style={[styles.profileSubtitle, { color: palette.text }]}>{userLabel}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.profileAction,
              {
                backgroundColor: palette.background,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Ionicons name="pencil" size={20} color={palette.text} />
          </Pressable>
        </View>

        <View style={styles.premiumWrapper}>
          {isPremium ? (
            <View
              style={[
                styles.premiumPromo,
                styles.cardShadow,
                styles.premiumOwned,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}>
              <View style={styles.premiumTextWrapper}>
                <CrownIcon color={palette.text} size={40} style={styles.premiumIcon} />
                <View style={styles.premiumTextGroup}>
                  <Text style={[styles.premiumPromoTitle, { color: palette.text }]}>
                    {t((d) => d.settings.premiumActiveTitle)}
                  </Text>
                  <Text style={[styles.premiumPromoSubtitle, { color: palette.text }]}>
                    {t((d) => d.settings.premiumActiveSubtitle)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/paywall')}
              style={({ pressed }) => [
                styles.premiumPromo,
                styles.cardShadow,
                styles.premiumOutline,
                {
                  opacity: pressed ? 0.9 : 1,
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}>
              <View style={styles.premiumTextWrapper}>
                <CrownIcon color={palette.text} size={40} style={styles.premiumIcon} />
                <View style={styles.premiumTextGroup}>
                  <Text style={[styles.premiumPromoTitle, { color: palette.text }]}>
                    {t((d) => d.settings.unlockPremiumTitle)}
                  </Text>
                  <Text style={[styles.premiumPromoSubtitle, { color: palette.text }]}>
                    {t((d) => d.settings.unlockPremiumSubtitle)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.text} />
            </Pressable>
          )}
        </View>

        <View
          style={[
            styles.sectionCard,
            styles.cardShadow,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              marginTop: 0,
            },
          ]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.settings.yourSettings)}
          </Text>
          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="person-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.settings.personalDetails)}
              </Text>
              <Text style={[styles.sectionHint, { color: palette.text }]}>
                {t((d) => d.settings.personalDetailsDescription)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => setLanguageModalVisible(true)}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="language-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.settings.languageTitle)}
              </Text>
              <Text style={[styles.sectionHint, { color: palette.text }]}>
                {getLanguageName(currentLanguage)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleCycleTheme}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="sunny-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.settings.appearance)}
              </Text>
              <Text style={[styles.sectionHint, { color: palette.text }]}>
                {t(themeLabelSelector)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionCard,
            styles.cardShadow,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t((d) => d.settings.notifications)}
          </Text>
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.nextUp),
            notificationTypes.enableNextUp,
            () => toggleNotificationType('enableNextUp'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.focusNotifications),
            notificationTypes.enableFocusNotifications,
            () => toggleNotificationType('enableFocusNotifications'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.missedPlans),
            notificationTypes.enableMissedPlans,
            () => toggleNotificationType('enableMissedPlans'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.streakRescue),
            notificationTypes.enableStreakRescue,
            () => toggleNotificationType('enableStreakRescue'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.middayMilestone),
            notificationTypes.enableMiddayMilestone,
            () => toggleNotificationType('enableMiddayMilestone'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.weeklySummary),
            notificationTypes.enableWeeklySummary,
            () => toggleNotificationType('enableWeeklySummary'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.badgeNotifications),
            notificationTypes.enableBadgeNotifications,
            () => toggleNotificationType('enableBadgeNotifications'),
          )}
          {renderNotificationToggle(
            t((d) => d.settings.notificationType.waterReminders),
            notificationTypes.enableWaterReminders && waterReminderEnabled,
            handleToggleWater,
          )}
          {SHOW_REFLECTION_NOTIFICATION_TOGGLE &&
            renderNotificationToggle(
              t((d) => d.settings.notificationType.reflection),
              notificationTypes.enableReflection,
              () => toggleNotificationType('enableReflection'),
            )}
        </View>

        <View
          style={[
            styles.sectionCard,
            styles.cardShadow,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Pressable
            onPress={() => router.push('/terms')}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="document-text-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.legal.termsTitle)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="lock-closed-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.legal.privacyTitle)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/support')}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="mail-outline" size={20} color={palette.text} />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: palette.text }]}>
                {t((d) => d.legal.supportTitle)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text} />
          </Pressable>
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [
              styles.sectionRow,
              styles.sectionShadow,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            <View style={styles.sectionText}>
              <Text style={[styles.sectionLabel, { color: '#D32F2F' }]}>
                {t((d) => d.settings.deleteAccount)}
              </Text>
            </View>
          </Pressable>
          <View style={styles.signOutInline}>
            <View style={styles.footerButtonShadow}>
              <Button title={authButtonLabel} onPress={() => void handleAuthAction()} type="secondary" />
            </View>
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)} />
          <View
            style={[
              styles.selectorModal,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}>
            <View style={[styles.selectorModalHandle, { backgroundColor: palette.border }]} />
            <Text style={[styles.selectorModalTitle, { color: palette.text }]}>
              {t((d) => d.settings.languageTitle)}
            </Text>
            <ScrollView
              style={styles.selectorModalList}
              contentContainerStyle={styles.selectorModalListContent}
              showsVerticalScrollIndicator={false}>
              {availableLanguages.map((option) => {
                const isActive = option.code === currentLanguage;
                return (
                  <Pressable
                    key={option.code}
                    onPress={() => {
                      handleSelectLanguage(option.code);
                      setLanguageModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.selectorItem,
                      {
                        borderColor: palette.border,
                        backgroundColor: isActive ? palette.accent : palette.card,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.selectorItemText,
                        { color: isActive ? palette.background : palette.text },
                      ]}>
                      {option.name}
                    </Text>
                    {isActive && (
                      <Text style={[styles.selectorItemCheck, { color: palette.background }]}>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 14,
    marginTop: 4,
  },
  headerMargin: {
    marginBottom: 8,
    marginTop: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileBody: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  profileAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  premiumSubtitle: {
    fontSize: 14,
    marginTop: 6,
    color: '#fff',
  },
  premiumPromo: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumPromoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  premiumPromoSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  premiumIcon: {
    marginRight: 12,
  },
  premiumOwned: {
    opacity: 0.85,
  },
  premiumTextWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumTextGroup: {
    flex: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  premiumOutline: {
    borderWidth: 1,
  },
  premiumWrapper: {
    paddingBottom: 20,
  },
  sectionCard: {
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 18,
    paddingTop: 16,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    borderRadius: 18,
  },
  sectionShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionText: {
    flex: 1,
    marginLeft: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: 4,
  },
  footerButtonShadow: {
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 5,
    width: '100%',
  },
  signOutInline: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  selectorModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  selectorModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  selectorModalList: {
    maxHeight: 320,
  },
  selectorModalListContent: {
    paddingBottom: 12,
  },
  selectorItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  selectorItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorItemCheck: {
    fontSize: 18,
    fontWeight: '700',
  },
});
