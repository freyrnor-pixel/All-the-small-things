/**
 * DraggableTaskRow.tsx — long-press-and-drag wrapper for one PlanTaskCard row.
 *
 * Lets app/plans.tsx's Important/General sections be manually reordered (and tasks moved
 * between the two) by dragging a collapsed PlanTaskCard. This component owns no task data and
 * persists nothing — it only reports gesture state up to the parent (onRowLayout/onDragStart/
 * onDragMove/onDragEnd); app/plans.tsx does the hit-testing (against row layouts it collects via
 * onRowLayout, including its two section-header "anchors") and the actual reorder/section-move
 * persistence (reorderTasks/update) on drop.
 *
 * Connections:
 *   Imports → components/PlanTaskCard, lib/haptics, lib/useAppTheme, react-native-gesture-handler, react-native-reanimated
 *   Used by → app/plans.tsx
 *   Data    → none directly — callbacks drive the parent's drag/livePreview state
 *
 * Edit notes:
 *   - Pan only activates after a ~180ms hold (`activateAfterLongPress`), not on a bare vertical
 *     offset — deliberate, so a quick vertical swipe still scrolls app/plans.tsx's ScrollView
 *     normally; only a held-then-dragged touch claims the row for reordering. `failOffsetX`
 *     still lets a fast horizontal swipe fall through to SiteSwipeView immediately.
 *   - Disabled outright (`.enabled(!isOpen)`) while the wrapped card is expanded — dragging only
 *     ever applies to collapsed rows, so an open card's scrolling/typing is never contested.
 *   - The dragged row lifts (scale + shadow, via the `lifted` shared value) and follows the
 *     finger via translateY; siblings are NOT animated here — app/plans.tsx reflows them itself
 *     via LayoutAnimation when the live preview order changes, same idiom ExpandableCard.tsx
 *     already uses for expand/collapse (relies on that file's module-level Android enable).
 *   - onDragMove reports the dragged row's current screen-space center Y, throttled to firing
 *     only once movement exceeds a small pixel delta — app/plans.tsx does the actual index/
 *     section hit-test and decides whether anything changed (and whether to play selection()/
 *     heavy()); this component only fires tap() once, on lift.
 */
import React, { useRef } from 'react';
import { LayoutChangeEvent, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import PlanTaskCard from '@/components/PlanTaskCard';
import { tap } from '@/lib/haptics';
import { useAccessibility } from '@/lib/useAppTheme';
import type { Task } from '@/store/useTaskStore';

export type Section = 'important' | 'general';

type PlanTaskCardProps = React.ComponentProps<typeof PlanTaskCard>;

type Props = {
  task: Task;
  cardProps: Omit<PlanTaskCardProps, 'task'>;
  section: Section;
  isOpen: boolean;
  onRowLayout: (layout: { y: number; height: number }) => void;
  onDragStart: () => void;
  onDragMove: (centerY: number) => void;
  onDragEnd: () => void;
};

const MOVE_REPORT_THRESHOLD = 6;

export default function DraggableTaskRow({
  task,
  cardProps,
  isOpen,
  onRowLayout,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const { reducedMotion } = useAccessibility();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const lifted = useSharedValue(0);
  const rowYRef = useRef(0);
  const rowHeightRef = useRef(0);
  const lastReportedY = useSharedValue(0);

  function handleLayout(e: LayoutChangeEvent) {
    rowYRef.current = e.nativeEvent.layout.y;
    rowHeightRef.current = e.nativeEvent.layout.height;
    onRowLayout({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height });
  }

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .failOffsetX([-12, 12])
    .enabled(!isOpen)
    .onStart(() => {
      lifted.value = 1;
      scale.value = reducedMotion ? 1.03 : withSpring(1.03, { damping: 18, stiffness: 320 });
      lastReportedY.value = 0;
      runOnJS(tap)();
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      if (Math.abs(e.translationY - lastReportedY.value) > MOVE_REPORT_THRESHOLD) {
        lastReportedY.value = e.translationY;
        const centerY = rowYRef.current + e.translationY + rowHeightRef.current / 2;
        runOnJS(onDragMove)(centerY);
      }
    })
    .onEnd(() => {
      lifted.value = 0;
      translateY.value = reducedMotion ? 0 : withTiming(0, { duration: 200 });
      scale.value = reducedMotion ? 1 : withTiming(1, { duration: 150 });
      runOnJS(onDragEnd)();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    zIndex: lifted.value ? 10 : 0,
    shadowOpacity: lifted.value ? 0.25 : 0,
    shadowRadius: lifted.value ? 12 : 0,
    shadowOffset: { width: 0, height: lifted.value ? 6 : 0 },
    elevation: lifted.value ? 8 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.row, animStyle]} onLayout={handleLayout}>
        <PlanTaskCard task={task} {...cardProps} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: 'transparent' },
});
