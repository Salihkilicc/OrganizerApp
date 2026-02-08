import { GlassCard } from '@/components/ui/GlassCard';
import { gradients } from '@/styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type AiLimitOverlayProps = {
    visible: boolean;
    onWatchAd: () => void;
    onGoPremium: () => void;
    onClose: () => void;
};

export function AiLimitOverlay({
    visible,
    onWatchAd,
    onGoPremium,
    onClose,
}: AiLimitOverlayProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, fadeAnim, scaleAnim]);

    if (!visible) return null;

    return (
        <View style={styles.overlayContainer} pointerEvents="box-none">
            <View style={StyleSheet.absoluteFill}>
                {/* Darker backdrop for focus */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            opacity: fadeAnim,
                        },
                    ]}
                />

                {/* Content Container */}
                <View style={styles.container}>
                    <Animated.View
                        style={{
                            width: '100%',
                            maxWidth: 340,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        }}
                    >
                        <GlassCard style={styles.cardContent}>
                            {/* Header Icon */}
                            <View style={styles.iconContainer}>
                                <Ionicons name="sparkles" size={48} color="#FFFFFF" />
                            </View>

                            {/* Texts */}
                            <Text style={styles.title}>Unlock AI Power</Text>
                            <Text style={styles.subtitle}>
                                You've reached your free daily limit. Watch a short ad to continue or
                                unlock unlimited access with Premium.
                            </Text>

                            {/* Buttons */}
                            <View style={styles.buttonContainer}>
                                <Pressable
                                    onPress={onWatchAd}
                                    style={({ pressed }) => [
                                        styles.buttonWrapper,
                                        { opacity: pressed ? 0.9 : 1 },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={gradients.accentCard}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.gradientButton}
                                    >
                                        <Ionicons
                                            name="play-circle"
                                            size={22}
                                            color="#FFFFFF"
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={styles.primaryButtonText}>
                                            Watch Ad & Generate
                                        </Text>
                                    </LinearGradient>
                                </Pressable>

                                <Pressable
                                    onPress={onGoPremium}
                                    style={({ pressed }) => [
                                        styles.secondaryButton,
                                        { opacity: pressed ? 0.8 : 1 },
                                    ]}
                                >
                                    <Ionicons
                                        name="diamond-outline"
                                        size={20}
                                        color="#FFFFFF"
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text style={styles.secondaryButtonText}>Get Premium</Text>
                                </Pressable>

                                <Pressable
                                    onPress={onClose}
                                    style={({ pressed }) => [
                                        styles.cancelButton,
                                        { opacity: pressed ? 0.6 : 1 },
                                    ]}
                                >
                                    <Text style={styles.cancelText}>Maybe Later</Text>
                                </Pressable>
                            </View>
                        </GlassCard>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        elevation: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cardContent: {
        padding: 24,
        alignItems: 'center',
        borderRadius: 32,
    },
    iconContainer: {
        marginBottom: 20,
        padding: 16,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        color: 'rgba(255,255,255,0.8)',
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    buttonWrapper: {
        width: '100%',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    gradientButton: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    cancelButton: {
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 4,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.5)',
    },
});
