import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';
import type { PlanBlock } from '@/store/usePlans';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Props = {
  date: string;
  blocks: PlanBlock[];
  onEdit: (id: string) => void;
  onLongDelete?: (id: string) => void;
  pxPerMin?: number;
  step?: number;
  startHour?: number;
  endHour?: number;
};

export const PlanGrid = memo(function PlanGrid({
  date,
  blocks,
  onEdit,
  onLongDelete,
  pxPerMin = 1,
  step = 30,
  startHour = 6,
  endHour = 24,
}: Props) {
  const { palette } = useTheme();
  void date;
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const totalMinutes = endMin - startMin;
  const gridHeight = totalMinutes * pxPerMin;

  const sorted = useMemo(() => [...blocks].sort((a, b) => a.startMin - b.startMin), [blocks]);
  const lines = useMemo(() => {
    const segments: number[] = [];
    for (let min = 0; min <= totalMinutes; min += step) {
      segments.push(min);
    }
    return segments;
  }, [totalMinutes, step]);

  const scrollRef = useRef<ScrollView>(null);
  const initialScroll = useRef(false);

  useEffect(() => {
    if (initialScroll.current) return;
    initialScroll.current = true;
    const target = Math.max((8 - startHour) * 60 * pxPerMin, 0);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: target, animated: false });
    });
  }, [pxPerMin, startHour]);

  return (
    <View style={[styles.wrapper, { borderColor: palette.border }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ height: gridHeight }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled>
        <View style={[styles.grid, { height: gridHeight, backgroundColor: palette.background }]}>
          {lines.map((lineMin) => {
            const top = lineMin * pxPerMin;
            const isHour = lineMin % 60 === 0;
            return (
              <View
                key={`line-${lineMin}`}
                style={[
                  styles.line,
                  {
                    top,
                    backgroundColor: palette.border,
                    height: isHour ? 1.8 : 1,
                    opacity: isHour ? 0.35 : 0.18,
                  },
                ]}
              />
            );
          })}
          {sorted.map((blockProps) => {
            const top = clamp((blockProps.startMin - startMin) * pxPerMin, 0, gridHeight);
            const duration = Math.max(blockProps.endMin - blockProps.startMin, step);
            const height = clamp(duration * pxPerMin, step * pxPerMin, gridHeight - top);
            const handleLongPress = onLongDelete ? () => onLongDelete(blockProps.id) : undefined;

            return (
              <Pressable
                key={blockProps.id}
                onPress={() => onEdit(blockProps.id)}
                onLongPress={handleLongPress}
                style={[
                  styles.block,
                  {
                    top,
                    height,
                    backgroundColor: blockProps.color ?? palette.accent,
                    borderColor: palette.border,
                  },
                ]}>
                <View style={styles.textContainer} pointerEvents="none">
                  <Text style={[styles.title, { color: palette.background }]}>
                    {blockProps.title}
                  </Text>
                  <Text style={[styles.time, { color: palette.background }]}> 
                    {formatTime(blockProps.startMin)} – {formatTime(blockProps.endMin)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});

const formatTime = (minutes: number) => {
  const clamped = clamp(minutes, 0, 24 * 60);
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  const hourLabel = hour.toString().padStart(2, '0');
  const minuteLabel = minute.toString().padStart(2, '0');
  return `${hourLabel}:${minuteLabel}`;
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  grid: {
    position: 'relative',
    width: '100%',
  },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  block: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  textContainer: {
    justifyContent: 'flex-end',
  },
  title: {
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    opacity: 0.9,
  },
});
