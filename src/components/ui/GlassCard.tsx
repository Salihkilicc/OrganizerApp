import { useTheme } from '@/store/useTheme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
    children?: React.ReactNode;
    intensity?: number;
}

export function GlassCard({ children, style, intensity = 50, ...props }: GlassCardProps) {
    const { palette, themeKey } = useTheme();

    // Determine tint based on theme
    const isLightTheme = ['light', 'classic', 'sunset', 'sakura', 'minimal'].includes(themeKey);
    const tint = isLightTheme ? 'light' : 'dark';

    // Border color based on theme
    const borderColor = isLightTheme
        ? 'rgba(0, 0, 0, 0.08)'
        : 'rgba(255, 255, 255, 0.2)';

    return (
        <BlurView
            intensity={intensity}
            tint={tint}
            style={[
                styles.container,
                {
                    backgroundColor: palette.card,
                    borderColor,
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
