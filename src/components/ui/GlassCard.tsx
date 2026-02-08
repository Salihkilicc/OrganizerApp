import { useTheme } from '@/store/useTheme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
    children?: React.ReactNode;
    intensity?: number;
}

export function GlassCard({ children, style, intensity = 50, ...props }: GlassCardProps) {
    const { palette } = useTheme();

    // On Android, BlurView support varies. Fallback to just the translucent background if needed.
    // Expo BlurView works on Android now, but let's be safe with overflow hidden.

    return (
        <BlurView
            intensity={intensity}
            tint="dark" // Using 'dark' tint as we are in a Dark AI theme context, helps text pop.
            style={[
                styles.container,
                {
                    backgroundColor: palette.card,
                    borderColor: 'rgba(255, 255, 255, 0.2)', // Slightly stronger border for glass effect
                },
                style,
            ]}
            {...props}
        >
            {children}
        </BlurView>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
});
