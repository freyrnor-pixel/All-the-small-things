# Screen Update Template: Applying the Design System

This document provides a step-by-step template for updating any screen to match the UnFocus Design System. Use this as a guide when working on the 11 screens in Phase 7.

## Quick Checklist for Every Screen

- [ ] Import necessary theme tokens: `useAppTheme()`, `Fonts`, `FontSize`, `Spacing`, `Radius`
- [ ] Replace all hardcoded colors with theme colors
- [ ] Replace all hardcoded spacing/padding with `Spacing.*` constants
- [ ] Replace all hardcoded border-radius with `Radius.*` constants
- [ ] Update Button components to use new spec (size: sm/md/lg, variant: primary/secondary/danger/ghost)
- [ ] Update IconButton components to use new spec (size default 36, label required, active prop)
- [ ] Ensure all text is passed through `useT()` — no hardcoded strings
- [ ] Add HintCard at the top of scrollable content (if showHints is true)
- [ ] Test in light mode, dark mode, all 5 color schemes
- [ ] Verify 44px+ tap targets on all interactive elements

---

## Detailed Steps

### 1. Import Phase

**Remove**:
```tsx
import { Colors, FontSize, Radius, Spacing, Layout, Fonts } from '@/constants/theme';
```

**Replace with**:
```tsx
import { FontSize, Radius, Spacing, Layout, Fonts } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
```

**Why**: `useAppTheme()` returns theme-aware colors based on user's chosen scheme + dark mode. Static `Colors` breaks dark mode.

---

### 2. Component Instance Updates

#### Button Component

**Old** (before):
```tsx
<Button
  label={t.someAction}
  onPress={() => { /* ... */ }}
  variant="primary"
/>
```

**New** (after):
```tsx
<Button
  label={t.someAction}
  onPress={() => { /* ... */ }}
  variant="primary"
  size="lg"  // sm/md/lg — defaults to md
/>
```

**Key changes**:
- Add explicit `size` if not default (md)
- Use `iconRight="chevron-forward"` instead of just `icon` if icon is on right
- No need for manual color props — derived from variant

#### IconButton Component

**Old** (before):
```tsx
<IconButton
  icon="settings-outline"
  accessibilityLabel="Settings"
  onPress={() => { /* ... */ }}
/>
```

**New** (after):
```tsx
<IconButton
  icon="settings-outline"
  label="Settings"  // Required; was accessibilityLabel
  onPress={() => { /* ... */ }}
  size={36}  // default; adjust if needed
  active={isSettingsActive}  // new: show active state
/>
```

**Key changes**:
- `label` is now required (replaces `accessibilityLabel`)
- Add `active` prop if this icon represents an active state
- Add `size` if not default (36)
- No need for manual color props

#### Checkbox / Switch

**Old** (before):
```tsx
<Checkbox
  checked={isDone}
  onChange={(next) => toggleTask(next)}
  label={t.taskTitle}
/>
```

**New** (after):
```tsx
<Checkbox
  checked={isDone}
  onChange={(next) => toggleTask(next)}
  label={t.taskTitle}
/>
```

**No changes needed** — component is already updated.

#### Input

**Old** (before):
```tsx
<TextInput
  placeholder="Enter name…"
  value={name}
  onChangeText={setName}
  style={{ color: theme.text }}
/>
```

**New** (after):
```tsx
<Input
  label={t.nameLabel}  // optional label above input
  placeholder={t.namePlaceholder}  // already localized
  value={name}
  onChangeText={setName}
  error={error && t.errorNameRequired}  // optional error below
/>
```

**Key changes**:
- Use `Input` component (from FormControls) instead of raw `TextInput`
- All text through `useT()`
- Component handles theming automatically

---

### 3. Color Updates

**Old** (hardcoded):
```tsx
<View style={{ backgroundColor: '#F2F8FE', borderColor: '#CDE6FA' }}>
  <Text style={{ color: '#142545' }}>Some text</Text>
</View>
```

**New** (theme-aware):
```tsx
const theme = useAppTheme();

<View style={{ backgroundColor: theme.cream, borderColor: theme.border }}>
  <Text style={{ color: theme.text }}>Some text</Text>
</View>
```

**Color mapping**:
| Design | Code | Use |
|--------|------|-----|
| Primary (button fill) | `theme.orange` | Buttons, active state, accents |
| Primary light (soft pill) | `theme.orangeLight` | Soft background, secondary buttons |
| Secondary (success, done) | `theme.green` | Done checkmarks, completion states |
| Deep accent | `theme.brown` | Strong headings, deep ink |
| Neutral (shame-free) | `theme.neutral` | Empty states, unchecked items |
| Text body | `theme.text` | All body text |
| Text muted | `theme.textLight` | Captions, secondary text |
| Danger | `theme.danger` | Error states |
| Border | `theme.border` | Card borders, dividers |
| Card surface | `theme.white` | Card backgrounds |
| Sunken surface | `theme.offWhite` | Empty states, wells |
| Hint background | `theme.hintBg` | Hint cards |
| Hint border | `theme.hintBorder` | Hint card borders |
| Hint accent | `theme.hintAccent` | Hint card icons |

---

### 4. Spacing Updates

**Old** (magic numbers):
```tsx
const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 16 },
  card: { marginBottom: 12, padding: 18 },
  divider: { height: 1, marginVertical: 8 },
});
```

**New** (spacing tokens):
```tsx
import { Spacing, Layout } from '@/constants/theme';

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  card: { marginBottom: Spacing.sm, padding: Layout.cardPadding },
  divider: { height: 1, marginVertical: Spacing.xs },
});
```

**Spacing scale**:
| Token | Value | Use |
|-------|-------|-----|
| `Spacing.xs` | 4px | Extra small gaps (icon margins) |
| `Spacing.sm` | 8px | Small gaps (between elements) |
| `Spacing.md` | 16px | Medium gaps (section padding) |
| `Spacing.lg` | 24px | Large gaps (screen padding) |
| `Spacing.xl` | 32px | Extra large gaps (major sections) |
| `Spacing.xxl` | 48px | Massive gaps (rarely used) |
| `Layout.cardPadding` | 18px | Standard card inner padding |
| `Layout.cardGap` | 14px | Gap between card rows |

---

### 5. Typography Updates

**Old** (hardcoded sizes):
```tsx
<Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text }}>
  Section Title
</Text>
```

**New** (tokens + theme):
```tsx
import { FontSize, Fonts } from '@/constants/theme';

const theme = useAppTheme();

<Text style={{ fontSize: FontSize.md, fontWeight: Fonts.semibold, color: theme.text }}>
  Section Title
</Text>
```

**Font scale**:
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `FontSize.xs` | 12px | regular | Captions, hints |
| `FontSize.sm` | 14px | regular/semibold | Small text, labels |
| `FontSize.md` | 16px | medium/semibold | Body text, form inputs |
| `FontSize.lg` | 18px | semibold | Section headers, callouts |
| `FontSize.xl` | 22px | bold | Screen titles |
| `FontSize.xxl` | 28px | bold | Major headings |
| `FontSize.hero` | 36px | extrabold | Splash text |

**Font weights**:
| Token | Weight | Use |
|-------|--------|-----|
| `Fonts.regular` | 400 | Body text |
| `Fonts.medium` | 500 | Form labels, captions |
| `Fonts.semibold` | 600 | Section headers (calm, non-heavy) |
| `Fonts.bold` | 700 | Emphasis, important text |
| `Fonts.extrabold` | 800 | Rarely used; splash/hero text |

---

### 6. Radius Updates

**Old** (hardcoded):
```tsx
const styles = StyleSheet.create({
  card: { borderRadius: 12 },
  button: { borderRadius: 8 },
});
```

**New** (tokens):
```tsx
import { Radius } from '@/constants/theme';

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md },  // 18px
  button: { borderRadius: Radius.full },  // 999px (pill shape)
  chip: { borderRadius: Radius.sm },  // 10px
});
```

**Radius scale**:
| Token | Value | Use |
|-------|-------|-----|
| `Radius.sm` | 10px | Small elements (chips, small buttons) |
| `Radius.md` | 18px | Standard cards, modals |
| `Radius.lg` | 26px | Large surfaces (sheets) |
| `Radius.full` | 999px | Circles, pills, buttons |

---

### 7. HintCard Addition

**Every scrollable screen should have a HintCard near the top**:

```tsx
import HintCard from '@/components/HintCard';

export default function MyScreen() {
  const t = useT();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* HintCard goes right at the top of content, before other sections */}
        <HintCard text={t.hints.myScreen.text} />

        {/* Rest of screen content */}
        <View>{ /* ... */ }</View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

**Important**:
- HintCard is gated on `showHints` setting — it returns null if hints are off
- Always pass localized text through `t.hints.screenName.text`
- If hint has an example/subtext, use `example={t.hints.screenName.example}`

---

### 8. Screen Layout Template

**Standard screen structure**:

```tsx
import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useT } from '@/lib/i18n';
import { FontSize, Radius, Spacing, Layout, Fonts } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import Button from '@/components/Button';
import IconButton from '@/components/IconButton';
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import BottomNav, { BOTTOM_NAV_HEIGHT } from '@/components/BottomNav';

export default function MyScreen() {
  const router = useRouter();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const [someState, setSomeState] = useState(null);

  // Load data from stores as needed
  // const items = useMyStore((s) => s.items);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        {/* Header with title + actions */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t.screenTitle}</Text>
          <IconButton
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/settings')}
          />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT }}>
          {/* Hint card (optional) */}
          <HintCard text={t.hints.myScreen.text} />

          {/* Main content */}
          <Surface>
            {/* content */}
          </Surface>

          {/* More sections as needed */}
        </ScrollView>

        {/* Bottom nav */}
        <BottomNav />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#transparent',  // ScreenBackground handles bg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: Fonts.semibold,
  },
  scroll: {
    flex: 1,
  },
});
```

---

## Screens to Update (11 total)

### Group 1: Onboarding (7 screens)
1. `/app/onboarding/language.tsx` — Language selector (EN/NO)
2. `/app/onboarding/privacy.tsx` — Privacy notice
3. `/app/onboarding/guided.tsx` — Guided vs explore choice
4. `/app/onboarding/index.tsx` — Name entry
5. `/app/onboarding/step2.tsx` — Work mode toggle
6. `/app/onboarding/step3.tsx` — Shopping days picker
7. `/app/onboarding/step4.tsx` — Notification permissions
8. `/app/onboarding/step5.tsx` — Theme + handedness picker (likely mostly done)
9. `/app/onboarding/step6.tsx` — Pet naming

### Group 2: Main Tabs (4 screens)
1. `/app/index.tsx` — Home (most complex; most-used)
2. `/app/plans.tsx` — Full day plan view
3. `/app/shopping.tsx` — Shopping list
4. `/app/habits.tsx` — Habit tracker
5. `/app/health.tsx` — Wellness journal
6. `/app/scan.tsx` — Receipt OCR
7. `/app/settings.tsx` — Settings (many toggles/pickers)

---

## Validation Checklist per Screen

After updating each screen:

- [ ] All text comes from `useT()` — no hardcoded strings
- [ ] All colors come from `theme.*` — no hardcoded hex
- [ ] All spacing uses `Spacing.*` or `Layout.*` — no magic numbers
- [ ] All border-radius uses `Radius.*` — no hardcoded values
- [ ] Button variants are correct (primary/secondary/danger/ghost)
- [ ] IconButton has `label` prop (accessibility)
- [ ] HintCard present (if applicable)
- [ ] ScreenBackground wraps the screen
- [ ] BottomNav present (for tab screens)
- [ ] 44px+ tap targets on all interactive elements
- [ ] Tested in light mode + all 5 color schemes
- [ ] Tested in dark mode
- [ ] No TypeScript errors (when ready to check)
- [ ] No unused imports

---

## Example: Updating the Language Selection Screen

### Before (Current)

```tsx
// app/onboarding/language.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';

const LANGUAGES = [
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function LanguageScreen({ onSelect }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a language</Text>
      <View style={styles.list}>
        {LANGUAGES.map((lang) => (
          <Pressable
            key={lang.code}
            style={styles.button}
            onPress={() => onSelect(lang.code)}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={styles.label}>{lang.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F2F8FE',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#142545',
    marginBottom: 32,
    textAlign: 'center',
  },
  list: {
    gap: 16,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#CDE6FA',
  },
  flag: {
    fontSize: 48,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#142545',
  },
});
```

### After (Updated to Design System)

```tsx
// app/onboarding/language.tsx
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontSize, Fonts, Spacing, Radius } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';
import { useT } from '@/lib/i18n';
import Button from '@/components/Button';
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';

export default function LanguageScreen({ onSelect }) {
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const languages = [
    { code: 'no', label: 'Norsk', flag: '🇳🇴' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.cream }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {/* Logo/icon area */}
          <View style={styles.iconArea}>
            <Text style={styles.icon}>🌍</Text>
          </View>

          {/* Heading */}
          <Text style={[styles.title, { color: theme.text }]}>
            {t.onboarding.language.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textLight }]}>
            {t.onboarding.language.subtitle}
          </Text>

          {/* Hint */}
          <HintCard
            text={t.hints.onboarding.language.text}
            style={styles.hint}
          />

          {/* Language options */}
          <Surface style={styles.surface}>
            <View style={styles.languageList}>
              {languages.map((lang, idx) => (
                <View key={lang.code}>
                  <Button
                    label={`${lang.flag}  ${lang.label}`}
                    onPress={() => onSelect(lang.code)}
                    variant="secondary"
                    size="lg"
                    full
                    style={styles.langButton}
                  />
                  {idx < languages.length - 1 && (
                    <View
                      style={[styles.divider, { backgroundColor: theme.border }]}
                    />
                  )}
                </View>
              ))}
            </View>
          </Surface>

          {/* Bottom text */}
          <Text style={[styles.footnote, { color: theme.textLight }]}>
            {t.onboarding.language.footnote}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  content: {
    gap: Spacing.lg,
  },
  iconArea: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    fontSize: FontSize.xxl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  hint: {
    marginVertical: Spacing.md,
  },
  surface: {
    marginVertical: Spacing.lg,
  },
  languageList: {
    gap: Spacing.sm,
  },
  langButton: {
    marginVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  footnote: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
```

**Key changes**:
- Imports: `useAppTheme()`, `useScaledStyles()`, `useT()` added
- Colors: Theme-aware `theme.cream`, `theme.text`, etc.
- Spacing: `Spacing.*` constants throughout
- Components: Uses `Button` instead of raw `Pressable`
- Text: All from `useT()` — no hardcoded strings
- Layout: SafeAreaView, ScrollView, Surface wrapper
- HintCard: Added for onboarding context

---

## Tips for Efficient Updating

1. **Work screen by screen** — commit after each screen
2. **Copy the template** — use the template above for new screens
3. **One color map at a time** — fix one type of color per pass
4. **Search & replace** — use IDE find/replace for systematic changes
5. **Test incrementally** — verify light + dark mode after each screen
6. **i18n as you go** — add translation keys as you encounter hardcoded strings

---

## What NOT to Do

- ❌ Do NOT use static `Colors` import — breaks dark mode
- ❌ Do NOT hardcode hex colors — use `theme.*`
- ❌ Do NOT hardcode spacing — use `Spacing.*`
- ❌ Do NOT create custom border-radius — use `Radius.*`
- ❌ Do NOT use old Button API — update to new spec
- ❌ Do NOT forget `label` on IconButton — needed for accessibility
- ❌ Do NOT skip HintCard — add to every scrollable screen
- ❌ Do NOT forget `useScaledStyles()` — needed for font size scaling

---

Good luck! This is a substantial but systematic refactoring. Take it one screen at a time.
