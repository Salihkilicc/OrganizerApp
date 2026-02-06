import { useTheme } from '@/store/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View
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
    const { palette, themeKey } = useTheme();
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
        <Modal
            visible={visible}
            transparent
            animationType="none" // we handle animation manually
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={StyleSheet.absoluteFill}>
                {/* Semi-transparent background */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            opacity: fadeAnim
                        }
                    ]}
                />

                {/* Content Container */}
                <View style={styles.container}>
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                backgroundColor: palette.card,
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        {/* Header Icon */}
                        <View style={styles.iconContainer}>
                            <Ionicons
                                name="star"
                                size={48}
                                color={themeKey === 'dark' || themeKey === 'ninja' || themeKey === 'midnight' ? '#FFD700' : palette.accent}
                            />
                        </View>

                        {/* Texts */}
                        <Text style={[styles.title, { color: palette.text }]}>
                            Unlock AI Plan
                        </Text>
                        <Text style={[styles.subtitle, { color: palette.text, opacity: 0.8 }]}>
                            Watch an ad for one-time access or Go Premium for unlimited power.
                        </Text>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <Pressable
                                onPress={onWatchAd}
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.primaryButton,
                                    {
                                        backgroundColor: palette.accent,
                                        opacity: pressed ? 0.9 : 1
                                    },
                                ]}
                            >
                                <Ionicons name="play-circle-outline" size={20} color={palette.card} style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, { color: palette.card, fontWeight: '700' }]}>
                                    Watch Ad & Generate
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={onGoPremium}
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.secondaryButton,
                                    {
                                        backgroundColor: palette.background,
                                        borderColor: palette.border,
                                        opacity: pressed ? 0.9 : 1
                                    },
                                ]}
                            >
                                <Ionicons name="diamond-outline" size={20} color={palette.text} style={{ marginRight: 8 }} />
                                <Text style={[styles.buttonText, { color: palette.text }]}>
                                    Get Premium
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={onClose}
                                style={({ pressed }) => [
                                    styles.cancelButton,
                                    { opacity: pressed ? 0.6 : 1 }
                                ]}
                            >
                                <Text style={[styles.cancelText, { color: palette.text, opacity: 0.6 }]}>
                                    Cancel
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 16,
        padding: 12,
        borderRadius: 50,
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        // Style handled in inline styles for color
    },
    secondaryButton: {
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 8,
        alignItems: 'center',
        marginTop: 4,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
