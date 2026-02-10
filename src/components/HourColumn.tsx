import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/store/useTheme';
import { formatTime } from '@/utils/time';

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
  const { palette, themeKey } = useTheme();
  const is24Hour = useSettings((state) => state.is24Hour);
  const heightPerHour = 60 * pxPerMin;
  const normalizedStart = Math.max(0, Math.min(startHour, HOURS_PER_DAY));
  const normalizedEnd = Math.max(normalizedStart + 1, Math.min(endHour, HOURS_PER_DAY));

  // Create array of hours [0, 1, ..., 24]
  const hours = useMemo(
    () => Array.from({ length: normalizedEnd - normalizedStart + 1 }, (_, index) => normalizedStart + index),
    [normalizedEnd, normalizedStart],
  );

  const getAmPmInfo = (hour: number) => {
    if (is24Hour) return null;

    const isAM = hour < 12;
    const period = isAM ? 'AM' : 'PM';
    const color = themeKey === 'light'
      ? (isAM ? '#7c3aed' : '#2563eb') // Purple for AM, Blue for PM in light mode
      : palette.text; // Default text color in dark mode

    return { period, color };
  };

  return (
    <View style={[styles.container, { height: hours.length * heightPerHour }]}>
      {hours.map((hour) => {
        // Only show label if it's <= 24
        const showLabel = hour <= 24;
        const minutes = hour * 60;
        const timeString = formatTime(minutes, is24Hour);
        const amPmInfo = getAmPmInfo(hour);

        // Split time and AM/PM for 12h format
        let displayTime = timeString;
        let showAmPm = false;

        if (!is24Hour && amPmInfo) {
          // Remove AM/PM from the time string
          displayTime = timeString.replace(/ (AM|PM)$/, '');
          showAmPm = true;
        }

        return (
          <View key={hour} style={[styles.row, { height: heightPerHour }]}>
            <View style={[styles.line, { backgroundColor: palette.border }]} />
            {showLabel && (
              <View style={styles.labelContainer}>
                <Text style={[styles.label, { color: palette.text }]}>
                  {displayTime}
                </Text>
                {showAmPm && amPmInfo && (
                  <Text style={[styles.amPmLabel, { color: amPmInfo.color }]}>
                    {amPmInfo.period}
                  </Text>
                )}
              </View>
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
  labelContainer: {
    marginLeft: 4,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  amPmLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
});
