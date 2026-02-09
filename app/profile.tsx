import { Popup } from '@/components/Popup';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { AVATAR_IMAGES } from '@/constants/avatars';
import { translations, type TranslationKeys } from '@/i18n/translations';
import { useI18n } from '@/i18n/useI18n';
import { getFrameDecoration } from '@/lib/frameStyles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/useAuth';
import { useAvatarStore } from '@/store/useAvatar';
import { usePlans } from '@/store/usePlans';
import { usePoints } from '@/store/usePoints';
import { useProfileAppearance } from '@/store/useProfileAppearance';
import { useShop } from '@/store/useShop';
import { useTheme } from '@/store/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { palette, themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const headerHeight = useHeaderHeight();
  const user = useAuth((state) => state.user);
  const setFromSession = useAuth((state) => state.setFromSession);
  const selectedAvatar = useAvatarStore((state) => state.selectedAvatar);
  const isDark = ['dark', 'ninja', 'midnight', 'neon', 'ocean', 'coffee', 'default'].includes(themeKey);

  // Animation Refs
  const avatarFade = React.useRef(new Animated.Value(0)).current;
  const achievementFade = React.useRef(new Animated.Value(0)).current;
  const profilePhoto =
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.avatar_url ||
    (user?.user_metadata as Record<string, string | undefined> | undefined)?.picture;
  const isGuest = useAuth((state) => state.isGuest);
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
      borderWidth: 2,
      borderColor: palette.accent,
      shadowColor: palette.accent,
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
    };
  const avatarSource = selectedAvatar
    ? AVATAR_IMAGES[selectedAvatar]
    : profilePhoto
      ? { uri: profilePhoto }
      : null;

  const fallbackName = isGuest
    ? t((d) => d.common.guestUser)
    : user?.email?.split('@')[0] ?? t((d) => d.common.user);
  const initialName = user?.user_metadata?.full_name ?? fallbackName;
  const initialEmail = user?.email ?? '';

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [achievementModalVisible, setAchievementModalVisible] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);

  useEffect(() => {
    setFullName(initialName);
  }, [initialName]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  // Handle Achievement Modal Animation
  useEffect(() => {
    if (achievementModalVisible) {
      achievementFade.setValue(0);
      Animated.timing(achievementFade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [achievementModalVisible]);

  const closeAchievementModal = () => {
    Animated.timing(achievementFade, {
      toValue: 0,
      duration: 100, // Even faster close
      useNativeDriver: true,
    }).start(() => setAchievementModalVisible(false));
  };

  useEffect(() => {
    setStatusMessage(null);
  }, [fullName, email]);

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

  const hydrateShop = useShop((state) => state.hydrate);
  const shopItems = useShop((state) => state.items);
  const badgeDetails =
    (translations[lang] ?? translations.en).points.badgeDetails as TranslationKeys['points']['badgeDetails'];
  const shopBadges = useMemo(
    () => shopItems.filter((item) => item.category === 'badge'),
    [shopItems],
  );

  // Icon mapping for badges
  const BADGE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    'badge-early-bird': { icon: 'rocket', color: '#FF6B6B' }, // Red/Orange
    'badge-night-owl': { icon: 'moon', color: '#6A5ACD' }, // Slate Blue
    'badge-streak-7': { icon: 'flame', color: '#FFD93D' }, // Yellow/Gold
    'badge-streak-30': { icon: 'bonfire', color: '#FF4500' }, // Orange Red
    'badge-focus-10': { icon: 'glasses', color: '#4D96FF' }, // Blue
    'badge-focus-50': { icon: 'eye', color: '#1E90FF' }, // Darker Blue
    'badge-plans-50': { icon: 'checkbox', color: '#6BCB77' }, // Green
    'badge-plans-200': { icon: 'list', color: '#2ECC71' }, // Emerald
    'badge-points-1000': { icon: 'star', color: '#FFD700' }, // Gold
    'badge-points-5000': { icon: 'trophy', color: '#00BFFF' }, // Diamond/Blue
    // Fallback
    'default': { icon: 'ribbon', color: '#A06CD5' },
  };

  const handleAvatarPress = () => {
    router.push('/points');
  };

  const storedName = (user?.user_metadata?.full_name ?? '').trim();
  const storedEmail = user?.email ?? '';
  const pendingName = fullName.trim();
  const pendingEmail = email.trim();
  const canEditProfile = Boolean(user?.id) && !isGuest;
  const hasProfileChanges =
    canEditProfile &&
    ((pendingName.length > 0 && pendingName !== storedName) ||
      (pendingEmail.length > 0 && pendingEmail !== storedEmail));

  const handleSaveProfile = async () => {
    if (!user || !canEditProfile) {
      Alert.alert(t((d) => d.common.error), t((d) => d.auth.loginError));
      return;
    }

    const nameChanged = pendingName.length > 0 && pendingName !== storedName;
    const emailChanged = pendingEmail.length > 0 && pendingEmail !== storedEmail;

    if (!nameChanged && !emailChanged) {
      setStatusMessage({
        type: 'success',
        text: t((d) => d.profile.saveNameMessage),
      });
      return;
    }

    if (emailChanged && !pendingEmail.includes('@')) {
      setStatusMessage({
        type: 'error',
        text: t((d) => d.auth.errors.fillAllFields),
      });
      return;
    }

    setSavingProfile(true);
    setStatusMessage(null);

    try {
      const payload: Parameters<typeof supabase.auth.updateUser>[0] = {};
      if (nameChanged) {
        payload.data = {
          ...(user.user_metadata ?? {}),
          full_name: pendingName,
        };
      }
      if (emailChanged) {
        payload.email = pendingEmail;
      }

      const { error } = await supabase.auth.updateUser(payload);
      if (error) {
        throw error;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && sessionData.session) {
        setFromSession(sessionData.session);
      }

      if (emailChanged) {
        setStatusMessage({
          type: 'success',
          text: t((d) => d.profile.changeEmailMessage, { email: pendingEmail }),
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: t((d) => d.profile.saveNameMessage),
        });
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t((d) => d.common.error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const showPasswordSuccessToast = () => {
    const successText = t((d) => d.profile.changePasswordTitle);
    if (Platform.OS === 'android') {
      ToastAndroid.show(successText, ToastAndroid.SHORT);
      return;
    }
    Alert.alert(successText);
  };

  const handlePasswordSubmit = async () => {
    if (!user || !canEditProfile) {
      Alert.alert(t((d) => d.common.error), t((d) => d.auth.loginError));
      return;
    }

    setPasswordError(null);
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || trimmedPassword.length < 8) {
      setPasswordError(t((d) => d.auth.errors.passwordTooShort));
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setPasswordError(t((d) => d.auth.errors.passwordMismatch));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: trimmedPassword });
      if (error) {
        throw error;
      }
      showPasswordSuccessToast();
      setPasswordModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : t((d) => d.common.error));
    } finally {
      setPasswordLoading(false);
    }
  };

  const closePasswordModal = () => {
    if (passwordLoading) return;
    setPasswordModalVisible(false);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  useEffect(() => {
    void hydrateShop();
  }, []);

  return (
    <GradientBackground>
      <View style={[styles.headerWrapper, { height: 60 + insets.top }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.headerContent, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)' },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={themeKey === 'light' ? '#1e1b4b' : '#fff'} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeKey === 'light' ? '#5b21b6' : '#fff' }]}>My Profile</Text>
          <View style={styles.headerRight}>
            <Text style={[styles.headerPointsLabel, { color: themeKey === 'light' ? '#2563eb' : '#fff' }]}>
              {totalPoints} <Text style={[styles.headerPointsSuffix, { color: themeKey === 'light' ? 'rgba(37, 99, 235, 0.6)' : 'rgba(255,255,255,0.8)' }]}>pts</Text>
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: 60 + insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Hero Profile Section */}
          <GlassCard intensity={40} style={[styles.heroCard, { backgroundColor: themeKey === 'light' ? 'rgba(248, 248, 250, 0.9)' : 'rgba(255,255,255,0.05)' }]}>
            <Pressable
              onPress={handleAvatarPress}
              style={[styles.avatarContainer, avatarFrameStyle]}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitials, { color: palette.background }]}>{initials}</Text>
              )}
              <View style={[styles.editBadge, { backgroundColor: palette.accent }]}>
                <Ionicons name="pencil" size={12} color="white" />
              </View>
            </Pressable>

            <Text style={[styles.heroName, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>{fullName}</Text>
            <Text style={[styles.heroEmail, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(255,255,255,0.6)' }]}>{email}</Text>
            <View style={[styles.memberSinceContainer, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.1)' }]}>
              <Text style={[styles.memberSinceText, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.8)' : 'rgba(255,255,255,0.8)' }]}>
                {(() => {
                  const level = Math.floor(totalPoints / 500) + 1;
                  const getRank = (p: number) => {
                    if (p < 100) return 'Novice Planner';
                    if (p < 500) return 'Focus Initiate';
                    if (p < 1000) return 'Productivity Enthusiast';
                    if (p < 2500) return 'Task Master';
                    if (p < 5000) return 'Grand Architect';
                    return 'Time Lord';
                  };
                  return `Level ${level} • ${getRank(totalPoints)}`;
                })()}
              </Text>
            </View>

            {/* Profile Editing Inputs (Collapsible or Inline) */}
            {/* Use transparent inputs for editing */}
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t((d) => d.profile.name)}
                  placeholderTextColor={themeKey === 'light' ? 'rgba(30, 27, 75, 0.4)' : 'rgba(255,255,255,0.4)'}
                  editable={canEditProfile}
                  style={[styles.glassInput, { color: themeKey === 'light' ? '#1e1b4b' : '#fff', borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)', backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.03)' : 'rgba(0,0,0,0.2)' }]}
                />
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t((d) => d.profile.email)}
                  placeholderTextColor={themeKey === 'light' ? 'rgba(30, 27, 75, 0.4)' : 'rgba(255,255,255,0.4)'}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={canEditProfile}
                  style={[styles.glassInput, { color: themeKey === 'light' ? '#1e1b4b' : '#fff', borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)', backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.03)' : 'rgba(0,0,0,0.2)' }]}
                />
              </View>

              {statusMessage && (
                <Text style={[
                  styles.statusMessage,
                  { color: statusMessage.type === 'error' ? '#ff6b6b' : '#51cf66' }
                ]}>
                  {statusMessage.text}
                </Text>
              )}

              <View style={styles.actionButtons}>
                <Pressable
                  onPress={handleSaveProfile}
                  disabled={!hasProfileChanges || savingProfile}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: hasProfileChanges
                        ? palette.accent
                        : (themeKey === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)')
                    },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <Text style={[
                    styles.actionButtonText,
                    !hasProfileChanges && { color: themeKey === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }
                  ]}>
                    {savingProfile ? t((d) => d.common.loading) : t((d) => d.profile.saveName)}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setPasswordModalVisible(true)}
                  style={styles.passwordButton}
                >
                  <Text style={[styles.passwordButtonText, { color: themeKey === 'light' ? palette.accent : 'rgba(255,255,255,0.5)' }]}>{t((d) => d.profile.changePassword)}</Text>
                </Pressable>
              </View>
            </View>
          </GlassCard>

          {/* Social Hub */}
          <GlassCard intensity={30} style={[styles.socialCard, { paddingVertical: 16, backgroundColor: themeKey === 'light' ? 'rgba(248, 248, 250, 0.9)' : 'rgba(255,255,255,0.05)' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeKey === 'light' ? '#5b21b6' : '#fff' }]}>Community</Text>
              <View style={styles.onlineIndicator}>
                <View style={[styles.greenDot, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.2)' : 'rgba(255,255,255,0.2)' }]} />
                <Text style={[styles.onlineText, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(255,255,255,0.6)' }]}>0 Online</Text>
              </View>
            </View>

            <Pressable style={styles.friendRow} android_ripple={{ color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)' }}>
              {/* Circle 1: Person Add */}
              <View style={[styles.addFriendCircle, { borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.2)' : 'rgba(255,255,255,0.15)', backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="person-add" size={18} color={themeKey === 'light' ? '#1e1b4b' : 'rgba(255,255,255,0.8)'} />
              </View>

              {/* Circle 2: Plus */}
              <View style={[styles.addFriendCircle, { marginLeft: 4, borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.2)' : 'rgba(255,255,255,0.15)', backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="add" size={18} color={themeKey === 'light' ? '#1e1b4b' : 'rgba(255,255,255,0.8)'} />
              </View>

              {/* Circle 3: Plus */}
              <View style={[styles.addFriendCircle, { marginLeft: 4, borderColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.2)' : 'rgba(255,255,255,0.15)', backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="add" size={18} color={themeKey === 'light' ? '#1e1b4b' : 'rgba(255,255,255,0.8)'} />
              </View>

              <Text style={[styles.addFriendTextSmall, { color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(255,255,255,0.6)' }]}>Add friends</Text>
            </Pressable>
          </GlassCard>

          {/* Achievements Showcase */}
          <View style={styles.achievementsSection}>
            <Text style={[styles.sectionTitleWhite, { color: themeKey === 'light' ? '#5b21b6' : '#fff' }]}>Achievements</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScroll}
            >
              {shopBadges.map((badge) => {
                const locked = !badge.owned;
                const iconConfig = BADGE_ICONS[badge.id] || BADGE_ICONS.default;

                return (
                  <GlassCard
                    key={badge.id}
                    intensity={20}
                    style={[
                      styles.achievementCard,
                      locked && styles.achievementCardLocked,
                      {
                        backgroundColor: themeKey === 'light'
                          ? (locked ? `${iconConfig.color}10` : `${iconConfig.color}20`)
                          : 'rgba(255,255,255,0.05)'
                      }
                    ]}
                  >
                    <Pressable
                      style={{ flex: 1, justifyContent: 'space-between', width: '100%' }}
                      onPress={() => {
                        setSelectedAchievement({
                          ...badge,
                          title: badgeDetails[badge.id]?.title ?? badge.title,
                          description: badge.requirementDescription,
                          icon: iconConfig.icon,
                          color: iconConfig.color,
                          locked: locked
                        });
                        setAchievementModalVisible(true);
                      }}
                    >
                      <View style={[
                        styles.achievementIcon,
                        {
                          // Locked: Very subtle background of the color. Unlocked: Brighter background
                          backgroundColor: locked ? `${iconConfig.color}15` : `${iconConfig.color}40`,
                          // Locked: Dimmed border. Unlocked: Full bright color
                          borderColor: locked ? `${iconConfig.color}30` : iconConfig.color,
                          borderWidth: 1,
                          // Add glow effect for owned items
                          shadowColor: locked ? 'transparent' : iconConfig.color,
                          shadowOpacity: locked ? 0 : 0.5,
                          shadowRadius: 8,
                          elevation: locked ? 0 : 5,
                        }
                      ]}>
                        <Ionicons
                          name={iconConfig.icon}
                          size={24} // Slightly larger for better visibility
                          // Locked: Pale/Dimmed color. Unlocked: Bright color
                          color={locked ? `${iconConfig.color}60` : iconConfig.color}
                        />
                      </View>

                      {locked && (
                        <View style={{ position: 'absolute', top: 0, right: 0 }}>
                          <Ionicons name="lock-closed" size={14} color={themeKey === 'light' ? 'rgba(30, 27, 75, 0.4)' : 'rgba(255,255,255,0.4)'} />
                        </View>
                      )}

                      <View>
                        <Text
                          numberOfLines={2}
                          style={{
                            fontWeight: 'bold',
                            fontSize: 13,
                            color: themeKey === 'light' ? '#1e1b4b' : '#fff',
                            marginBottom: 4,
                            height: 32, // Fixed height for alignment
                            textAlign: 'center'
                          }}
                        >
                          {badgeDetails[badge.id]?.title ?? badge.title}
                        </Text>
                        <View style={[styles.progressBarBg, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.1)' }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: locked ? '0%' : '100%',
                                backgroundColor: iconConfig.color,
                                opacity: locked ? 0 : 1
                              }
                            ]}
                          />
                        </View>
                      </View>
                    </Pressable>
                  </GlassCard>
                );
              })}
            </ScrollView>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals remain mostly the same but could be styled better if needed, keeping simple for now to match request scope */}
      <Popup
        visible={avatarModalVisible}
        title={t((d) => d.points.profilePhotos)}
        description={t((d) => d.points.profilePhotosDescription)}
        icon="🖼️"
        actionLabel={t((d) => d.today.close)}
        onClose={() => setAvatarModalVisible(false)}
      />


      <Modal
        visible={passwordModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closePasswordModal}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t((d) => d.profile.changePassword)}
            </Text>
            <Text style={styles.modalDescription}>
              {t((d) => d.profile.changePasswordMessage)}
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t((d) => d.auth.passwordPlaceholder)}
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
              style={styles.glassInput}
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t((d) => d.auth.confirmPassword)}
              placeholderTextColor="rgba(255,255,255,0.4)"
              secureTextEntry
              style={[styles.glassInput, { marginTop: 10 }]}
            />
            {passwordError ? (
              <Text style={[styles.statusMessage, { color: '#ff6b6b' }]}>{passwordError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={closePasswordModal} style={[styles.modalButtonGhost, { backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.05)' }]}>
                <Text style={[styles.modalButtonGhostText, { color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>{t((d) => d.common.cancel)}</Text>
              </Pressable>
              <Pressable onPress={handlePasswordSubmit} style={[styles.modalButtonPrimary, { backgroundColor: palette.accent }]}>
                <Text style={styles.modalButtonPrimaryText}>
                  {passwordLoading ? t((d) => d.common.loading) : t((d) => d.profile.changePassword)}
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </Modal>
      <Modal
        visible={achievementModalVisible}
        animationType="none"
        transparent
        onRequestClose={closeAchievementModal}
      >
        <Animated.View style={{ flex: 1, opacity: achievementFade }}>
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: themeKey === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)' }]}
            onPress={closeAchievementModal}
          >
            <GlassCard style={[styles.modalCard, { backgroundColor: themeKey === 'light' ? 'rgba(255,255,255,0.95)' : undefined }]} intensity={themeKey === 'light' ? 60 : 40}>
              {selectedAchievement && (
                <View style={{ alignItems: 'center' }}>
                  <View style={[
                    styles.achievementIcon,
                    {
                      width: 80, height: 80, borderRadius: 40,
                      backgroundColor: selectedAchievement.locked
                        ? `${selectedAchievement.color}15`
                        : `${selectedAchievement.color}40`,
                      borderColor: selectedAchievement.locked
                        ? `${selectedAchievement.color}30`
                        : selectedAchievement.color,
                      borderWidth: 2,
                      shadowColor: selectedAchievement.locked ? 'transparent' : selectedAchievement.color,
                      shadowOpacity: selectedAchievement.locked ? 0 : 0.6,
                      shadowRadius: 15,
                      marginBottom: 20
                    }
                  ]}>
                    <Ionicons
                      name={selectedAchievement.icon}
                      size={40}
                      color={selectedAchievement.locked
                        ? `${selectedAchievement.color}60`
                        : selectedAchievement.color}
                    />
                  </View>

                  <Text style={[styles.modalTitle, { fontSize: 22, height: 'auto', color: themeKey === 'light' ? '#1e1b4b' : '#fff' }]}>
                    {selectedAchievement.title}
                  </Text>

                  <Text style={[styles.modalDescription, { marginTop: 10, color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.6)' : 'rgba(255,255,255,0.6)' }]}>
                    {selectedAchievement.description || "Unlock this achievement to earn rewards!"}
                  </Text>

                  {selectedAchievement.locked && (
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: themeKey === 'light' ? 'rgba(30, 27, 75, 0.05)' : 'rgba(255,255,255,0.05)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      marginTop: 10
                    }}>
                      <Ionicons name="lock-closed" size={14} color={themeKey === 'light' ? 'rgba(30, 27, 75, 0.5)' : 'rgba(255,255,255,0.5)'} style={{ marginRight: 6 }} />
                      <Text style={{ color: themeKey === 'light' ? 'rgba(30, 27, 75, 0.5)' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>Locked</Text>
                    </View>
                  )}
                </View>
              )}
            </GlassCard>
          </Pressable>
        </Animated.View>
      </Modal>

    </GradientBackground >
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerButton: {
    width: 48, // Wider
    height: 36, // Slightly shorter
    borderRadius: 12, // Rectangular with rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // Removed old header style
  backButton: {
    width: 40,
    height: 40,
  },
  backButtonCard: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerPointsLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800', // Bold as requested
    letterSpacing: 0.5,
  },
  headerPointsSuffix: {
    fontWeight: '400',
    fontSize: 12,
    opacity: 0.8,
  },

  // Hero Section
  heroCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a', // Dark border to separate from avatar
  },
  heroName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  memberSinceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  memberSinceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  editForm: {
    width: '100%',
    marginTop: 10,
  },
  inputRow: {
    marginBottom: 12,
  },
  glassInput: {
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    color: 'white',
    fontSize: 16,
  },
  statusMessage: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  passwordButton: {
    alignItems: 'center',
    padding: 8,
  },
  passwordButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },

  // Social Hub
  socialCard: {
    padding: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionTitleWhite: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 4,
    marginBottom: 12,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#51cf66', // Default green
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // gap: 0, // We use negative margins for overlap
  },
  addFriendCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  addFriendTextSmall: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '400', // Thin/Regular
    marginLeft: 12,
  },


  // Achievements
  achievementsSection: {
    marginBottom: 20,
  },
  achievementsScroll: {
    paddingRight: 20,
    gap: 12,
  },
  achievementCard: {
    width: 120,
    height: 140, // Square-ish
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  achievementCardLocked: {
    // opacity: 0.6, // Removed to keep the card visible, we dim content instead
    backgroundColor: 'rgba(255,255,255,0.03)', // Slightly darker bg for locked
  },
  achievementIcon: {
    width: 44, // Slightly larger container
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementTitle: {
    color: 'white',
    fontSize: 12, // Slightly smaller to fit 2 lines
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center', // Center text
    height: 32, // Fixed height for 2 lines
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    padding: 24,
    backgroundColor: '#1a1a1a', // Fallback
    borderRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButtonGhost: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalButtonGhostText: {
    color: 'white',
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontWeight: '600',
  },
});
