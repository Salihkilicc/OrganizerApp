import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

type Props = {
  selected: string;
  onSelect: (dateISO: string) => void;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const toISO = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfWeek = (date: Date) => {
  const diff = (date.getDay() + 6) % 7; // Monday = 0
  const next = new Date(date);
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const DayStrip = memo(function DayStrip({ selected, onSelect }: Props) {
  const { palette } = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(parseISO(selected)));
  const todayISO = useMemo(() => toISO(new Date()), []);

  useEffect(() => {
    setWeekStart(startOfWeek(parseISO(selected)));
  }, [selected]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [weekStart]);

  return (
    <View style={[styles.container, { borderColor: palette.border }]}>
      <Pressable
        style={({ pressed }) => [
          styles.arrow,
          pressed && { opacity: 0.65 },
          { borderColor: palette.border },
        ]}
        onPress={() => setWeekStart((prev) => offsetWeek(prev, -1))}>
        <Text style={[styles.arrowText, { color: palette.text }]}>‹</Text>
      </Pressable>
      <View style={styles.week}>
        {days.map((day) => {
          const iso = toISO(day);
          const isSelected = iso === selected;
          const isToday = iso === todayISO;
          return (
            <Pressable
              key={iso}
              onPress={() => onSelect(iso)}
              style={({ pressed }) => [
                styles.day,
                {
                  borderColor: palette.border,
                  backgroundColor: isSelected ? palette.accent : palette.card,
                },
                isToday && !isSelected && { borderWidth: 1, borderColor: palette.accent },
                pressed && { opacity: 0.75 },
              ]}>
              <Text
                style={[
                  styles.weekday,
                  { color: isSelected ? palette.background : palette.text },
                ]}>
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.date,
                  { color: isSelected ? palette.background : palette.text },
                ]}>
                {pad(day.getDate())}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.arrow,
          pressed && { opacity: 0.65 },
          { borderColor: palette.border },
        ]}
        onPress={() => setWeekStart((prev) => offsetWeek(prev, 1))}>
        <Text style={[styles.arrowText, { color: palette.text }]}>›</Text>
      </Pressable>
    </View>
  );
});

const parseISO = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const offsetWeek = (date: Date, weeks: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + weeks * 7);
  return startOfWeek(next);
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
  week: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 52,
  },
  weekday: {
    fontSize: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrow: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 6,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
