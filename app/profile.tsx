import { type PlanCategory, usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { useAuth } from '@/store/useAuth';
import { useTheme } from '@/store/useTheme';
import { useRouter } from 'expo-router';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { getFrameDecoration } from '@/lib/frameStyles';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/i18n';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const palette = useTheme((state) => state.palette);
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
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

  const isGuest = Boolean(user && 'guest' in user && user.guest);
  const fallbackName = isGuest
    ? 'Guest User'
    : user?.email?.split('@')[0] ?? 'User';
  const initialName = user?.user_metadata?.full_name ?? user?.name ?? fallbackName;
  const [fullName, setFullName] = useState(initialName);

  useEffect(() => {
    setFullName(initialName);
  }, [initialName]);

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

  const displayEmail = isGuest ? 'guest' : user?.email ?? 'guest';
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

  const badgeDefinitions = useMemo(
    () => [
      { label: 'Starter', icon: '✨', unlocked: true },
      { label: 'Focus 60m', icon: '🎯', unlocked: totalPoints >= 60 },
      { label: 'Planner', icon: '📝', unlocked: blocks.length >= 3 },
      { label: 'Consistency', icon: '💡', unlocked: streakDays >= 5 },
    ],
    [blocks.length, streakDays, totalPoints],
  );

  const handleAvatarPress = () => {
    // TODO: integrate ImagePicker/photo library when ready.
    Alert.alert('Change photo', 'Not implemented yet.');
  };

  const handleEmailChange = () => {
    // TODO: wire up email change flow.
    Alert.alert('Change email', 'Email change is not implemented yet.');
  };

  const handlePasswordChange = () => {
    // TODO: wire up password update flow.
    Alert.alert('Change password', 'Password change is not implemented yet.');
  };

  const handleSaveName = () => {
    // TODO: persist name to backend/profile store.
    Alert.alert('Save name', 'Name persistence is not implemented yet.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
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
          <View style={styles.headerStats}>
            <Text style={[styles.headerStatValue, { color: palette.accent }]}>
              {t('profile.totalPoints')}: {totalPoints} pts
            </Text>
            <Text style={[styles.headerStatSub, { color: palette.text }]}>
              {t('profile.streak')}: {streakDays} {t('profile.days')}
            </Text>
          </View>
        </View>

        <View style={styles.avatarWrapper}>
          <Pressable
            onPress={handleAvatarPress}
            style={[
              styles.avatar,
              { backgroundColor: palette.accent },
              avatarFrameStyle,
            ]}>
            <Text style={[styles.avatarInitials, { color: palette.background }]}>{initials}</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.fieldLabel, { color: palette.text }]}>{t('profile.name')}</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('profile.name')}
            placeholderTextColor={palette.text + '99'}
            style={[
              styles.textInput,
              {
                borderColor: palette.border,
                backgroundColor: palette.background,
                color: palette.text,
              },
            ]}
          />
          <Pressable onPress={handleSaveName} style={styles.saveButton}>
            <Text style={[styles.saveText, { color: palette.accent }]}>{t('profile.saveName')}</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: palette.card, borderColor: palette.border },
          ]}>
          <Text style={[styles.fieldLabel, { color: palette.text }]}>{t('profile.email')}</Text>
          <View
            style={[
              styles.infoRow,
              { borderColor: palette.border, backgroundColor: palette.background },
            ]}>
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: palette.text }]}>{t('profile.current')}</Text>
              <Text style={[styles.infoValue, { color: palette.text }]} numberOfLines={1}>
                {displayEmail}
              </Text>
            </View>
            <Pressable onPress={handleEmailChange} style={styles.changeButton}>
              <Text style={[styles.changeText, { color: palette.accent }]}>
                {t('profile.changeEmail')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={handlePasswordChange}
          style={[
            styles.passwordRow,
            { borderColor: palette.border, backgroundColor: palette.card },
          ]}>
          <Text style={[styles.passwordText, { color: palette.text }]}>
            {t('profile.changePassword')}
          </Text>
          <Text style={[styles.passwordText, { color: palette.accent }]}>›</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('profile.badges')}</Text>
        </View>
        <View style={styles.badgesRow}>
          {badgeDefinitions.map((badge) => (
            <View
              key={badge.label}
              style={[
                styles.badge,
                {
                  borderColor: palette.border,
                  backgroundColor: badge.unlocked ? palette.card : palette.background,
                },
              ]}>
              <Text style={[styles.badgeIcon, { color: palette.accent }]}>{badge.icon}</Text>
              <Text
                style={[
                  styles.badgeLabel,
                  {
                    color: badge.unlocked ? palette.text : palette.border,
                  },
                ]}>
                {badge.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {t('profile.stats')}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statsCard,
              { borderColor: palette.border, backgroundColor: palette.card, marginRight: 10 },
            ]}>
            <Text style={[styles.statsLabel, { color: palette.text }]}>
              {t('profile.mostActiveCategory')}
            </Text>
            <Text style={[styles.statsValue, { color: palette.text }]}>
              {mostActiveCategory ? `${mostActiveCategory[0].toUpperCase()}${mostActiveCategory.slice(1)}` : 'None yet'}
            </Text>
          </View>
          <View
            style={[
              styles.statsCard,
              { borderColor: palette.border, backgroundColor: palette.card },
            ]}>
            <Text style={[styles.statsLabel, { color: palette.text }]}>
              {t('profile.totalFocusTime')}
            </Text>
            <Text style={[styles.statsValue, { color: palette.text }]}>{totalFocusMinutes} min</Text>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerStatSub: {
    fontSize: 14,
    marginTop: 4,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  infoText: {
    flex: 1,
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  passwordText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  badgeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  statsLabel: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontWeight: '600',
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
