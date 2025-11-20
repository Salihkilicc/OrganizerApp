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
          <View style={styles.avatarColumn}>
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
          <View style={styles.headerRightColumn}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.backButton,
                styles.backButtonSpacing,
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
        </View>

        <View
          style={[
            styles.sectionStack,
            { borderColor: palette.border, backgroundColor: palette.card },
          ]}>
          <View style={[styles.sectionStackRow, styles.sectionStackColumn]}>
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
              styles.sectionStackRow,
              styles.sectionStackColumn,
              { borderTopWidth: 1, borderColor: palette.border },
            ]}>
            <Text style={[styles.fieldLabel, { color: palette.text }]}>{t('profile.email')}</Text>
            <View
              style={[
                styles.infoRow,
                styles.infoRowCompact,
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
              styles.sectionStackRow,
              styles.sectionStackLastRow,
              {
                borderTopWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.card,
              },
            ]}>
            <Text style={[styles.passwordText, { color: palette.text }]}>
              {t('profile.changePassword')}
            </Text>
            <Text style={[styles.passwordText, { color: palette.accent }]}>›</Text>
          </Pressable>
        </View>

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
                { borderColor: palette.border, backgroundColor: palette.card, marginRight: scaleValue(10) },
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

const SIZE_SCALE = 0.9;
const scaleValue = (value: number) => value * SIZE_SCALE;
const AVATAR_BASE_SIZE = 112;
const AVATAR_SIZE = Math.round(AVATAR_BASE_SIZE * 1.5 * 0.9);
const AVATAR_RADIUS = AVATAR_SIZE / 2;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: scaleValue(16),
    paddingBottom: scaleValue(32),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: scaleValue(18),
  },
  avatarColumn: {
    marginRight: scaleValue(10),
  },
  backButton: {
    width: scaleValue(36),
    height: scaleValue(36),
    borderRadius: scaleValue(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  backButtonSpacing: {
    marginBottom: scaleValue(8),
  },
  backIcon: {
    fontSize: scaleValue(20),
    fontWeight: '700',
  },
  headerRightColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerStats: {
    alignItems: 'flex-end',
    marginBottom: scaleValue(6),
  },
  headerStatValue: {
    fontSize: scaleValue(13),
    fontWeight: '400',
  },
  headerStatSub: {
    fontSize: scaleValue(11),
    fontWeight: '400',
    marginTop: scaleValue(2),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: scaleValue(32),
    fontWeight: '700',
  },
  sectionStack: {
    borderWidth: 1,
    borderRadius: scaleValue(18),
    marginBottom: scaleValue(16),
    overflow: 'hidden',
    alignSelf: 'flex-start',
    width: '95%',
  },
  sectionStackRow: {
    paddingHorizontal: scaleValue(14),
    paddingVertical: scaleValue(10),
  },
  sectionStackColumn: {
    flexDirection: 'column',
  },
  sectionStackLastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: scaleValue(12),
    fontWeight: '600',
    marginBottom: scaleValue(6),
    textTransform: 'uppercase',
    letterSpacing: scaleValue(0.4),
  },
  textInput: {
    height: scaleValue(42),
    borderWidth: 1,
    borderRadius: scaleValue(12),
    paddingHorizontal: scaleValue(14),
    fontSize: scaleValue(14),
  },
  saveButton: {
    marginTop: scaleValue(10),
    alignSelf: 'flex-end',
  },
  saveText: {
    fontSize: scaleValue(13),
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: scaleValue(14),
    padding: scaleValue(10),
    borderWidth: 1,
  },
  infoRowCompact: {
    borderWidth: 0,
    paddingVertical: scaleValue(8),
    paddingHorizontal: scaleValue(10),
  },
  infoText: {
    flex: 1,
    marginRight: scaleValue(10),
  },
  infoLabel: {
    fontSize: scaleValue(11),
    letterSpacing: scaleValue(0.5),
    marginBottom: scaleValue(2),
  },
  infoValue: {
    fontSize: scaleValue(15),
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: scaleValue(6),
    paddingVertical: scaleValue(2),
  },
  changeText: {
    fontSize: scaleValue(12),
    fontWeight: '600',
  },
  passwordText: {
    fontSize: scaleValue(15),
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: scaleValue(12),
  },
  sectionTitle: {
    fontSize: scaleValue(15),
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
    borderRadius: scaleValue(14),
    paddingHorizontal: scaleValue(10),
    paddingVertical: scaleValue(6),
    marginRight: scaleValue(8),
    marginBottom: scaleValue(8),
  },
  badgeIcon: {
    fontSize: scaleValue(16),
    marginRight: scaleValue(6),
  },
  badgeLabel: {
    fontSize: scaleValue(13),
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: scaleValue(16),
    padding: scaleValue(12),
  },
  statsLabel: {
    fontSize: scaleValue(11),
    letterSpacing: scaleValue(0.4),
    textTransform: 'uppercase',
    marginBottom: scaleValue(6),
    fontWeight: '600',
  },
  statsValue: {
    fontSize: scaleValue(15),
    fontWeight: '700',
  },
});
