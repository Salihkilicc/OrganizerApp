import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/store/useTheme';
import { useI18n } from '@/i18n/useI18n';

export default function TermsScreen() {
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
            {t((d) => d.legal.termsTitle)}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.lead, { color: palette.text }]}>
          {t((d) => d.legal.termsIntro)}
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          Acceptable Use
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          These placeholder terms outline how you may use Planora: AI Organizer. Use the app for
          personal productivity, keep your login details secure, and avoid activities that disrupt
          other users or our services.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          Accounts and Access
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          You are responsible for maintaining the confidentiality of your credentials and for any
          activity within your account. If you suspect unauthorized access, please reach out to our
          support team so we can assist you promptly.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          Service Availability
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          We aim to keep Planora available and reliable. Downtime or maintenance may happen
          occasionally; we will work to restore full service as quickly as possible and minimize any
          interruptions to your planning and focus sessions.
        </Text>

        <Text style={[styles.sectionHeading, { color: palette.text }]}>
          Changes to These Terms
        </Text>
        <Text style={[styles.paragraph, { color: palette.text }]}>
          As the product evolves, we may update these terms. We will notify you of significant
          changes, and your continued use after updates indicates acceptance of the revised terms.
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
