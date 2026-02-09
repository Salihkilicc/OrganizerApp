import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

import { PLAN_CATEGORY_COLORS } from '@/constants/categoryColors';
import { isBeforeToday, type PlanBlock, type PlanCategory } from '@/store/usePlans';
import { useTheme } from '@/store/useTheme';

const HOURS_PER_DAY = 24;
const HOUR_COPIES = 1;
const VISUAL_OFFSET_MIN = 30;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
  switch (cat) {
    case 'work': return 'briefcase';
    case 'study': return 'school';
    case 'gym': return 'barbell';
    case 'focus': return 'scan-circle';
    case 'meeting': return 'people';
    case 'reading': return 'book';
    case 'break': return 'cafe';
    case 'personal': return 'person';
    default: return 'ellipse';
  }
};

type Props = {
  date: string;
  blocks: PlanBlock[];
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  onEdit: (id: string) => void;
  onCheck: (id: string) => void;
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
  onEdit: () => void;
  onCheck: (id: string) => void;
  onMove: (id: string, newStartMin: number, newEndMin: number) => void;
  pxPerMin: number;
  snapStep: number;
  dayStartMin: number;
  dayEndMin: number;
};

const DraggableBlock = ({
  block,
  style,
  onEdit,
  onCheck,
  onMove,
  pxPerMin,
  snapStep,
  dayStartMin,
  dayEndMin,
}: DraggableBlockProps) => {
  const panY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(1)).current;
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

  const handleCheck = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.8, duration: 50, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      Animated.timing(checkScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => onCheck(block.id));
  };

  const iconName = getCategoryIcon(block.category || 'other');

  /* Shared hook-based styles */
  const { palette, themeKey } = useTheme();

  const isLight = themeKey === 'light';
  const textColor = isLight ? palette.accent : '#fff';
  const timeColor = isLight ? 'rgba(30, 27, 75, 0.7)' : 'rgba(255,255,255,0.7)';
  const iconColor = isLight ? palette.accent : '#fff';
  const badgeBg = isLight ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.2)';

  return (
    <Animated.View {...responder.panHandlers} style={[...style, animatedStyle, { justifyContent: 'center' }]}>
      <Pressable onPress={onEdit} style={StyleSheet.absoluteFill} />

      {/* Header: Icon + Title */}
      <View style={[styles.blockHeader, { justifyContent: 'center', marginBottom: 0 }]}>
        <View style={[styles.iconBadge, { backgroundColor: badgeBg, width: 20, height: 20 }]}>
          <Ionicons name={iconName} size={12} color={iconColor} />
        </View>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.blockTitle, { color: textColor, textAlign: 'center', flex: 0, fontSize: 12 }]}>
          {block.title}
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
  onCheck,
  onMove,
  pxPerMin = 1,
  step = 30,
  startHour = 0,
  endHour = HOURS_PER_DAY,
  contentHeight,
  onCreateAtMinute,
}: Props) {
  void onMove;
  const { palette, themeKey } = useTheme();
  const isLight = themeKey === 'light';
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
      <View style={[styles.grid, { height: effectiveHeight, backgroundColor: 'transparent' }]}>
        {onCreateAtMinute && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleGridPress} />
        )}
        {lines.map((lineMin) => {
          const top = lineMin * pxPerMin;
          const isHour = lineMin % 60 === 0;
          // Hide lines in dark mode as requested
          const lineColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'transparent';

          return (
            <View
              key={`line-${lineMin}`}
              style={[
                styles.line,
                {
                  top,
                  backgroundColor: lineColor,
                  height: isHour ? 1 : 0.5,
                  opacity: 1,
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

          const isDone = block.done ?? false;
          const doneBackground = 'rgba(0,0,0,0.25)';
          const doneBorder = '#000';
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

          const handlePress = () => {
            if (isPastBlock) return;
            onEdit(block.id);
          };

          return (
            <View key={block.id} pointerEvents="box-none">
              {!isPastBlock ? (
                <DraggableBlock
                  block={block}
                  onEdit={handlePress}
                  onCheck={onCheck}
                  onMove={onMove}
                  pxPerMin={touchPxPerMin}
                  snapStep={snapStep}
                  dayStartMin={startMin}
                  dayEndMin={endMin}
                  style={[
                    styles.block,
                    {
                      top: baseTop,
                      height: baseHeight,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: blockBackground,
                      borderColor: blockBorder,
                    },
                  ]}
                />
              ) : (
                <Pressable
                  disabled={isPastBlock}
                  onPress={handlePress}
                  style={[
                    styles.block,
                    {
                      top: baseTop,
                      height: baseHeight,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: blockBackground,
                      borderColor: blockBorder,
                      justifyContent: 'center',
                    },
                  ]}>
                  {(() => {
                    const isLight = palette.background.includes('255'); // Simple check or pass themeKey
                    const textColor = isLight ? palette.accent : '#fff';
                    const timeColor = isLight ? 'rgba(30, 27, 75, 0.7)' : 'rgba(255,255,255,0.7)';
                    const iconColor = isLight ? palette.accent : '#fff';
                    const badgeBg = isLight ? 'rgba(30, 27, 75, 0.1)' : 'rgba(255,255,255,0.2)';

                    return (
                      <>
                        <View style={[styles.blockHeader, { justifyContent: 'center', marginBottom: 0 }]} pointerEvents="none">
                          <View style={[styles.iconBadge, { backgroundColor: badgeBg, width: 20, height: 20 }]}>
                            <Ionicons name={getCategoryIcon(block.category || 'other')} size={12} color={iconColor} />
                          </View>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.blockTitle, { color: textColor, textAlign: 'center', flex: 0, fontSize: 12 }]}>
                            {block.title}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </Pressable>
              )}
            </View>
          );
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
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: {
    fontWeight: 'bold',
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  blockTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 30,
  },
});
