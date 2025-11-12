import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

type Props = {
  startHour?: number;
  endHour?: number;
  pxPerMin?: number;
};

export const HourColumn = memo(function HourColumn({
  startHour = 6,
  endHour = 24,
  pxPerMin = 1,
}: Props) {
  const { palette } = useTheme();
  const heightPerHour = 60 * pxPerMin;
  const hours = useMemo(() => {
    return Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
  }, [startHour, endHour]);

  return (
    <View style={[styles.container, { height: (endHour - startHour) * heightPerHour }]}>
      {hours.map((hour) => (
        <View key={hour} style={[styles.row, { height: heightPerHour }]}>
          <View style={[styles.line, { backgroundColor: palette.border }]} />
          <Text style={[styles.label, { color: palette.text }]}>
            {hour.toString().padStart(2, '0')}:00
          </Text>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 60,
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
    marginLeft: 6,
    fontSize: 10,
    color: '#888',
  },
});
