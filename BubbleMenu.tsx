/**
 * UnFocus — BubbleMenu
 *
 * The sole navigation entry point — a radial floating action button (FAB) that
 * fans out into feature bubbles when tapped.
 *
 * Spec (README.md):
 *   FAB:     64×64 px circle, scheme primary bg, Ionicon "add", shadow-fab.
 *            Rotates 135° when open, back to 0° when closed, 0.3s linear.
 *   Bubbles: 56×56 px circles at 132px radius, arc 178°→268° (gentle fan below).
 *            Feature accent bg + Ionicon in bubble-ink (one colour for whole wheel).
 *            1.5px white border at 45% opacity.
 *            Labels: visible when open, fade in/out below each bubble.
 *   Scrim:   rgba(8,16,32,0.18) + backdrop blur 1.5px. Tap to close.
 *   Animation: spring fan-out cubic-bezier(.34,1.56,.64,1), 0.32s, 30ms stagger.
 *   Position: bottom:24, right:24 (or left:24 if side="left").
 *
 * Learnability rule: feature key → fixed wheel position, fixed icon, fixed token.
 *
 * Usage:
 *   <BubbleMenu
 *     items={[
 *       { key:'task',   icon:'add',              label:'New task',  color:colors.featureTask   },
 *       { key:'shop',   icon:'cart-outline',     label:'Shopping',  color:colors.featureShop   },
 *       { key:'habits', icon:'leaf-outline',     label:'Habits',    color:colors.featureHabits },
 *       { key:'meals',  icon:'restaurant-outline',label:'Food',     color:colors.featureMeals  },
 *       { key:'health', icon:'heart-outline',    label:'Health',    color:colors.featureHealth },
 *       { key:'home',   icon:'home-outline',     label:'Home',      color:colors.featureShared },
 *     ]}
 *     onSelect={(key) => router.push(`/${key}`)}
 *   />
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, Pressable, Animated, StyleSheet,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/components/ThemeProvider';
import { FontFamily, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const FAB_SIZE    = 64;
const BUBBLE_SIZE = 56;
const RADIUS      = 132;  // distance from FAB centre to bubble centre (px)
const START_DEG   = 178;  // arc start (degrees)
const END_DEG     = 268;  // arc end
const STAGGER_MS  = 30;
const DURATION_MS = 320;

export interface BubbleItem {
  key:   string;
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;   // feature accent background
}

interface BubbleMenuProps {
  items:    BubbleItem[];
  onSelect: (key: string) => void;
  side?:    'right' | 'left';
}

export function BubbleMenu({ items, onSelect, side = 'right' }: BubbleMenuProps) {
  const { colors, shadows } = useTheme();
  const [open, setOpen] = useState(false);

  // FAB rotation: 0° → 135°
  const fabRotation = useRef(new Animated.Value(0)).current;
  // Scrim opacity
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  // Per-bubble: scale + opacity + translateX + translateY
  const bubbleAnims = useRef(items.map(() => ({
    scale:   new Animated.Value(0),
    opacity: new Animated.Value(0),
    tx:      new Animated.Value(0),
    ty:      new Animated.Value(0),
  }))).current;

  // Compute each bubble's final (x, y) offset from FAB centre
  const positions = items.map((_, i) => {
    const t   = items.length === 1 ? 0.5 : i / (items.length - 1);
    const deg = START_DEG + (END_DEG - START_DEG) * t;
    const rad = (deg * Math.PI) / 180;
    return {
      x: Math.cos(rad) * RADIUS,
      y: Math.sin(rad) * RADIUS,
    };
  });

  const openMenu = useCallback(() => {
    setOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // FAB rotate + scrim fade
    Animated.parallel([
      Animated.timing(fabRotation, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Bubbles spring out with stagger
    bubbleAnims.forEach((anim, i) => {
      const delay = i * STAGGER_MS;
      Animated.parallel([
        Animated.spring(anim.scale, {
          toValue: 1, delay,
          useNativeDriver: true,
          // cubic-bezier(.34,1.56,.64,1) approximated with spring
          tension: 80, friction: 8,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1, duration: DURATION_MS, delay, useNativeDriver: true,
        }),
        Animated.spring(anim.tx, {
          toValue: positions[i].x, delay,
          useNativeDriver: true, tension: 80, friction: 8,
        }),
        Animated.spring(anim.ty, {
          toValue: positions[i].y, delay,
          useNativeDriver: true, tension: 80, friction: 8,
        }),
      ]).start();
    });
  }, []);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(fabRotation, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(scrimOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ...bubbleAnims.flatMap(anim => [
        Animated.spring(anim.scale,   { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(anim.opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.spring(anim.tx,      { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.spring(anim.ty,      { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }),
      ]),
    ]).start(() => setOpen(false));
  }, []);

  const handleSelect = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeMenu();
    // Small delay so close animation starts before nav transition
    setTimeout(() => onSelect(key), 80);
  }, [onSelect, closeMenu]);

  const fabRotateDeg = fabRotation.interpolate({
    inputRange: [0, 1], outputRange: ['0deg', '135deg'],
  });

  const fabStyle = {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: Radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center' as const, justifyContent: 'center' as const,
    ...shadows.fab,
  };

  return (
    <View
      style={[
        styles.container,
        side === 'left' ? { left: Spacing.s24 } : { right: Spacing.s24 },
      ]}
      pointerEvents="box-none"
    >
      {/* Scrim — rendered only when open */}
      {open && (
        <Animated.View
          style={[styles.scrim, { opacity: scrimOpacity }]}
          pointerEvents="auto"
        >
          <TouchableWithoutFeedback onPress={closeMenu}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Bubbles — rendered relative to FAB centre */}
      {bubbleAnims.map((anim, i) => (
        <Animated.View
          key={items[i].key}
          style={[
            styles.bubbleWrap,
            {
              transform: [
                { translateX: anim.tx },
                { translateY: anim.ty },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          {/* Label */}
          <Text style={[styles.bubbleLabel, { backgroundColor: colors.surfaceCard, color: colors.textBody }]}>
            {items[i].label}
          </Text>
          {/* Bubble dot */}
          <Pressable
            onPress={() => handleSelect(items[i].key)}
            style={[
              styles.bubble,
              { backgroundColor: items[i].color, ...shadows.fab },
            ]}
            accessibilityRole="button"
            accessibilityLabel={items[i].label}
          >
            <Ionicons name={items[i].icon} size={24} color={colors.bubbleInk} />
          </Pressable>
        </Animated.View>
      ))}

      {/* FAB */}
      <Pressable
        onPress={open ? closeMenu : openMenu}
        style={({ pressed }) => [fabStyle, { opacity: pressed ? 0.9 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close menu' : 'Open menu'}
        accessibilityState={{ expanded: open }}
      >
        <Animated.View style={{ transform: [{ rotate: fabRotateDeg }] }}>
          <Ionicons name="add" size={32} color={colors.bubbleInk} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.s24,
    // left/right set inline based on `side` prop
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    // extend far beyond the component to cover the full screen
    margin: -9999,
    backgroundColor: 'rgba(8,16,32,0.18)',
  },
  bubbleWrap: {
    position: 'absolute',
    alignItems: 'center',
    gap: Spacing.s4,
  },
  bubble: {
    width:          BUBBLE_SIZE,
    height:         BUBBLE_SIZE,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  bubbleLabel: {
    fontFamily:  FontFamily.sans,
    fontWeight:  FontWeight.bold,
    fontSize:    FontSize.xs,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.s8,
    paddingVertical:   2,
    overflow: 'hidden',
  },
});
