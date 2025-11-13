import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusMode } from '@/store/useFocusMode';
import { useTheme } from '@/store/useTheme';

const DEFAULT_MINUTES = 30;
const EXTEND_MINUTES = 15;
const MINUTE_MS = 60 * 1000;

type FocusModeOverlayProps = {
  visible: boolean;
  onClose: () => void;
};

export function FocusModeOverlay({ visible, onClose }: FocusModeOverlayProps) {
  const { palette } = useTheme();
  const { active, remainingMinutes, lastTickAt, startedAt, start, exit, addMinutes } =
    useFocusMode();
  const wasActiveRef = useRef(false);
  const [tickTime, setTickTime] = useState(() => Date.now());

  useEffect(() => {
    if (visible && !active) {
      start(DEFAULT_MINUTES);
    }
  }, [active, start, visible]);

  useEffect(() => {
    if (!visible) {
      wasActiveRef.current = false;
      return;
    }

    if (active) {
      wasActiveRef.current = true;
      return;
    }

    if (wasActiveRef.current && !active) {
      wasActiveRef.current = false;
      onClose();
    }
  }, [active, onClose, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTickTime(Date.now());
    const intervalId = setInterval(() => {
      setTickTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [visible]);

  const handleExit = () => {
    exit();
    onClose();
  };

  const handleExtend = () => addMinutes(EXTEND_MINUTES);

  const lastTick = lastTickAt ?? startedAt ?? tickTime;
  const elapsedMs = Math.min(
    MINUTE_MS,
    Math.max(0, tickTime - lastTick),
  );
  const totalMsRemaining = Math.max(0, remainingMinutes * MINUTE_MS - elapsedMs);
  const displayMinutes = Math.floor(totalMsRemaining / MINUTE_MS);
  const displaySeconds = Math.floor((totalMsRemaining % MINUTE_MS) / 1000);
  const countdown = `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(
    2,
    '0',
  )}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleExit}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.card, { backgroundColor: palette.card }]}>
            <Text style={[styles.title, { color: palette.text }]}>Focus mode engaged</Text>
            <Text style={[styles.description, { color: palette.text }]}>
              This app can’t block calls or system notifications. For full silence, also enable your
              phone’s Focus / Do Not Disturb mode.
            </Text>
            <Text style={[styles.countdown, { color: palette.text }]}>{countdown}</Text>
            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleExit}
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.background,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}>
                <Text style={[styles.buttonLabel, { color: palette.text }]}>Exit mode</Text>
              </Pressable>
              <Pressable
                onPress={handleExtend}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  {
                    backgroundColor: palette.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                <Text style={[styles.buttonLabel, { color: palette.background }]}>Add +15 minutes</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '100%',
    padding: 16,
  },
  card: {
    marginHorizontal: 12,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  countdown: {
    fontSize: 64,
    fontWeight: '700',
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
});
