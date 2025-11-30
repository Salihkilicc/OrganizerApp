import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';

export default function PrivacyScreen() {
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const { t } = useI18n();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            <Ionicons name="chevron-back" size={20} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {t((d) => d.legal.privacyTitle)}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.lead, { color: palette.text }]}>
          Privacy Policy for Planora: AI Organizer
        </Text>
        <Text style={[styles.paragraph, { color: palette.text, marginTop: 0 }]}>
          Last updated: 2025
        </Text>

        <Text style={[styles.paragraph, { color: palette.text }]}>
          Planora: AI Organizer (“the App”) respects your privacy. This Privacy Policy explains what
          data we collect, how we use it, and how it is protected.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          <Text style={styles.bold}>Account Information:</Text> Email address or third‑party login
          identifiers (Google/Apple) if you choose to sign in.{'\n\n'}
          <Text style={styles.bold}>Usage Data:</Text> App interactions such as creating tasks,
          plans, or using focus mode.{'\n\n'}
          <Text style={styles.bold}>Device Data:</Text> Device model, OS version, and crash logs (for app improvement).{'\n\n'}
          <Text style={styles.bold}>No Sensitive Data:</Text> We do not collect contacts, photos, messages, or location.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>2. How We Use Your Data</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          • To provide and improve app features.{'\n'}
          • To sync your plans and preferences across devices.{'\n'}
          • To generate AI-based plans when requested by you.{'\n'}
          • To ensure subscription and premium features work correctly.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>3. Third‑Party Services</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          The App uses the following services:{'\n'}
          • Supabase – authentication and cloud storage.{'\n'}
          • RevenueCat – subscription and purchase handling.{'\n'}
          • OpenAI – AI‑generated planning (your raw personal data is NOT shared).
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>4. Data Protection</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          Your data is stored securely using encrypted connections. We do not sell or share your
          personal data with advertisers.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>5. Your Rights</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          You may request deletion of your account.{'\n'}
          You may export your stored data anytime by contacting us.{'\n'}
          You may opt out of AI features and continue using the app normally.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>6. Contact Us</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          If you have questions, email us at: planoraorganizer@gmail.com
        </Text>
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
    paddingBottom: 36,
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
  },
});
