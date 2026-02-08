import { useTheme } from '@/store/useTheme';
import { gradients } from '@/styles/colors';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';

interface GradientBackgroundProps extends ViewProps {
    children: React.ReactNode;
}

export function GradientBackground({ children, style, ...props }: GradientBackgroundProps) {
    const { themeKey } = useTheme();
    const colors = gradients[themeKey] || gradients.default;

    return (
        <LinearGradient
            colors={colors}
            style={[styles.container, style]}
            {...props}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
});
