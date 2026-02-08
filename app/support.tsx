import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useI18n } from '@/i18n/useI18n';
import { useTheme } from '@/store/useTheme';

const SUPPORT_EMAIL = 'planoraorganizer@gmail.com';

export default function SupportScreen() {
  const palette = useTheme((state) => state.palette);
  const themeKey = useTheme((state) => state.themeKey);
  const router = useRouter();
  const { t } = useI18n();

  const handleEmailPress = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                {
                  borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)',
                  backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.05)',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: themeKey === 'light' ? '#1e1b4b' : palette.text }]}>
              {t((d) => d.legal.supportTitle)}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <GlassCard style={styles.contentCard}>
            <Text style={[styles.lead, { color: themeKey === 'light' ? '#1e1b4b' : palette.text }]}>
              {t((d) => d.legal.supportIntro)}
            </Text>

            <Pressable
              onPress={handleEmailPress}
              style={({ pressed }) => [
                styles.emailButton,
                {
                  borderColor: palette.accent,
                  backgroundColor: palette.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <Ionicons name="mail-outline" size={20} color={themeKey === 'light' ? '#8b5cf6' : palette.accent} />
              <Text style={[styles.emailText, { color: themeKey === 'light' ? '#1e1b4b' : palette.accent }]}>{SUPPORT_EMAIL}</Text>
            </Pressable>

            <Text style={[styles.paragraph, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.7)' : palette.text }]}>
              {t((d) => d.legal.supportEmailLabel)}
            </Text>
            <Text style={[styles.paragraph, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.7)' : palette.text }]}>
              We typically respond within 1-2 business days. Please include any relevant screenshots or
              steps to reproduce issues, and feel free to share feature requests or general feedback so
              we can keep improving Planora.
            </Text>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 36,
  },
  contentCard: {
    padding: 24,
    borderRadius: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  lead: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 16,
  },
  emailButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
});
