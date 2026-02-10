import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { useI18n } from '@/i18n';
import { useTheme } from '@/store/useTheme';

const { width, height } = Dimensions.get('window');

// --- Internal Compact Coachmark Component ---
const CompactCoachmark = ({ text, positionStyle, horizontal = false }: any) => {
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
        <View style={[styles.coachmarkContainer, positionStyle, horizontal && { flexDirection: 'row-reverse', alignItems: 'center' }]}>
            {/* Smaller Pulsing Target */}
            <View style={[styles.targetContainer, horizontal && { marginBottom: 0, marginLeft: 12 }]}>
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

interface PlanTourProps {
    visible: boolean;
    onComplete: () => void;
    positions?: {
        month: { top: number; left?: number; right?: number };
        day: { top: number; left?: number; right?: number };
        addFab: { bottom: number; left?: number; right?: number };
        ai: { top: number; left?: number; right?: number };
    };
}

export const PlanTour = ({ visible, onComplete, positions }: PlanTourProps) => {
    const { palette } = useTheme();
    const { t } = useI18n();
    const [step, setStep] = useState(1); // 1: Month, 2: Day, 3: Add FAB, 4: AI
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
    }, [visible]);

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                onComplete();
            });
        }
    };

    if (!visible) return null;

    return (
        <Modal visible transparent animationType="none">
            {/* Transparent Background for Tour */}
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

                {/* TOUR STEPS: Compact Coachmarks (Click anywhere to advance) */}
                <Pressable style={StyleSheet.absoluteFill} onPress={handleNext}>
                    {step === 1 && (
                        <CompactCoachmark
                            text={t(d => d.tour.planMonth)}
                            positionStyle={positions?.month || { top: 60, left: 20 }}
                        />
                    )}
                    {step === 2 && (
                        <CompactCoachmark
                            text={t(d => d.tour.planDay)}
                            positionStyle={positions?.day || { top: 120, left: width / 2 - 100 }}
                        />
                    )}
                    {step === 3 && (
                        <CompactCoachmark
                            text={t(d => d.tour.planAdd)}
                            positionStyle={positions?.addFab || { bottom: 100, right: 30 }}
                            horizontal={true}
                        />
                    )}
                    {step === 4 && (
                        <CompactCoachmark
                            text={t(d => d.tour.planAI)}
                            positionStyle={positions?.ai || { top: 60, right: 20 }}
                        />
                    )}
                </Pressable>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },

    // Compact Coachmark Styles
    coachmarkContainer: { position: 'absolute', alignItems: 'center', maxWidth: 200, zIndex: 999 },
    targetContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    pulseCircle: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2, opacity: 0.6 },
    solidCircle: { width: 12, height: 12, borderRadius: 6 },
    bubbleCard: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
    bubbleText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
});
