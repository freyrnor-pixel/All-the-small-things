/**
 * UnFocus — Form Components
 * Checkbox · Switch · SegmentedControl · Input
 */

import React, { useRef } from 'react';
import {
  Pressable, Animated, View, Text, TextInput,
  StyleSheet, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeProvider';
import {
  FontFamily, FontSize, FontWeight,
  Radius, Spacing, HIT_TARGET,
} from '@/constants/theme';

// ── Checkbox ─────────────────────────────────────────────────────────────────

/**
 * Tick/untick control.
 * 20×20 square with 4px radius. When checked: filled primary + white checkmark.
 * Tap area is 24×24 (slightly larger than the visual).
 */
interface CheckboxProps {
  checked:   boolean;
  onChange:  () => void;
  label?:    string;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={!disabled ? onChange : undefined}
      style={styles.checkboxWrap}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View style={[
        styles.checkboxBox,
        {
          backgroundColor: checked ? colors.primary : 'transparent',
          borderColor: checked ? colors.primary : colors.borderInput,
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
        {checked && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
      </View>
      {label && (
        <Text style={[styles.checkboxLabel, { color: colors.textBody }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// ── Switch ────────────────────────────────────────────────────────────────────

/**
 * Toggle on/off.
 * 44×24 rounded pill; knob slides 0.2s. Tracks primary (on) / borderInput (off).
 */
interface SwitchProps {
  checked:  boolean;
  onChange: (v: boolean) => void;
  label?:   string;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  const { colors } = useTheme();
  const knob = useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(knob, {
      toValue: checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [checked]);

  const trackColor  = knob.interpolate({ inputRange: [0,1], outputRange: [colors.borderInput, colors.primary] });
  const knobLeft    = knob.interpolate({ inputRange: [0,1], outputRange: [3, 23] });

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.switchRow}
      accessibilityRole="switch"
      accessibilityState={{ checked }}
    >
      {label && (
        <Text style={[styles.switchLabel, { color: colors.textBody }]}>{label}</Text>
      )}
      <Animated.View style={[styles.switchTrack, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.switchKnob, { left: knobLeft }]} />
      </Animated.View>
    </Pressable>
  );
}

// ── SegmentedControl ──────────────────────────────────────────────────────────

/**
 * Horizontal radio group rendered as sliding-pill tabs.
 * Each option is 44px tall. Selected: white bg + shadow + primary text.
 * Unselected: transparent + muted text.
 */
interface SegOption {
  value: string;
  label: string;
}

interface SegmentedControlProps {
  options:  SegOption[];
  value:    string;
  onChange: (v: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const { colors, shadows } = useTheme();

  return (
    <View style={[styles.segTrack, { backgroundColor: colors.surfaceSunken }]}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segOption,
              active && { backgroundColor: colors.surfaceCard, ...shadows.button },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[
              styles.segLabel,
              { color: active ? colors.primary : colors.textMuted },
            ]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

/**
 * Single-line text input.
 * 44px height, 1px border (2px + glow on focus).
 * Supports label above the field.
 */
interface InputProps extends Omit<TextInputProps, 'style'> {
  label?:    string;
  disabled?: boolean;
}

export function Input({ label, disabled = false, ...rest }: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);

  return (
    <View>
      {label && (
        <Text style={[styles.inputLabel, { color: colors.textBody }]}>{label}</Text>
      )}
      <TextInput
        {...rest}
        editable={!disabled}
        onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={e  => { setFocused(false); rest.onBlur?.(e);  }}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color:       colors.textBody,
            backgroundColor: colors.surfaceCard,
            borderColor: focused ? colors.primary : colors.borderInput,
            borderWidth: focused ? 2 : 1,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      />
    </View>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Checkbox
  checkboxWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.s8,
    minWidth: 24, minHeight: 24,
  },
  checkboxBox: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxLabel: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.medium,
    fontSize:   FontSize.base,
    includeFontPadding: false,
  },

  // Switch
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.medium,
    fontSize:   FontSize.base,
    flex: 1, marginRight: Spacing.s12,
    includeFontPadding: false,
  },
  switchTrack: {
    width: 44, height: 24, borderRadius: Radius.full,
    position: 'relative',
  },
  switchKnob: {
    position: 'absolute', top: 3,
    width: 18, height: 18, borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, shadowRadius: 2, elevation: 2,
  },

  // SegmentedControl
  segTrack: {
    flexDirection: 'row', borderRadius: Radius.full,
    padding: 3, gap: 2,
  },
  segOption: {
    flex: 1, height: HIT_TARGET,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  segLabel: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.medium,
    fontSize:   FontSize.md,
    includeFontPadding: false,
  },

  // Input
  inputLabel: {
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.medium,
    fontSize:   FontSize.smmd,
    marginBottom: Spacing.s6,
    includeFontPadding: false,
  },
  input: {
    height: HIT_TARGET,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.s14,
    fontFamily: FontFamily.sans,
    fontWeight: FontWeight.regular,
    fontSize:   FontSize.base,
    includeFontPadding: false,
  },
});
