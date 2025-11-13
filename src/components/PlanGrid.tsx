import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';
import type { PlanBlock, PlanCategory } from '@/store/usePlans';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Props = {
  date: string;
  blocks: PlanBlock[];
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  onEdit: (id: string) => void;
  onLongDelete?: (id: string) => void;
  pxPerMin?: number;
  step?: number;
  startHour?: number;
  endHour?: number;
};

type BlockLayout = {
  column: number;
  totalColumns: number;
};

const categoryColors: Record<PlanCategory, { border: string; background: string }> = {
  focus: { border: '#FF6B6B', background: 'rgba(255, 107, 107, 0.25)' },
  study: { border: '#4D96FF', background: 'rgba(77, 150, 255, 0.25)' },
  work: { border: '#FFB020', background: 'rgba(255, 176, 32, 0.25)' },
  gym: { border: '#2ECC71', background: 'rgba(46, 204, 113, 0.25)' },
  other: { border: '#9B59B6', background: 'rgba(155, 89, 182, 0.25)' },
};

const calculateLayouts = (blocks: PlanBlock[]): BlockLayout[] => {
  const layout: BlockLayout[] = blocks.map(() => ({ column: 0, totalColumns: 1 }));
  type Event = { time: number; type: 'start' | 'end'; index: number };
  const events: Event[] = [];
  blocks.forEach((block, index) => {
    events.push({ time: block.startMin, type: 'start', index });
    events.push({ time: block.endMin, type: 'end', index });
  });
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.type === b.type) return 0;
    return a.type === 'end' ? -1 : 1;
  });

  const activeBlocks = new Set<number>();
  const columnAssignments: number[] = [];
  const availableColumns: number[] = [];
  let nextColumn = 0;

  const syncActiveTotals = () => {
    const currentTotal = Math.max(activeBlocks.size, 1);
    activeBlocks.forEach((idx) => {
      layout[idx].totalColumns = Math.max(layout[idx].totalColumns, currentTotal);
    });
  };

  for (const event of events) {
    if (event.type === 'start') {
      const column = availableColumns.length > 0 ? availableColumns.shift()! : nextColumn++;
      columnAssignments[event.index] = column;
      layout[event.index].column = column;
      activeBlocks.add(event.index);
      syncActiveTotals();
    } else {
      activeBlocks.delete(event.index);
      const column = columnAssignments[event.index];
      if (column !== undefined) {
        availableColumns.push(column);
      }
      syncActiveTotals();
    }
  }

  return layout;
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
  void onMove;
  const { palette } = useTheme();
  void date;
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const totalMinutes = endMin - startMin;
  const gridHeight = totalMinutes * pxPerMin;

  const sorted = useMemo(() => [...blocks].sort((a, b) => a.startMin - b.startMin), [blocks]);
  const layout = useMemo(() => calculateLayouts(sorted), [sorted]);
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
          {sorted.map((block, index) => {
            const safeStart = clamp(block.startMin, startMin, endMin - 1);
            const safeEnd = clamp(block.endMin, safeStart + 1, endMin);
            const top = clamp((safeStart - startMin) * pxPerMin, 0, Math.max(gridHeight, 0));
            const height = clamp((safeEnd - safeStart) * pxPerMin, pxPerMin, Math.max(gridHeight - top, pxPerMin));
            const handleLongPress = onLongDelete ? () => onLongDelete(block.id) : undefined;
            const info = layout[index] ?? { column: 0, totalColumns: 1 };
            const columns = Math.max(info.totalColumns, 1);
            const columnWidth = 100 / columns;
            const gapPercent = 2;
            const widthPercent = Math.max(columnWidth - gapPercent, Math.min(columnWidth, 5));
            const leftPercent = Math.min(
              Math.max(info.column * columnWidth + gapPercent / 2, 0),
              100 - widthPercent - gapPercent / 2,
            );
            const paletteColor = categoryColors[(block.category ?? 'other') as PlanCategory];

            return (
              <Pressable
                key={block.id}
                onPress={() => onEdit(block.id)}
                onLongPress={handleLongPress}
                style={[
                  styles.block,
                  {
                    top,
                    height,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: paletteColor.background,
                    borderColor: paletteColor.border,
                  },
                ]}>
                <View style={styles.textContainer} pointerEvents="none">
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.blockTitle, { color: palette.text }]}>
                    {block.title}
                  </Text>
                  <Text style={[styles.blockTime, { color: palette.text }]}>
                    {formatTime(block.startMin)} – {formatTime(block.endMin)}
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockTitle: {
    fontWeight: '600',
  },
  blockTime: {
    fontSize: 11,
    opacity: 0.85,
  },
});
