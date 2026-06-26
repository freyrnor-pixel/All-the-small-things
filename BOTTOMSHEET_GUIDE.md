# BottomSheet Component — Implementation Guide

## Overview

`components/BottomSheet.tsx` is a keyboard-aware bottom sheet with spring animation and drag-to-dismiss, built for React Native/Expo using `react-native-reanimated`.

Derived from the UnFocus Design System (v3) with React Native adaptations for keyboard anchoring, animation timing, and gesture handling.

## Design Goals

- **Keyboard-aware:** Automatically moves above the software keyboard without jumping
- **Smooth animations:** Spring open (320ms), quick exit (240ms) per app motion guidelines
- **Drag-to-dismiss:** Drag the handle down >80px to close; crosses a haptic threshold at 50%
- **Minimal shadow:** Top-edge shadow only (`-4px offset, 32px blur, 10% alpha`)
- **Accessibility:** Respects `reducedMotion` setting (snaps instantly, no easing)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | — | Controlled open state; when `true`, animates in |
| `onClose` | `() => void` | — | Called when user taps scrim, drags to dismiss, or requests close |
| `title` | `string?` | — | Heading text (bold 20px); rendered at top of sheet below handle |
| `children` | `ReactNode?` | — | Sheet body content; scrolls if content exceeds `92dvh` |
| `dragToDismiss` | `boolean` | `true` | Enable/disable drag-to-dismiss gesture; handle always visible |
| `theme` | `AppColors?` | — | Color palette (uses white/text/grayLight from theme) |
| `style` | `ViewStyle?` | — | Additional container styles (top-level sheet wrapper) |

## Usage Example

```tsx
import { useState } from 'react';
import { BottomSheet } from '@/components/BottomSheet';
import { useAppTheme } from '@/lib/useAppTheme';

export function MyScreen() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const theme = useAppTheme();

  return (
    <>
      <Pressable onPress={() => setSheetOpen(true)}>
        <Text>Open Sheet</Text>
      </Pressable>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Add Item"
        theme={theme}
      >
        <TextInput placeholder="Item name" />
        <TextInput placeholder="Price" keyboardType="decimal-pad" />
        <Pressable onPress={() => setSheetOpen(false)}>
          <Text>Done</Text>
        </Pressable>
      </BottomSheet>
    </>
  );
}
```

## Animation Details

### Open Transition
- **Duration:** 320ms (300-350ms per ANIMATION_GUIDELINES.md)
- **Easing:** Spring (`damping: 18, stiffness: 400`) for snappy, responsive feel
- **Scrim fade:** 160ms parallel opacity fade-in
- **Start position:** `translateY(100%)` (below viewport)
- **End position:** `translateY(0)` (pinned to bottom)

### Close Transition
- **Duration:** 240ms (200-250ms, faster than open per guidelines)
- **Easing:** Ease-in (deceleration as it exits)
- **Scrim fade:** 120ms parallel opacity fade-out
- **Start position:** Current translateY (from keyboard offset or user drag)
- **End position:** `translateY(screenHeight)` (below viewport)

### Keyboard Anchoring
When the keyboard appears:
1. Listen to `Keyboard.addListener('keyboardWillShow', ...)` to capture height
2. Move sheet's bottom offset by `keyboardHeight` (keeping it anchored above keyboard)
3. On keyboard dismiss, reset offset to 0
4. Transition is instant (no easing) so it feels attached to the keyboard, not animated

### Drag-to-Dismiss
- **Gesture:** Downward swipe on the handle area
- **Threshold:** 80px downward delta triggers close
- **Pre-threshold haptic:** `selection()` at 50% threshold (40px) signals intent to close
- **Confirm haptic:** `heavy()` fires when drag >80px, just before snap-close
- **Spring-back:** If released <80px, springs back to open position with same spring as open animation
- **Velocity:** Not currently considered (could be future enhancement)

## Keyboard Anchoring (React Native vs Web)

The web version uses the `visualViewport` API, which isn't available in React Native. This version uses the `Keyboard` API:

```ts
// React Native: listens to keyboard show/hide events
const showListener = Keyboard.addListener('keyboardWillShow', (e: KeyboardEvent) => {
  const kbHeight = e.endCoordinates.height; // actual keyboard height
  keyboardOffset.value = kbHeight;
});
```

**Why?** React Native's native keyboard is part of the native layer; we detect it via platform events, not the DOM.

## Reduce Motion

When `useAccessibility().reducedMotion` is `true`:
- All spring/easing animations snap instantly to their end values
- Scrim fades instantly
- Drag animations still work (important for accessibility)
- Haptics still fire (reducedMotion doesn't gate haptics, per guidelines)

Example: If user has "Reduce Motion" enabled in iOS Settings, opening the sheet appears instantly rather than sliding in.

## Styling & Customization

### Default Colors (can override via `theme`)
- **Background:** `theme.white` (#FCFDFF)
- **Title text:** `theme.text` (#1a1a1a)
- **Handle:** `theme.grayLight` (#E5E0D8)
- **Scrim:** `rgba(14, 30, 54, 0.35)` (fixed, not themed)

### Shadow
```
Top-edge shadow: 0 -4px 32px rgba(14, 30, 54, 0.10)
  + 0 -1px 0 rgba(14, 30, 54, 0.06) (hairline separator)
```

This creates the "naturally lifted" appearance per the design spec.

### Border Radius
- **Top corners:** 20px radius (bottom corners square)
- **Handle:** 2px radius (pill shape)

### Safe Area
Sheet respects `useSafeAreaInsets().bottom` — adds extra padding to the bottom of the body when on notched devices.

## Integration Pattern with Forms

This component pairs well with form inputs inside:

```tsx
<BottomSheet open={open} onClose={onClose} title="Add Item" theme={theme}>
  <View style={{ gap: 16 }}>
    <View>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} placeholder="..." />
    </View>
    <View>
      <Text style={styles.label}>Price</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" />
    </View>
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
      <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
        <Text>Cancel</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSubmit}>
        <Text>Add</Text>
      </Pressable>
    </View>
  </View>
</BottomSheet>
```

## Testing

### Manual Testing Checklist
- [ ] Open/close animations feel snappy (320ms open, 240ms close)
- [ ] Tapping scrim closes the sheet
- [ ] Dragging handle down >80px closes and triggers haptics
- [ ] Releasing <80px springs back smoothly
- [ ] Keyboard appears, sheet moves up smoothly (no jumping)
- [ ] Keyboard dismisses, sheet returns to original position
- [ ] With "Reduce Motion" enabled, animations snap instantly
- [ ] Title renders correctly and is readable
- [ ] Body content scrolls if it exceeds max height
- [ ] Safe area padding correct on notched devices

## Known Limitations & Future Work

1. **No scroll event feedback:** The design spec mentions keyboard-aware scroll-to-input, but this component doesn't auto-scroll form fields into view yet. Parents should use `ScrollViewRef.scrollToOffset()` if needed.
2. **No snap points:** The web spec mentions multi-point snap (0.4, 0.7, 1.0 of viewport), but the React Native version currently only supports fully open/closed states. Can be added by tracking drag state and snapping to defined heights.
3. **No velocity-based dismissal:** Currently uses distance threshold (80px); could be enhanced to consider swipe velocity.
4. **Max height fixed:** Currently `92dvh` in web, which isn't directly translatable to React Native. The component takes full remaining viewport height and relies on internal scrolling. Can be made configurable via a `maxHeight` prop if needed.

## Migration from `AddItemSheet`

The existing `AddItemSheet.tsx` uses React Native's `Modal` API. To migrate to `BottomSheet`:

**Before:**
```tsx
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <KeyboardAvoidingView>
    {/* content */}
  </KeyboardAvoidingView>
</Modal>
```

**After:**
```tsx
<BottomSheet open={visible} onClose={onClose} title="Add Item" theme={theme}>
  {/* content — no KeyboardAvoidingView needed, keyboard anchoring is built-in */}
</BottomSheet>
```

Benefits:
- No nested `KeyboardAvoidingView` (complexity removed)
- Drag-to-dismiss out of the box
- Automatic keyboard anchoring (no manual offset calculation)
- Spring animations match app motion language

## Files

- `components/BottomSheet.tsx` — Main component (React Native implementation)
- `components/BottomSheet.d.ts` — TypeScript definitions
- `BOTTOMSHEET_GUIDE.md` — This documentation

## References

- **Design Spec:** UnFocus Design System v3, BottomSheet section
- **Animation Guidelines:** `ANIMATION_GUIDELINES.md` — modal entry/exit timing and spring presets
- **Haptics:** `lib/haptics.ts` — `selection()` and `heavy()` for drag thresholds
