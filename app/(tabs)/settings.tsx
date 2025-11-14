import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { type ThemeKey, useTheme } from '@/store/useTheme';
import { useAuth } from '@/store/useAuth';
import { useI18n } from '@/store/useI18n';
import { useT } from '@/i18n';
import type { Lang } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { usePoints } from '@/store/usePoints';
import { useRouter } from 'expo-router';

const themeOptions: ThemeKey[] = ['light', 'dark', 'ninja'];
const languageOptions: Lang[] = ['tr', 'en'];
const themeLabelMap: Record<ThemeKey, 'lightTheme' | 'darkTheme' | 'ninjaTheme'> = {
  light: 'lightTheme',
  dark: 'darkTheme',
  ninja: 'ninjaTheme',
};


export default function SettingsScreen() {
  const palette = useTheme((state) => state.palette);
  const themeKey = useTheme((state) => state.themeKey);
  const setTheme = useTheme((state) => state.setTheme);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { lang, change } = useI18n();
  const t = useT();
  const totalPoints = usePoints((state) => state.total);

  const isGuest = Boolean(user && 'guest' in user && user.guest);
  const userLabel = isGuest ? 'guest' : (user && (user as any).email) ?? 'guest';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.header}>
          <Text style={[styles.heading, { color: palette.text }]}>Settings</Text>
          <Text style={[styles.subheading, { color: palette.text }]}>{userLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('theme')}</Text>
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
          <Text style={[styles.sectionLabel, { color: palette.text }]}>{t('language')}</Text>
          <View style={styles.optionRow}>
            {languageOptions.map((option) => {
              const isActive = option === lang;
              const label = option === 'tr' ? 'Türkçe' : 'English';
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    void change(option);
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
                    {label}
                  </Text>
                </Pressable>
              );
            })}
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
            <Text style={[styles.pointsRowLabel, { color: palette.text }]}>Points</Text>
            <Text style={[styles.pointsRowValue, { color: palette.accent }]}>{totalPoints} XP</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Button title={t('signOut')} onPress={() => void signOut()} type="secondary" />
        </View>
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
  pointsRowValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 30,
  },
});
