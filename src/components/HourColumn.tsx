import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

const HOURS_PER_DAY = 24;
const HOUR_COPIES = 3;

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
  const hours = useMemo(
    () => Array.from({ length: normalizedEnd - normalizedStart }, (_, index) => normalizedStart + index),
    [normalizedEnd, normalizedStart],
  );
  const totalRows = hours.length * HOUR_COPIES;

  return (
    <View style={[styles.container, { height: totalRows * heightPerHour }]}>
      {Array.from({ length: totalRows }, (_, index) => {
        const hour = hours[index % hours.length];
        return (
          <View key={`${index}-${hour}`} style={[styles.row, { height: heightPerHour }]}>
            <View style={[styles.line, { backgroundColor: palette.border }]} />
            <Text style={[styles.label, { color: palette.text }]}>
              {hour.toString().padStart(2, '0')}:00
            </Text>
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
