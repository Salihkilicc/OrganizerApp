import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/store/useTheme';
import { useLanguage, LANGUAGE_OPTIONS, LANGUAGE_LABELS } from '@/store/useLanguage';
import { useTranslation } from '@/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const palette = useTheme((state) => state.palette);
  const currentLanguage = useLanguage((state) => state.current);
  const setLanguage = useLanguage((state) => state.setLanguage);
  const { t } = useTranslation();

  const handleSelect = (code: typeof LANGUAGE_OPTIONS[number]['code']) => {
    setLanguage(code);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              {
                borderColor: palette.border,
                backgroundColor: palette.card,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.backIcon, { color: palette.text }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>{t('language.title')}</Text>
        </View>
        <Text style={[styles.subtitle, { color: palette.text, marginBottom: 12 }]}>
          {t('language.current')}: {LANGUAGE_LABELS[currentLanguage]}
        </Text>

        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.code === currentLanguage;
          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelect(option.code)}
              style={({ pressed }) => [
                styles.languageRow,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.languageLabel,
                  { color: isActive ? palette.accent : palette.text },
                ]}>
                {option.label}
              </Text>
              {isActive && (
                <Text style={[styles.checkmark, { color: palette.accent }]}>✓</Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  languageRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
  },
});
