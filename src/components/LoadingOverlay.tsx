import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type LoadingOverlayProps = {
  visible: boolean;
  label?: string;
};

export function LoadingOverlay({ visible, label = 'Generating your plan…' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="auto">
      <View style={[styles.blur, styles.blurFallback]} />
      <View style={styles.content}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 20,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  blurFallback: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 220,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 10,
  },
});

export default LoadingOverlay;
