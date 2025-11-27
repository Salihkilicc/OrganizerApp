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
          {t((d) => d.legal.privacyIntro)}
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          Information We Collect
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          This is a placeholder Privacy Policy for Planora: AI Organizer. We collect basic account
          details to create and maintain your profile, app usage data to improve your experience,
          and diagnostic logs to keep the service stable. No sensitive data is shared without your
          consent.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          How Your Data Is Used
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          We use the information you provide to deliver the app’s core functionality, personalize
          recommendations, and troubleshoot issues. Aggregated analytics help us understand which
          features you find valuable so we can prioritize improvements.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>Data Sharing</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          We do not sell your data. Limited sharing only occurs with trusted providers needed to
          operate the service, such as authentication, payments, or notifications—always under
          contractual safeguards and only what is necessary.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>Your Choices</Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          You can access or update your account details from the Profile and Settings screens at any
          time. If you wish to delete your account, you can request removal from the settings page
          and we will guide you through the process.
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
});
