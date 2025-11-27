import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

type PopupProps = {
  visible: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode | string;
  onClose: () => void;
  actionLabel?: string;
  children?: React.ReactNode;
};

const ANIMATION_DURATION = 200;

export function Popup({
  visible,
  title,
  description,
  icon,
  onClose,
  actionLabel = 'Close',
  children,
}: PopupProps) {
  const { palette } = useTheme();
  const [shouldRender, setShouldRender] = useState(visible);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  const isDark = useMemo(() => {
    const hex = palette.background.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.6;
  }, [palette.background]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [opacity, scale, visible]);

  if (!shouldRender) {
    return null;
  }

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <View style={[styles.iconBubble, { borderColor: palette.border, backgroundColor: palette.background }]}>
          <Text style={[styles.iconText, { color: palette.accent }]}>{icon}</Text>
        </View>
      );
    }
    return <View style={styles.iconBubble}>{icon}</View>;
  };

  return (
    <View style={styles.absoluteFill} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)',
            opacity,
          },
        ]}
      />
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              opacity,
              transform: [{ scale }],
            },
          ]}>
          {renderIcon()}
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: palette.text }]}>{description}</Text>
          ) : null}
          {children}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: palette.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[styles.actionText, { color: palette.background }]}>{actionLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
    elevation: 16,
  },
  iconBubble: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    elevation: 8,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 16,
    minWidth: 160,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
