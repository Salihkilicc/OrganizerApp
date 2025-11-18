import { useState } from 'react';
import {
  Alert,
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
import { usePoints } from '@/store/usePoints';
import { useRouter } from 'expo-router';

const themeOptions: ThemeId[] = ['light', 'dark', 'ninja'];
const themeLabelMap: Record<ThemeId, 'lightTheme' | 'darkTheme' | 'ninjaTheme'> = {
  light: 'lightTheme',
  dark: 'darkTheme',
  ninja: 'ninjaTheme',
};

export default function SettingsScreen() {
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const palette = useTheme((state) => state.palette);
  const themeKey = useTheme((state) => state.themeKey);
  const setTheme = useTheme((state) => state.setTheme);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const totalPoints = usePoints((state) => state.total);
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
            <Pressable
              onPress={() => setLanguageExpanded((prev) => !prev)}
              style={({ pressed }) => [
                styles.languageToggle,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('settings.language')}</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.text }]}>
                  {t('settings.languageDescription')}
                </Text>
                <Text
                  style={[
                    styles.pointsRowSubtitle,
                    { color: palette.text, opacity: 0.7, marginTop: 6 },
                  ]}>
                  {t('language.current')}: {LANGUAGE_LABELS[currentLanguage]}
                </Text>
              </View>
              <Text style={[styles.languageChevron, { color: palette.text }]}>
                {languageExpanded ? '−' : '+'}
              </Text>
            </Pressable>
            {languageExpanded && (
              <View
                style={[
                  styles.languageFrame,
                  { backgroundColor: palette.background, borderColor: palette.border },
                ]}>
                {LANGUAGE_OPTIONS.map((option) => {
                  const isActive = option.code === currentLanguage;
                  return (
                    <Pressable
                      key={option.code}
                      onPress={() => handleSelectLanguage(option.code)}
                      style={({ pressed }) => [
                        styles.languageRow,
                        {
                          borderColor: palette.border,
                          backgroundColor: isActive ? palette.accent : palette.card,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.languageLabel,
                          {
                            color: isActive ? '#fff' : palette.text,
                          },
                        ]}>
                        {option.label}
                      </Text>
                      {isActive && (
                        <Text style={[styles.languageCheckmark, { color: '#fff' }]}>✓</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
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
            <View style={styles.notificationList}>
              {notificationTypeOptions.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => toggleNotificationType(option.key)}
                  style={({ pressed }) => [
                    styles.toggleRow,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.card,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}>
                  <Text style={[styles.toggleLabel, { color: palette.text }]}>{option.label}</Text>
                  <Switch
                    value={notificationTypes[option.key]}
                    onValueChange={() => toggleNotificationType(option.key)}
                    trackColor={{ false: palette.border, true: palette.accent }}
                    thumbColor={palette.card}
                    ios_backgroundColor={palette.border}
                  />
                </Pressable>
              ))}
            </View>
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
            <Pressable
              onPress={() => router.push('/points')}
              style={({ pressed }) => [
                styles.pointsRow,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Text style={[styles.pointsRowLabel, { color: palette.text }]}>
                {t('settings.pointsShop')}
              </Text>
              <Text style={[styles.pointsRowValue, { color: palette.accent }]}>{totalPoints} XP</Text>
            </Pressable>
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
  pointsRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsRowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointsRowSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  pointsRowValue: {
    fontSize: 16,
    fontWeight: '700',
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
  languageToggle: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageFrame: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  languageRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  languageCheckmark: {
    fontSize: 18,
    fontWeight: '700',
  },
  languageChevron: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: 12,
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
  notificationList: {
    marginTop: 6,
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
