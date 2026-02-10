import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';
import { GlassCard } from './GlassCard';

interface CoachmarkProps {
    visible: boolean;
    text: string;
    onDismiss: () => void;
    targetPosition: {
        top: number;
        left?: number;
        right?: number;
    };
}

export function Coachmark({ visible, text, onDismiss, targetPosition }: CoachmarkProps) {
    const { palette, themeKey } = useTheme();
    const pulseScale = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Fade in animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Pulsing circle animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseScale, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseScale, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            // Fade out animation
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, pulseScale, fadeAnim]);

    if (!visible) return null;

    const isDark = ['dark', 'ninja', 'midnight', 'neon', 'ocean', 'coffee', 'default'].includes(
        themeKey
    );

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                {/* Backdrop - dismisses on tap */}
                <Pressable style={styles.backdrop} onPress={onDismiss} />

                {/* Pulsing Circle */}
                <Animated.View
                    style={[
                        styles.pulsingCircle,
                        {
                            top: targetPosition.top,
                            left: targetPosition.left,
                            right: targetPosition.right,
                            backgroundColor: palette.accent,
                            transform: [{ scale: pulseScale }],
                        },
                    ]}
                />

                {/* Instruction Bubble */}
                <View
                    style={[
                        styles.bubbleContainer,
                        {
                            top: targetPosition.top - 100, // Position above the circle
                            left: targetPosition.left !== undefined ? targetPosition.left - 60 : undefined,
                            right: targetPosition.right !== undefined ? targetPosition.right - 60 : undefined,
                        },
                    ]}
                >
                    <GlassCard style={styles.bubble}>
                        <Text
                            style={[
                                styles.bubbleText,
                                { color: isDark ? '#fff' : palette.text },
                            ]}
                        >
                            {text}
                        </Text>
                        <Pressable onPress={onDismiss} style={styles.dismissButton}>
                            <Text style={[styles.dismissText, { color: palette.accent }]}>Got it!</Text>
                        </Pressable>
                    </GlassCard>

                    {/* Pointer Arrow */}
                    <View
                        style={[
                            styles.pointer,
                            {
                                backgroundColor: palette.card,
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                            },
                        ]}
                    />
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    pulsingCircle: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        opacity: 0.3,
    },
    bubbleContainer: {
        position: 'absolute',
        width: 240,
        alignItems: 'center',
    },
    bubble: {
        padding: 16,
        alignItems: 'center',
    },
    bubbleText: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
    },
    dismissButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    dismissText: {
        fontSize: 14,
        fontWeight: '700',
    },
    pointer: {
        width: 20,
        height: 20,
        transform: [{ rotate: '45deg' }],
        marginTop: -10,
        borderWidth: 1,
        borderTopWidth: 0,
        borderLeftWidth: 0,
    },
});
