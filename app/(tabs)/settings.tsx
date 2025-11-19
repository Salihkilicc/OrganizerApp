import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { type ThemeId, useTheme } from '@/store/useTheme';
import { useAuth } from '@/store/useAuth';
import { LANGUAGE_LABELS, LANGUAGE_OPTIONS, useLanguage } from '@/store/useLanguage';
import { useSettings, type NotificationTypes } from '@/store/useSettings';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const themeOptions: ThemeId[] = ['light', 'dark', 'ninja'];
const themeLabelMap: Record<ThemeId, 'lightTheme' | 'darkTheme' | 'ninjaTheme'> = {
  light: 'lightTheme',
  dark: 'darkTheme',
  ninja: 'ninjaTheme',
};

export default function SettingsScreen() {
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const palette = useTheme((state) => state.palette);
  const themeKey = useTheme((state) => state.themeKey);
  const setTheme = useTheme((state) => state.setTheme);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const currentLanguage = useLanguage((state) => state.current);

  const setLanguage = useSettings((state) => state.setLanguage);
  const waterReminderEnabled = useSettings((state) => state.waterReminderEnabled);
  const toggleWaterReminder = useSettings((state) => state.toggleWaterReminder);
  const vibrationEnabled = useSettings((state) => state.vibrationEnabled);
  const toggleVibration = useSettings((state) => state.toggleVibration);
  const notificationTypes = useSettings((state) => state.notificationTypes);
  const toggleNotificationType = useSettings((state) => state.toggleNotificationType);

  const notificationTypeOptions: { key: keyof NotificationTypes; label: string }[] = [
    { key: 'planReminders', label: t('settings.notificationType.planReminders') },
    { key: 'focusMode', label: t('settings.notificationType.focusMode') },
    { key: 'dailySummary', label: t('settings.notificationType.dailySummary') },
    { key: 'streakWarning', label: t('settings.notificationType.streakWarning') },
  ];

  const enabledNotificationCount = Object.values(notificationTypes).filter(Boolean).length;

  const handleSelectLanguage = (code: typeof LANGUAGE_OPTIONS[number]['code']) => {
    setLanguage(code);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountWarning'),
      [
        { text: t('settings.deleteAccountCancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccountConfirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountSupport'), [
              { text: t('settings.deleteAccountCancel'), style: 'cancel' },
            ]);
          },
        },
      ],
    );
  };

  const isGuest = Boolean(user && 'guest' in user && user.guest);
  const userLabel = isGuest ? 'guest' : (user && (user as any).email) ?? 'guest';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.heading, { color: palette.text }]}>{t('settings.title')}</Text>
            <Text style={[styles.subheading, { color: palette.text }]}>{userLabel}</Text>
          </View>

          <View style={styles.section}>
            <Pressable
              onPress={() => {
                router.push('/profile');
              }}
              style={({ pressed }) => [
                styles.profileRow,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text style={[styles.profileRowLabel, { color: palette.text }]}>{t('settings.profile')}</Text>
              <Text style={[styles.profileRowChevron, { color: palette.text }]}>›</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('settings.theme')}</Text>
            <View style={styles.optionRow}>
              {themeOptions.map((option) => {
                const isActive = option === themeKey;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      void setTheme(option);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isActive ? palette.accent : palette.background,
                        borderColor: isActive ? palette.accent : palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isActive ? '#fff' : palette.text,
                        },
                      ]}>
                      {t(themeLabelMap[option])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('settings.language')}</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.text }]}>
              {t('settings.languageDescription')}
            </Text>
            <Pressable
              onPress={() => setLanguageModalVisible(true)}
              style={({ pressed }) => [
                styles.selectorButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorButtonText, { color: palette.text }]}>
                  {LANGUAGE_LABELS[currentLanguage]}
                </Text>
                <Text style={[styles.selectorButtonSubtext, { color: palette.text }]}>
                  {t('language.current')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('settings.notifications')}</Text>
            <Text style={[styles.sectionSubtitle, { color: palette.text }]}>
              {t('settings.vibrationDescription')}
            </Text>
            <View
              style={[
                styles.toggleRow,
                { borderColor: palette.border, backgroundColor: palette.card },
              ]}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>{t('settings.vibration')}</Text>
              <Switch
                value={vibrationEnabled}
                onValueChange={toggleVibration}
                trackColor={{ false: palette.border, true: palette.accent }}
                thumbColor={palette.card}
                ios_backgroundColor={palette.border}
              />
            </View>
            <Text style={[styles.sectionSubtitle, { color: palette.text, marginTop: 12 }]}>
              {t('settings.notificationTypes')}
            </Text>
            <Pressable
              onPress={() => setNotificationModalVisible(true)}
              style={({ pressed }) => [
                styles.selectorButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorButtonText, { color: palette.text }]}>
                  {t('settings.notificationCenter')}
                </Text>
                <Text
                  style={[
                    styles.selectorButtonSubtext,
                    { color: palette.text, opacity: 0.65 },
                  ]}>
                  {t('settings.notificationCount', { count: enabledNotificationCount })}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <View
              style={[
                styles.toggleRow,
                { borderColor: palette.border, backgroundColor: palette.card },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: palette.text }]}>
                  {t('settings.waterReminder')}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: palette.text, marginTop: 6 }]}>
                  {t('settings.waterReminderDescription')}
                </Text>
              </View>
              <Switch
                value={waterReminderEnabled}
                onValueChange={toggleWaterReminder}
                trackColor={{ false: palette.border, true: palette.accent }}
                thumbColor={palette.card}
                ios_backgroundColor={palette.border}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('settings.account')}</Text>
            <Text style={[styles.accountWarning, { color: palette.text }]}>
              {t('settings.deleteAccountWarning')}
            </Text>
            <Pressable
              onPress={handleDeleteAccount}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text style={[styles.deleteButtonText, { color: palette.accent }]}>
                {t('settings.deleteAccount')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Button title={t('settings.signOut')} onPress={() => void signOut()} type="secondary" />
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
                {t('settings.language')}
              </Text>
              <ScrollView
                style={styles.selectorModalList}
                contentContainerStyle={styles.selectorModalListContent}
                showsVerticalScrollIndicator={false}>
                {LANGUAGE_OPTIONS.map((option) => {
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
                        {option.label}
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
        <Modal
          visible={notificationModalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setNotificationModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setNotificationModalVisible(false)} />
            <View
              style={[
                styles.selectorModal,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}>
              <View style={[styles.selectorModalHandle, { backgroundColor: palette.border }]} />
              <Text style={[styles.selectorModalTitle, { color: palette.text }]}>
                {t('settings.notificationCenter')}
              </Text>
              <ScrollView
                style={styles.selectorModalList}
                contentContainerStyle={styles.selectorModalListContent}
                showsVerticalScrollIndicator={false}>
                {notificationTypeOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => toggleNotificationType(option.key)}
                    style={({ pressed }) => [
                      styles.notificationItem,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.card,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}>
                    <Text style={[styles.notificationItemText, { color: palette.text }]}>
                      {option.label}
                    </Text>
                    <Switch
                      value={notificationTypes[option.key]}
                      onValueChange={() => toggleNotificationType(option.key)}
                      trackColor={{ false: palette.border, true: palette.accent }}
                      thumbColor={palette.card}
                      ios_backgroundColor={palette.border}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  card: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
  },
  subheading: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginTop: 22,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectorButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  selectorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorButtonSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    marginBottom: 12,
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectorModalList: {
    maxHeight: 320,
  },
  selectorModalListContent: {
    paddingBottom: 16,
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
  notificationItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  notificationItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
  },
  profileRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileRowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileRowChevron: {
    fontSize: 20,
    fontWeight: '700',
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountWarning: {
    fontSize: 13,
    marginTop: 6,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
