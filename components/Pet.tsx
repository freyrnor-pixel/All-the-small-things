/**
 * Pet.tsx — animated home-screen companion
 *
 * A small cat that lives in the bottom-left corner of the home screen. It bobs
 * gently at idle, bounces happily when pressed, wiggles when tasks are completed,
 * goes to sleep late at night, and can be fed by dragging food items onto it.
 * No real persistence — purely for fun.
 *
 * Connections:
 *   Imports → constants/theme, lib/useAppTheme
 *   Used by → app/index.tsx
 *   Props   → completedToday: triggers excited animation when it increases
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '@/lib/useAppTheme';

type PetState = 'idle' | 'happy' | 'eating' | 'excited' | 'sleeping';

const FOOD_ITEMS = ['🍎', '🥕', '🧀', '🐟'];

const HAPPY_MSGS  = ['Yay! ✨', '♪ ♪', 'Hehe~', '💖'];
const EAT_MSGS    = ['Nom nom!', 'Yummy!', 'Delish!', 'More?'];
const EXCITED_MSGS = ['⭐!', 'Woah!', 'Yesss!', 'Great!'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Draggable food chip ──────────────────────────────────────────────────────

type FoodProps = {
  emoji: string;
  petRef: React.RefObject<View | null>;
  onFedRef: React.MutableRefObject<() => void>;
};

function DraggableFoodItem({ emoji, petRef, onFedRef }: FoodProps) {
  const pan        = useRef(new Animated.ValueXY()).current;
  const chipScale  = useRef(new Animated.Value(1)).current;
  const chipOpacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(chipScale, {
          toValue: 1.3, useNativeDriver: true, tension: 250, friction: 5,
        }).start();
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),

      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        Animated.spring(chipScale, {
          toValue: 1, useNativeDriver: true, tension: 200, friction: 6,
        }).start();

        petRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
          const HIT = 28;
          const isOver =
            gesture.moveX >= pageX - HIT && gesture.moveX <= pageX + w + HIT &&
            gesture.moveY >= pageY - HIT && gesture.moveY <= pageY + h + HIT;

          if (isOver) {
            // Food disappears into the pet
            Animated.parallel([
              Animated.timing(chipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
              Animated.spring(chipScale, { toValue: 1.9, useNativeDriver: true, tension: 150, friction: 5 }),
            ]).start(() => {
              onFedRef.current();
              chipOpacity.setValue(1);
              chipScale.setValue(1);
              pan.setValue({ x: 0, y: 0 });
            });
          } else {
            // Snap back to tray
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
              tension: 80,
              friction: 7,
            }).start();
          }
        });
      },
    })
  ).current;

  return (
    // Outer: non-native translation (drag follows finger)
    <Animated.View
      style={[styles.foodWrap, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {/* Inner: native scale + opacity (visual feedback) */}
      <Animated.View style={{ opacity: chipOpacity, transform: [{ scale: chipScale }] }}>
        <Text style={styles.foodEmoji}>{emoji}</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Pet ──────────────────────────────────────────────────────────────────────

const PET_EMOJI: Record<PetState, string> = {
  idle:    '🐱',
  happy:   '😸',
  eating:  '😋',
  excited: '🙀',
  sleeping:'😴',
};

type Props = { completedToday: number };

export default function Pet({ completedToday }: Props) {
  const theme = useAppTheme();

  const [petState, setPetState] = useState<PetState>(() => {
    const h = new Date().getHours();
    return h < 7 || h >= 23 ? 'sleeping' : 'idle';
  });
  const [bubbleText, setBubbleText]   = useState('');
  const [showBubble, setShowBubble]   = useState(false);

  const petRef       = useRef<View>(null);
  const stateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCompleted = useRef(completedToday);

  // Stable callback ref so the food-item PanResponder (created once) always
  // calls the current triggerEating without stale-closure issues.
  const onFedRef = useRef<() => void>(() => {});

  // ── Animated values ────────────────────────────────────────────────────────
  const bobAnim      = useRef(new Animated.Value(0)).current;
  const scaleAnim    = useRef(new Animated.Value(1)).current;
  const rotateAnim   = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartY       = useRef(new Animated.Value(0)).current;
  const heartScale   = useRef(new Animated.Value(1)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;

  // ── Idle bob (runs forever) ────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -5, duration: 1400, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0,  duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bobAnim]);

  // ── React to completed-task count ─────────────────────────────────────────
  useEffect(() => {
    if (completedToday > prevCompleted.current) {
      triggerExcited();
    }
    prevCompleted.current = completedToday;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedToday]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function clearState() {
    if (stateTimeout.current) clearTimeout(stateTimeout.current);
  }

  function returnToIdle(ms = 2200) {
    clearState();
    stateTimeout.current = setTimeout(() => {
      const h = new Date().getHours();
      setPetState(h < 7 || h >= 23 ? 'sleeping' : 'idle');
    }, ms);
  }

  function showBubbleMsg(text: string) {
    setBubbleText(text);
    setShowBubble(true);
    bubbleOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(bubbleOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(bubbleOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setShowBubble(false));
  }

  // ── Interactions ───────────────────────────────────────────────────────────
  function triggerHappy() {
    clearState();
    setPetState('happy');
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.5, useNativeDriver: true, tension: 280, friction: 4 }),
      Animated.spring(scaleAnim, { toValue: 1,   useNativeDriver: true, tension: 80,  friction: 6 }),
    ]).start();
    heartOpacity.setValue(1);
    heartY.setValue(0);
    heartScale.setValue(0.6);
    Animated.parallel([
      Animated.timing(heartOpacity, { toValue: 0,   duration: 1300, useNativeDriver: true }),
      Animated.spring(heartY,       { toValue: -54, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(heartScale,   { toValue: 1.6, useNativeDriver: true, tension: 80, friction: 6 }),
    ]).start();
    showBubbleMsg(pick(HAPPY_MSGS));
    returnToIdle(2000);
  }

  function triggerExcited() {
    clearState();
    setPetState('excited');
    // Wiggle: rapid rotate oscillation
    const steps = [8, -8, 6, -6, 4, -4, 0].map((v, i) =>
      Animated.timing(rotateAnim, { toValue: v, duration: 70 + i * 5, useNativeDriver: true })
    );
    Animated.sequence(steps).start();
    showBubbleMsg(pick(EXCITED_MSGS));
    returnToIdle(2500);
  }

  function triggerEating() {
    clearState();
    setPetState('eating');
    // Quick chomp sequence
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.18, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.88, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.12, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
    showBubbleMsg(pick(EAT_MSGS));
    returnToIdle(2000);
  }

  // Keep the food-item callback ref current on every render
  onFedRef.current = triggerEating;

  const rotateStr = rotateAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Speech bubble — pops up above the pet */}
      {showBubble && (
        <Animated.View
          style={[
            styles.bubble,
            { backgroundColor: theme.white, borderColor: theme.border, opacity: bubbleOpacity },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.bubbleText, { color: theme.text }]}>{bubbleText}</Text>
          {/* Little triangle tail */}
          <View style={[styles.bubbleTail, { borderTopColor: theme.border }]} />
        </Animated.View>
      )}

      {/* Hearts float up when happy */}
      <Animated.Text
        style={[
          styles.hearts,
          {
            opacity: heartOpacity,
            transform: [{ translateY: heartY }, { scale: heartScale }],
          },
        ]}
        pointerEvents="none"
      >
        💕
      </Animated.Text>

      {/* Food tray — horizontal row of draggable items above the pet */}
      <View style={styles.foodTray} pointerEvents="box-none">
        {FOOD_ITEMS.map((food) => (
          <DraggableFoodItem
            key={food}
            emoji={food}
            petRef={petRef}
            onFedRef={onFedRef}
          />
        ))}
      </View>

      {/* Pet — measurement anchor (ref on outer, animation on inner) */}
      <Pressable onPress={triggerHappy} hitSlop={10}>
        <View ref={petRef} style={styles.petAnchor}>
          <Animated.View
            style={{
              transform: [
                { translateY: bobAnim },
                { rotate: rotateStr },
                { scale: scaleAnim },
              ],
            }}
          >
            <View style={[styles.petBody, { backgroundColor: theme.orangeLight }]}>
              <Text style={styles.petEmoji}>{PET_EMOJI[petState]}</Text>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  bubble: {
    position: 'absolute',
    bottom: 128,
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    // borderTopColor set inline from theme
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  hearts: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    fontSize: 20,
    zIndex: 11,
  },
  foodTray: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  foodWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  foodEmoji: {
    fontSize: 22,
  },
  petAnchor: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petBody: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  petEmoji: {
    fontSize: 30,
  },
});
