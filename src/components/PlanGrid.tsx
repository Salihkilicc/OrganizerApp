import { memo, useMemo, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/store/useTheme';
import { isBeforeToday, type PlanBlock, type PlanCategory } from '@/store/usePlans';
import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';

const HOURS_PER_DAY = 24;
const HOUR_COPIES = 3;
const VISUAL_OFFSET_MIN = 30;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

type Props = {
  date: string;
  blocks: PlanBlock[];
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  onEdit: (id: string) => void;
  onCreateAtMinute?: (minute: number) => void;
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

type DraggableBlockProps = {
  block: PlanBlock;
  style: any[];
  textStyle: { color: string; textDecorationLine: 'none' | 'line-through' };
  timeStyle: { color: string; textDecorationLine: 'none' | 'line-through' };
  onEdit: () => void;
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  pxPerMin: number;
  snapStep: number;
  dayStartMin: number;
  dayEndMin: number;
};

const DraggableBlock = ({
  block,
  style,
  textStyle,
  timeStyle,
  onEdit,
  onMove,
  pxPerMin,
  snapStep,
  dayStartMin,
  dayEndMin,
}: DraggableBlockProps) => {
  const panY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [dragging, setDragging] = useState(false);
  const duration = Math.max(1, block.endMin - block.startMin);
  const maxStart = Math.max(dayStartMin, dayEndMin - duration);

  const resetDrag = () => {
    setDragging(false);
    panY.setValue(0);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: false,
      friction: 7,
      tension: 120,
    }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          setDragging(true);
          Animated.spring(scale, {
            toValue: 1.04,
            useNativeDriver: false,
            friction: 9,
            tension: 140,
          }).start();
        },
        onPanResponderMove: Animated.event([null, { dy: panY }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gesture) => {
          const deltaMinutes = Math.round(gesture.dy / pxPerMin / snapStep) * snapStep;
          const nextStart = clamp(block.startMin + deltaMinutes, dayStartMin, maxStart);
          const nextEnd = nextStart + duration;
          if (nextStart !== block.startMin || nextEnd !== block.endMin) {
            onMove(block.id, nextStart, nextEnd);
          }
          resetDrag();
        },
        onPanResponderTerminate: resetDrag,
        onPanResponderTerminationRequest: () => true,
        onShouldBlockNativeResponder: () => false,
      }),
    [block.endMin, block.id, block.startMin, dayStartMin, maxStart, onMove, panY, pxPerMin, snapStep],
  );

  const animatedStyle = useMemo(
    () => ({
      transform: [{ translateY: panY }, { scale }],
      opacity: dragging ? 0.92 : 1,
    }),
    [dragging, panY, scale],
  );

  return (
    <Animated.View {...responder.panHandlers} style={[...style, animatedStyle]}>
      <Pressable onPress={onEdit} style={StyleSheet.absoluteFill} />
      <View style={styles.textContainer} pointerEvents="none">
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.blockTitle, textStyle]}>
          {block.title}
        </Text>
        <Text style={[styles.blockTime, timeStyle]}>
          {formatTime(block.startMin)} – {formatTime(block.endMin)}
        </Text>
      </View>
    </Animated.View>
  );
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
  onMove,
  pxPerMin = 1,
  step = 30,
  startHour = 0,
  endHour = HOURS_PER_DAY,
  contentHeight,
  onCreateAtMinute,
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
    if (!onCreateAtMinute) return;
    const minuteOffset = event.nativeEvent.locationY / touchPxPerMin;
    const normalizedOffset =
      gridHeight > 0 ? ((minuteOffset % gridHeight) + gridHeight) % gridHeight : 0;
    const rawMinute = startMin + normalizedOffset;
    const snappedMinute = Math.round(rawMinute / snapStep) * snapStep;
    const maxStart = Math.max(startMin, endMin - snapStep);
    const safeStart = clamp(snappedMinute, startMin, maxStart);
    onCreateAtMinute(safeStart);
  };

  return (
    <View style={[styles.wrapper, { borderColor: palette.border }]}>
      <View style={[styles.grid, { height: effectiveHeight, backgroundColor: palette.background }]}>
        {onCreateAtMinute && (
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
          const baseTop = clamp(
            ((safeStart - startMin + VISUAL_OFFSET_MIN) * pxPerMin),
            0,
            gridHeight,
          );
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
          const paletteColor = PLAN_CATEGORY_COLORS[(block.category ?? 'other') as PlanCategory];
          const isPastBlock = isBeforeToday(block.date);

          return Array.from({ length: HOUR_COPIES }, (_, copyIndex) => {
            const copyOffset = copyIndex * gridHeight;
            const isDone = block.done ?? false;
            const doneBackground = 'rgba(0,0,0,0.25)';
            const doneBorder = '#000';
            const doneTextColor = '#555';
            const textDecorationLine = isPastBlock || isDone ? 'line-through' : 'none';
            const blockBackground = isPastBlock
              ? '#333333'
              : isDone
              ? doneBackground
              : paletteColor.background;
            const blockBorder = isPastBlock
              ? '#555555'
              : isDone
              ? doneBorder
              : paletteColor.border;
          const blockTextColor = isPastBlock
            ? '#BBBBBB'
            : isDone
            ? doneTextColor
            : palette.text;
          const handlePress = () => {
            if (isPastBlock) return;
            onEdit(block.id);
          };
          const textStyle = {
            color: blockTextColor,
            textDecorationLine,
          } as const;
          const timeStyle = {
            color: blockTextColor,
            textDecorationLine,
          } as const;
          const isInteractiveCopy = copyIndex === Math.floor(HOUR_COPIES / 2) && !isPastBlock;

          return (
            <View key={`${block.id}-${copyIndex}`} pointerEvents="box-none">
              {isInteractiveCopy ? (
                <DraggableBlock
                  block={block}
                  onEdit={handlePress}
                  onMove={onMove}
                  pxPerMin={touchPxPerMin}
                  snapStep={snapStep}
                  dayStartMin={startMin}
                  dayEndMin={endMin}
                  style={[
                    styles.block,
                    {
                      top: baseTop + copyOffset,
                      height: baseHeight,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: blockBackground,
                      borderColor: blockBorder,
                    },
                  ]}
                  textStyle={textStyle}
                  timeStyle={timeStyle}
                />
              ) : (
                <Pressable
                  disabled={isPastBlock}
                  onPress={handlePress}
                  style={[
                    styles.block,
                    {
                      top: baseTop + copyOffset,
                      height: baseHeight,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: blockBackground,
                      borderColor: blockBorder,
                    },
                  ]}>
                  <View style={styles.textContainer} pointerEvents="none">
                    <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.blockTitle, textStyle]}>
                      {block.title}
                    </Text>
                    <Text style={[styles.blockTime, timeStyle]}>
                      {formatTime(block.startMin)} – {formatTime(block.endMin)}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
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
