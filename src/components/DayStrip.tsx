import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';

type Props = {
  selected: string;
  year: number;
  month: number;
  onSelect: (dateISO: string) => void;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const toISO = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const DayStrip = memo(function DayStrip({ selected, year, month, onSelect }: Props) {
  const { palette } = useTheme();
  const todayISO = useMemo(() => toISO(new Date()), []);
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    [daysInMonth, month, year],
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {days.map((day) => {
          const iso = toISO(day);
          const isSelected = iso === selected;
          const isToday = iso === todayISO;
          const textColor = isSelected ? palette.background : palette.text;
          return (
            <Pressable
              key={iso}
              onPress={() => onSelect(iso)}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: isSelected ? palette.accent : palette.card,
                  borderColor: isSelected ? 'transparent' : palette.border,
                  shadowColor: palette.accent,
                  shadowOpacity: isSelected ? 0.3 : 0.12,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: isSelected ? 14 : 6,
                  elevation: isSelected ? 6 : 3,
                },
                pressed && styles.dayPressed,
              ]}>
              <Text style={[styles.weekday, { color: textColor }]}>
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text style={[styles.date, { color: textColor }]}>{day.getDate()}</Text>
              {!isSelected && isToday && (
                <View style={[styles.todayDot, { backgroundColor: palette.accent }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginTop: -8,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  day: {
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 18,
    borderWidth: 0,
    minWidth: 46,
    marginRight: 10,
  },
  dayPressed: {
    transform: [{ scale: 0.97 }],
  },
  weekday: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 15,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
