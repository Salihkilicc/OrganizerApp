import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

const HOURS_PER_DAY = 24;
const HOUR_COPIES = 1;

type Props = {
  startHour?: number;
  endHour?: number;
  pxPerMin?: number;
};

export const HourColumn = memo(function HourColumn({
  startHour = 0,
  endHour = HOURS_PER_DAY,
  pxPerMin = 1,
}: Props) {
  const { palette } = useTheme();
  const heightPerHour = 60 * pxPerMin;
  const normalizedStart = Math.max(0, Math.min(startHour, HOURS_PER_DAY));
  const normalizedEnd = Math.max(normalizedStart + 1, Math.min(endHour, HOURS_PER_DAY));

  // Create array of hours [0, 1, ..., 24]
  const hours = useMemo(
    () => Array.from({ length: normalizedEnd - normalizedStart + 1 }, (_, index) => normalizedStart + index),
    [normalizedEnd, normalizedStart],
  );

  return (
    <View style={[styles.container, { height: hours.length * heightPerHour }]}>
      {hours.map((hour) => {
        // Only show label if it's <= 24
        const showLabel = hour <= 24;
        return (
          <View key={hour} style={[styles.row, { height: heightPerHour }]}>
            <View style={[styles.line, { backgroundColor: palette.border }]} />
            {showLabel && (
              <Text style={[styles.label, { color: palette.text }]}>
                {hour.toString().padStart(2, '0')}:00
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 48,
    gap: 0,
  },
  row: {
    position: 'relative',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#999',
    opacity: 0.2,
  },
  label: {
    marginLeft: 4,
    fontSize: 10,
    color: '#888',
  },
});
