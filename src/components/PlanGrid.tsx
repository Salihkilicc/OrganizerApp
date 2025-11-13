import { memo, useMemo } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/store/useTheme';
import type { PlanBlock, PlanCategory } from '@/store/usePlans';

const HOURS_PER_DAY = 24;
const HOUR_COPIES = 3;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Props = {
  date: string;
  blocks: PlanBlock[];
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  onEdit: (id: string) => void;
  onCreateAt?: (startMin: number, endMin: number) => void;
  pxPerMin?: number;
  step?: number;
  startHour?: number;
  endHour?: number;
  contentHeight?: number;
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
  meeting: { border: '#1ABC9C', background: 'rgba(26, 188, 156, 0.25)' },
  reading: { border: '#8E44AD', background: 'rgba(142, 68, 173, 0.25)' },
  break: { border: '#F39C12', background: 'rgba(243, 156, 18, 0.25)' },
  personal: { border: '#E84393', background: 'rgba(232, 67, 147, 0.25)' },
  other: { border: '#9B59B6', background: 'rgba(155, 89, 182, 0.25)' },
};

const DEFAULT_DURATION = 60;

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
  onCreateAt,
  onMove,
  pxPerMin = 1,
  step = 30,
  startHour = 0,
  endHour = HOURS_PER_DAY,
  contentHeight,
}: Props) {
  void onMove;
  const { palette } = useTheme();
  void date;
  const normalizedStart = Math.max(0, Math.min(startHour, HOURS_PER_DAY));
  const normalizedEnd = Math.max(normalizedStart, Math.min(endHour, HOURS_PER_DAY));
  const startMin = normalizedStart * 60;
  const endMin = normalizedEnd * 60;
  const dayDuration = Math.max(endMin - startMin, 0);
  const dayHeight = dayDuration * pxPerMin;
  const totalMinutes = dayDuration * HOUR_COPIES;
  const totalHeight = dayHeight * HOUR_COPIES;
  const effectiveHeight = contentHeight ?? totalHeight;

  const sorted = useMemo(() => [...blocks].sort((a, b) => a.startMin - b.startMin), [blocks]);
  const layout = useMemo(() => calculateLayouts(sorted), [sorted]);
  const gridHeight = Math.max(dayHeight, 0);
  const lines = useMemo(() => {
    const segments: number[] = [];
    for (let min = 0; min <= totalMinutes; min += step) {
      segments.push(min);
    }
    return segments;
  }, [totalMinutes, step]);
  const snapStep = Math.max(step, 1);
  const touchPxPerMin = Math.max(pxPerMin, 0.01);
  const handleGridPress = (event: GestureResponderEvent) => {
    if (!onCreateAt) return;
    const minuteOffset = event.nativeEvent.locationY / touchPxPerMin;
    const normalizedOffset =
      gridHeight > 0 ? ((minuteOffset % gridHeight) + gridHeight) % gridHeight : 0;
    const rawMinute = startMin + normalizedOffset;
    const snappedStart = Math.round(rawMinute / snapStep) * snapStep;
    const maxStart = Math.max(endMin - DEFAULT_DURATION, startMin);
    const safeStart = clamp(snappedStart, startMin, maxStart);
    const safeEnd = clamp(safeStart + DEFAULT_DURATION, safeStart + 1, endMin);
    if (safeEnd > safeStart) {
      onCreateAt(safeStart, safeEnd);
    }
  };

  return (
    <View style={[styles.wrapper, { borderColor: palette.border }]}>
      <View style={[styles.grid, { height: effectiveHeight, backgroundColor: palette.background }]}>
        {onCreateAt && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleGridPress} />
        )}
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
          const baseTop = clamp((safeStart - startMin) * pxPerMin, 0, gridHeight);
          const baseHeight = clamp(
            (safeEnd - safeStart) * pxPerMin,
            pxPerMin,
            Math.max(gridHeight - baseTop, pxPerMin),
          );
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

          return Array.from({ length: HOUR_COPIES }, (_, copyIndex) => {
            const copyOffset = copyIndex * gridHeight;
            return (
              <Pressable
                key={`${block.id}-${copyIndex}`}
                onPress={() => onEdit(block.id)}
                style={[
                  styles.block,
                  {
                    top: baseTop + copyOffset,
                    height: baseHeight,
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
          });
        })}
      </View>
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
    textAlign: 'center',
  },
  blockTime: {
    fontSize: 11,
    opacity: 0.85,
    textAlign: 'center',
  },
});
