import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { useI18n } from '@/i18n';
import { useTheme } from '@/store/useTheme';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// --- Internal Compact Coachmark Component ---
const CompactCoachmark = ({ text, style, positionStyle }: any) => {
    const { palette } = useTheme();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={[styles.coachmarkContainer, positionStyle]}>
            {/* Smaller Pulsing Target */}
            <View style={styles.targetContainer}>
                <Animated.View style={[styles.pulseCircle, { borderColor: palette.accent, transform: [{ scale: pulseAnim }] }]} />
                <View style={[styles.solidCircle, { backgroundColor: palette.accent }]} />
            </View>

            {/* Compact Text Bubble */}
            <GlassCard style={styles.bubbleCard}>
                <Text style={[styles.bubbleText, { color: palette.text }]}>{text}</Text>
            </GlassCard>
        </View>
    );
};

export const WelcomeFlow = ({ visible, onComplete, userName, positions }: any) => {
    const { palette } = useTheme();
    const { t } = useI18n();
    const [step, setStep] = useState(0); // 0: Greeting, 1: AI, 2: Water, 3: Shop
    const [goalInput, setGoalInput] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
    }, [visible]);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                onComplete();
            });
        }
    };

    if (!visible) return null;

    const isGreetingStep = step === 0;

    return (
        <Modal visible transparent animationType="none">
            {/* Conditional Background: Dark only for step 0, Transparent for tour */}
            <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: isGreetingStep ? 'rgba(0,0,0,0.7)' : 'transparent' }]}>

                {/* STEP 0: Premium Greeting Modal */}
                {isGreetingStep && (
                    <View style={styles.greetingCenter}>
                        {Platform.OS === 'ios' && <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />}
                        <GlassCard style={styles.greetingCard}>
                            <Text style={[styles.greetingTitle, { color: palette.accent }]}>
                                {t(d => d.tour.greetingTitle).replace('{name}', userName || 'there')}
                            </Text>
                            <Text style={[styles.greetingSubtitle, { color: palette.text }]}>
                                {t(d => d.tour.greetingSubtitle)}
                            </Text>

                            <TextInput
                                style={[styles.glassInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
                                placeholder={t(d => d.tour.goalPlaceholder)}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={goalInput}
                                onChangeText={setGoalInput}
                            />

                            <Button title={t(d => d.tour.startTour)} onPress={handleNext} style={{ marginTop: 20, width: '100%' }} />
                        </GlassCard>
                    </View>
                )}

                {/* TOUR STEPS: Compact Coachmarks (Click anywhere to advance) */}
                {!isGreetingStep && (
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
                        {step === 1 && (
                            <CompactCoachmark
                                text={t(d => d.tour.homeAI)}
                                positionStyle={positions?.ai || { top: 180, alignSelf: 'center' }}
                            />
                        )}
                        {step === 2 && (
                            <CompactCoachmark
                                text={t(d => d.tour.homeWater)}
                                positionStyle={positions?.water || { top: height / 2 - 50, alignSelf: 'center' }}
                            />
                        )}
                        {step === 3 && (
                            <CompactCoachmark
                                text={t(d => d.tour.homeShop)}
                                positionStyle={positions?.shop || { bottom: 120, alignSelf: 'center' }}
                            />
                        )}
                    </Pressable>
                )}
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    // Greeting Styles
    greetingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 1000 },
    greetingCard: { width: '100%', maxWidth: 400, padding: 28, alignItems: 'center' },
    greetingTitle: { fontSize: 32, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
    greetingSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, opacity: 0.8, lineHeight: 22 },
    glassInput: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        fontSize: 16,
        textAlign: 'center',
    },

    // Compact Coachmark Styles
    coachmarkContainer: { position: 'absolute', alignItems: 'center', maxWidth: 200, zIndex: 999 },
    targetContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    pulseCircle: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2, opacity: 0.6 },
    solidCircle: { width: 12, height: 12, borderRadius: 6 },
    bubbleCard: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
    bubbleText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
});
