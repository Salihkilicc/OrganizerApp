import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/store/useTheme';

const { width } = Dimensions.get('window');

const slides = [
    {
        icon: 'sparkles' as const,
        title: 'Smart Planning',
        description: 'Generate your perfect schedule in seconds with AI.',
        gradient: ['#6a11cb', '#2575fc'],
    },
    {
        icon: 'water' as const,
        title: 'Focus & Health',
        description: 'Deep work with Focus Mode & track your hydration.',
        gradient: ['#11998e', '#38ef7d'],
    },
    {
        icon: 'trophy' as const,
        title: 'Shop & Themes',
        description: 'Earn points, unlock themes, and level up.',
        gradient: ['#f857a6', '#ff5858'],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { palette } = useTheme();
    const completeOnboarding = useSettings((state) => state.completeOnboarding);
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    const handleGetStarted = () => {
        completeOnboarding();
        router.replace('/(auth)/login');
    };

    const isLastSlide = currentSlide === slides.length - 1;
    const slide = slides[currentSlide];

    return (
        <GradientBackground style={{ flex: 1 }}>
            <SafeAreaView style={styles.safe}>
                <View style={styles.container}>
                    {/* Slide Indicators */}
                    <View style={styles.indicators}>
                        {slides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.indicator,
                                    {
                                        backgroundColor:
                                            index === currentSlide
                                                ? palette.accent
                                                : 'rgba(255, 255, 255, 0.3)',
                                        width: index === currentSlide ? 24 : 8,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Content Card */}
                    <GlassCard style={styles.card}>
                        <View style={styles.iconContainer}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    {
                                        backgroundColor: palette.accent,
                                    },
                                ]}
                            >
                                <Ionicons name={slide.icon} size={64} color="#fff" />
                            </View>
                        </View>

                        <Text style={[styles.title, { color: palette.text }]}>{slide.title}</Text>
                        <Text style={[styles.description, { color: palette.text, opacity: 0.8 }]}>
                            {slide.description}
                        </Text>
                    </GlassCard>

                    {/* Navigation Button */}
                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[
                                styles.button,
                                {
                                    backgroundColor: palette.accent,
                                },
                            ]}
                            onPress={isLastSlide ? handleGetStarted : handleNext}
                        >
                            <Text style={styles.buttonText}>
                                {isLastSlide ? 'Get Started' : 'Next'}
                            </Text>
                            <Ionicons
                                name={isLastSlide ? 'checkmark' : 'arrow-forward'}
                                size={20}
                                color="#fff"
                                style={styles.buttonIcon}
                            />
                        </Pressable>
                    </View>
                </View>
            </SafeAreaView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingVertical: 40,
        justifyContent: 'space-between',
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    indicator: {
        height: 8,
        borderRadius: 4,
    },
    card: {
        flex: 1,
        paddingVertical: 60,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 40,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: '500',
    },
    buttonContainer: {
        marginTop: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 32,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    buttonIcon: {
        marginLeft: 8,
    },
});
