import { memo, useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@/store/useTheme';
import type { Palette } from '@/styles/colors';
import type { PlanBlock } from '@/store/usePlans';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const roundToStep = (value: number, step: number) => Math.round(value / step) * step;

type Props = {
  date: string;
  blocks: PlanBlock[];
  onMove: (id: string, newStart: number, newEnd: number) => void;
  onEdit: (id: string) => void;
  onLongDelete?: (id: string) => void;
  pxPerMin?: number;
  step?: number;
  startHour?: number;
  endHour?: number;
};

export const PlanGrid = memo(function PlanGrid({
  blocks,
  onMove,
  onEdit,
  onLongDelete,
  pxPerMin = 1,
  step = 30,
  startHour = 6,
  endHour = 24,
}: Props) {
  const { palette } = useTheme();
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const totalMinutes = endMin - startMin;
  const gridHeight = totalMinutes * pxPerMin;

  const sorted = useMemo(() => [...blocks].sort((a, b) => a.startMin - b.startMin), [blocks]);
  const lines = useMemo(() => {
    const segments = [];
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
          {sorted.map((blockProps) => (
            <BlockItem
              key={blockProps.id}
              block={blockProps}
              palette={palette}
              pxPerMin={pxPerMin}
              step={step}
              startMin={startMin}
              endMin={endMin}
              gridHeight={gridHeight}
              onMove={onMove}
              onEdit={onEdit}
              onLongDelete={onLongDelete}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

const BlockItem = memo(function BlockItem({
  block,
  palette,
  pxPerMin,
  step,
  startMin,
  endMin,
  gridHeight,
  onMove,
  onEdit,
  onLongDelete,
}: {
  block: PlanBlock;
  palette: Palette;
  pxPerMin: number;
  step: number;
  startMin: number;
  endMin: number;
  gridHeight: number;
  onMove: (id: string, newStart: number, newEnd: number) => void;
  onEdit: (id: string) => void;
  onLongDelete?: (id: string) => void;
}) {
  const duration = block.endMin - block.startMin;
  const translateY = useSharedValue(0);
  const resizeDelta = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const isResizing = useSharedValue(false);

  const dragGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onBegin(() => {
      isDragging.value = false;
      translateY.value = 0;
    })
    .onUpdate((event) => {
      isDragging.value = true;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (!isDragging.value) {
        translateY.value = withTiming(0);
        return;
      }
      const deltaMin = event.translationY / pxPerMin;
      const snapped = roundToStep(deltaMin, step);
      const candidateStart = clamp(block.startMin + snapped, 0, 1440 - duration);
      if (candidateStart !== block.startMin) {
        runOnJS(onMove)(block.id, candidateStart, candidateStart + duration);
      }
      translateY.value = withTiming(0);
      isDragging.value = false;
    });

  const resizeGesture = Gesture.Pan()
    .activateAfterLongPress(250)
    .onBegin(() => {
      isResizing.value = true;
      resizeDelta.value = 0;
    })
    .onUpdate((event) => {
      resizeDelta.value = event.translationY;
    })
    .onEnd((event) => {
      const deltaMin = event.translationY / pxPerMin;
      const snapped = roundToStep(deltaMin, step);
      const candidateEnd = clamp(block.endMin + snapped, block.startMin + step, 1440);
      if (candidateEnd !== block.endMin) {
        runOnJS(onMove)(block.id, block.startMin, candidateEnd);
      }
      resizeDelta.value = withTiming(0);
      isResizing.value = false;
    })
    .onFinalize(() => {
      resizeDelta.value = withTiming(0);
      isResizing.value = false;
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(220)
    .maxDistance(10)
    .onEnd(() => runOnJS(onEdit)(block.id));

  const deleteGesture = onLongDelete
    ? Gesture.LongPress()
        .minDuration(600)
        .maxDistance(20)
        .onEnd(() => runOnJS(onLongDelete)(block.id))
        .requireExternalGestureToFail(dragGesture)
    : undefined;

  const tapOrDrag = Gesture.Exclusive(tapGesture, dragGesture);
  const blockGesture = deleteGesture
    ? Gesture.Simultaneous(tapOrDrag, deleteGesture)
    : tapOrDrag;

  const blockStyle = useAnimatedStyle(() => {
    const rawTop = (block.startMin - startMin) * pxPerMin + translateY.value;
    const safeHeight = Math.max(
      (block.endMin - block.startMin) * pxPerMin + resizeDelta.value,
      step * pxPerMin,
    );
    const boundedHeight = Math.min(safeHeight, gridHeight);
    const maxTop = Math.max(gridHeight - boundedHeight, 0);
    const top = clamp(rawTop, 0, maxTop);
    const height = clamp(boundedHeight, step * pxPerMin, gridHeight - top);
    return {
      top,
      height,
    };
  });

  const handleStyle = useAnimatedStyle(() => {
    const rawHeight = Math.max(
      (block.endMin - block.startMin) * pxPerMin + resizeDelta.value,
      step * pxPerMin,
    );
    const boundedHeight = clamp(Math.min(rawHeight, gridHeight), step * pxPerMin, gridHeight);
    return {
      top: Math.max(boundedHeight - 12, 4),
    };
  });

  return (
    <GestureDetector gesture={blockGesture}>
      <Animated.View
        style={[
          styles.block,
          {
            backgroundColor: block.color ?? palette.accent,
            borderColor: palette.border,
          },
          blockStyle,
        ]}>
        <GestureDetector gesture={resizeGesture}>
          <Animated.View style={[styles.handle, handleStyle]} />
        </GestureDetector>
        <View style={styles.textContainer} pointerEvents="none">
          <Animated.Text style={[styles.title, { color: palette.background }]}>
            {block.title}
          </Animated.Text>
          <Animated.Text style={[styles.time, { color: palette.background }]}>
            {formatTime(block.startMin)} – {formatTime(block.endMin)}
          </Animated.Text>
        </View>
      </Animated.View>
    </GestureDetector>
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
  handle: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
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
