# Design System Library Index

Complete index of all design system documentation libraries for UnFocus. Use this as your entry point to find the right reference for any design decision.

---

## 📚 Complete Library Set

UnFocus has **8 comprehensive design libraries** covering all visual, layout, and interaction aspects:

### 1. 🔘 **BUTTON_LIBRARY.md**
**All clickable elements, buttons, and interactive controls**

Topics covered:
- Button component (4 variants, 3 sizes)
- AddFAB (floating action button)
- IconButton (circular icon-only)
- SaveButton (animated inline save)
- Form controls (Checkbox, Switch, SegmentedControl, Input)
- Badge, Chip, Avatar
- SwatchPicker (circular selector)
- ConfirmationBanner (auto-dismiss toast)

**Use this when**: Creating buttons, designing interactions, building forms

**Key tokens**: Button variants (primary, secondary, danger, ghost), sizes (sm, md, lg)

---

### 2. 🎨 **COLOR_THEME_LIBRARY.md**
**All colours, themes, and color usage patterns**

Topics covered:
- 6 colour themes (Default, Tech, Gothic, Nature, Fluffy, Custom)
- Light & dark mode palettes (18 semantic colours each)
- When to use each colour (text, backgrounds, danger, etc.)
- Feature colours (task, scan, habits, health, etc.)
- Dark mode adaptation
- WCAG contrast compliance
- Custom theme builder

**Use this when**: Choosing colours, theming UI, ensuring accessibility

**Key tokens**: theme.orange, theme.text, theme.danger, FeatureColors.* 

---

### 3. 🔤 **TYPOGRAPHY_LIBRARY.md**
**Fonts, text sizes, weights, and hierarchy**

Topics covered:
- Nunito font family (regular through extrabold)
- 7-level text hierarchy (12–36px)
- Font weights and when to use each
- Accessibility minimums (16px body, 14px secondary)
- User-scalable font sizing
- Text colour hierarchy
- Line height & spacing

**Use this when**: Styling text, creating headings, ensuring readability

**Key tokens**: FontSize.xs–hero, Fonts.regular–extrabold

---

### 4. 📐 **SPACING_LAYOUT_LIBRARY.md**
**Spacing scales, layout tokens, and layout patterns**

Topics covered:
- Spacing scale: xs (4) through xxl (48)
- Layout tokens: card padding, gaps, breathing room
- Radius scale: sm (10) through full (999)
- 8 common layout patterns (sections, columns, floating, etc.)
- Padding vs margin rules
- Consistent rhythm and breathing room

**Use this when**: Spacing components, building layouts, creating grid systems

**Key tokens**: Spacing.xs–xxl, Layout.cardPadding, Radius.sm–full

---

### 5. 🌑 **SHADOW_ELEVATION_LIBRARY.md**
**Shadows, depth, and visual layering**

Topics covered:
- 3 shadow levels: card (subtle), cardHeavy (prominent), fab (maximum)
- iOS & Android shadow implementation
- Dark mode shadow adaptation
- Depth hierarchy and elevation
- Cross-platform testing
- When to use each shadow level

**Use this when**: Adding shadows, creating depth, layering surfaces

**Key tokens**: Shadow.card, Shadow.cardHeavy, Shadow.fab

---

### 6. 🎯 **ICON_LIBRARY.md**
**Icons, sizing, and icon usage patterns**

Topics covered:
- Ionicons reference (1000+ icons available)
- Icon sizing guide (12–32px)
- Feature-specific icons & colours
- Outlined vs filled variants
- Icon + text sizing patterns
- Accessibility labelling
- Dark mode icon colouring

**Use this when**: Choosing icons, sizing icons, ensuring accessibility

**Key icons**: FeatureColors (task, scan, habits, health, meals, shop, shared, focus, capture)

---

### 7. 🎴 **CARD_CONTAINER_LIBRARY.md**
**Cards, containers, modals, and surface patterns**

Topics covered:
- Standard card structure and styling
- Card variants (simple, with icons, with badges)
- Container patterns (sections, inset, edge-to-edge)
- Modal & bottom sheet patterns
- Cards with dividers, tints, and alerts
- Depth layering
- Reusable Card component template

**Use this when**: Creating cards, building modals, designing containers

**Key pattern**: `backgroundColor: theme.white`, `padding: Layout.cardPadding`, `...Shadow.card`

---

### 8. 📝 **FORM_PATTERNS_LIBRARY.md**
**Forms, inputs, validation, and form states**

Topics covered:
- Standard form structure & spacing
- Form field patterns (text, checkbox, toggle, radio, date/time)
- Multi-select & filter patterns
- Form sections and grouping
- Validation patterns (real-time & on-submit)
- Error handling & messaging
- Submit & loading states
- Reusable form section component

**Use this when**: Building forms, validating input, designing form flow

**Key spacing**: Between fields (Spacing.md), between sections (Spacing.lg), to actions (Spacing.xl)

---

## 🔗 How They Connect

```
Design Decision Tree:
├─ I'm designing a button/control
│  └─ → BUTTON_LIBRARY.md
├─ I'm choosing a colour
│  └─ → COLOR_THEME_LIBRARY.md
├─ I'm styling text
│  └─ → TYPOGRAPHY_LIBRARY.md
├─ I'm spacing components
│  └─ → SPACING_LAYOUT_LIBRARY.md
├─ I'm adding shadows/depth
│  └─ → SHADOW_ELEVATION_LIBRARY.md
├─ I'm choosing an icon
│  └─ → ICON_LIBRARY.md
├─ I'm building a card/modal
│  └─ → CARD_CONTAINER_LIBRARY.md
├─ I'm creating a form
│  └─ → FORM_PATTERNS_LIBRARY.md
└─ I'm starting from scratch
   └─ → Read all 8 libraries!
```

### Cross-References

Every library references related libraries. For example:
- **BUTTON_LIBRARY** → links to COLOR_THEME_LIBRARY (button colours), SPACING_LAYOUT_LIBRARY (padding)
- **CARD_CONTAINER_LIBRARY** → links to SHADOW_ELEVATION_LIBRARY (card shadows), SPACING_LAYOUT_LIBRARY (card padding)
- **FORM_PATTERNS_LIBRARY** → links to BUTTON_LIBRARY (submit buttons), CARD_CONTAINER_LIBRARY (form containers)

---

## 🎯 Quick Reference by Task

### Task: Add a new screen
1. Read **CARD_CONTAINER_LIBRARY.md** (screen layout)
2. Read **BUTTON_LIBRARY.md** (actions)
3. Use **SPACING_LAYOUT_LIBRARY.md** (grid)
4. Reference **ICON_LIBRARY.md** (affordances)

### Task: Design a form
1. Read **FORM_PATTERNS_LIBRARY.md** (form structure)
2. Read **BUTTON_LIBRARY.md** (submit buttons)
3. Use **SPACING_LAYOUT_LIBRARY.md** (spacing between fields)
4. Reference **COLOR_THEME_LIBRARY.md** (error colours)

### Task: Update button appearance
1. Read **BUTTON_LIBRARY.md** (button variants)
2. Edit `components/Button.tsx` once
3. All screens automatically inherit the change

### Task: Change colour scheme
1. Read **COLOR_THEME_LIBRARY.md** (theme system)
2. User selects new theme in Settings
3. All screens automatically adapt (light mode, dark mode, all themes)

### Task: Create a new site/feature
1. Use **BUTTON_LIBRARY.md** checklist (which button for each action?)
2. Use **CARD_CONTAINER_LIBRARY.md** (layout structure)
3. Use **FORM_PATTERNS_LIBRARY.md** (inputs if needed)
4. Use **SPACING_LAYOUT_LIBRARY.md** (consistency)

---

## 📊 Token Inventory

All tokens live in `constants/theme.ts`. Here's what each library covers:

| Token Type | Defined In | Libraries |
|-----------|-----------|-----------|
| Colours (18 per theme) | `THEMES`, `DARK_THEMES` | COLOR_THEME_LIBRARY |
| Font sizes | `FontSize` | TYPOGRAPHY_LIBRARY |
| Font weights | `Fonts` | TYPOGRAPHY_LIBRARY |
| Spacing | `Spacing` | SPACING_LAYOUT_LIBRARY |
| Corners | `Radius` | SPACING_LAYOUT_LIBRARY |
| Shadows | `Shadow` | SHADOW_ELEVATION_LIBRARY |
| Layout | `Layout` | SPACING_LAYOUT_LIBRARY |
| Feature colours | `FeatureColors` | COLOR_THEME_LIBRARY, ICON_LIBRARY |

---

## 🚀 Starting a New Feature: Checklist

When building a new site or feature, use this checklist:

**Planning Phase:**
- [ ] Read BUTTON_LIBRARY.md – which buttons do I need?
- [ ] Read CARD_CONTAINER_LIBRARY.md – what's the layout?
- [ ] Read FORM_PATTERNS_LIBRARY.md – do I need forms?
- [ ] Read ICON_LIBRARY.md – which icons will I use?

**Design Phase:**
- [ ] Check COLOR_THEME_LIBRARY.md – am I using colours correctly?
- [ ] Check TYPOGRAPHY_LIBRARY.md – is my text hierarchy clear?
- [ ] Check SPACING_LAYOUT_LIBRARY.md – is spacing consistent?
- [ ] Check SHADOW_ELEVATION_LIBRARY.md – is depth correct?

**Implementation Phase:**
- [ ] Use token values (never hardcode)
- [ ] Test on light and dark modes
- [ ] Test on all 6 themes
- [ ] Verify accessibility (touch targets, labels, contrast)
- [ ] Cross-reference with existing screens

**Review Phase:**
- [ ] Do all buttons follow BUTTON_LIBRARY patterns?
- [ ] Is layout consistent with CARD_CONTAINER_LIBRARY?
- [ ] Do forms follow FORM_PATTERNS_LIBRARY?
- [ ] Are tokens used everywhere (no hardcoded values)?

---

## 💡 Design System Philosophy

**Single Source of Truth**: Each visual aspect is documented once. Change that one place, and all 50+ screens automatically inherit the update.

**Token-Based**: Never hardcode values. Always use `Spacing.md`, `FontSize.lg`, `theme.orange`, etc.

**Theme-Aware**: All components adapt to light/dark mode and all 6 themes automatically.

**Accessible**: Touch targets ≥44px, contrast ratios ≥4.5:1, meaningful icons have labels.

**Consistent**: Same spacing rhythm, shadow levels, and colour usage everywhere.

---

## 📚 Related Documentation

Beyond the 8 design libraries, these docs provide additional context:

- **ANIMATION_GUIDELINES.md** – Motion, timing, easing, haptics
- **BOTTOMSHEET_GUIDE.md** – Bottom sheet implementation specifics
- **AGENTS.md** – Architecture, data flow, key invariants
- **DESIGN_SYSTEM_IMPLEMENTATION.md** – Full system overview

---

## 🔍 Finding What You Need

### By Component Type
- Buttons → **BUTTON_LIBRARY.md**
- Text → **TYPOGRAPHY_LIBRARY.md**
- Spacing & Layout → **SPACING_LAYOUT_LIBRARY.md**
- Colours → **COLOR_THEME_LIBRARY.md**
- Icons → **ICON_LIBRARY.md**
- Cards & Modals → **CARD_CONTAINER_LIBRARY.md**
- Forms & Inputs → **FORM_PATTERNS_LIBRARY.md**
- Shadows & Depth → **SHADOW_ELEVATION_LIBRARY.md**

### By Audience
- **Developers adding features** → Start with relevant library above, cross-reference as needed
- **Designers reviewing spec** → Read all 8 libraries for system overview
- **New team members** → Start here, then read AGENTS.md for architecture
- **Maintaining consistency** → Use these as audit checklist

---

## 🎓 Learning Path

### Day 1: Foundational
1. Read BUTTON_LIBRARY.md (components & variants)
2. Read COLOR_THEME_LIBRARY.md (palette & usage)
3. Read TYPOGRAPHY_LIBRARY.md (text hierarchy)

### Day 2: Layout & Structure
1. Read SPACING_LAYOUT_LIBRARY.md (spacing & rhythm)
2. Read CARD_CONTAINER_LIBRARY.md (surface patterns)
3. Read SHADOW_ELEVATION_LIBRARY.md (depth)

### Day 3: Details & Patterns
1. Read ICON_LIBRARY.md (icons & accessibility)
2. Read FORM_PATTERNS_LIBRARY.md (inputs & validation)
3. Review all 8 libraries for cross-connections

### Ongoing
- Reference relevant library when designing/implementing
- Use as audit checklist when reviewing PRs
- Link to libraries in code comments when design choice is non-obvious

---

## ✅ Quality Standards

When reviewing design/code, check:

- [ ] Are all colours from `useAppTheme()` or `FeatureColors`?
- [ ] Are all sizes from `FontSize`, `Spacing`, `Radius` tokens?
- [ ] Are all fonts from `Fonts` tokens?
- [ ] Are all shadows from `Shadow` tokens?
- [ ] Do buttons follow **BUTTON_LIBRARY** patterns?
- [ ] Do forms follow **FORM_PATTERNS_LIBRARY** patterns?
- [ ] Do cards follow **CARD_CONTAINER_LIBRARY** patterns?
- [ ] Is text hierarchy clear per **TYPOGRAPHY_LIBRARY**?
- [ ] Is spacing consistent per **SPACING_LAYOUT_LIBRARY**?
- [ ] Are icons accessible per **ICON_LIBRARY**?
- [ ] Do interactions respect **ANIMATION_GUIDELINES**?

---

## 📞 Questions?

If you're not sure which library to check:

1. **"What button should I use?"** → BUTTON_LIBRARY.md
2. **"What colour should this be?"** → COLOR_THEME_LIBRARY.md
3. **"How much space between these?"** → SPACING_LAYOUT_LIBRARY.md
4. **"Is this text big enough?"** → TYPOGRAPHY_LIBRARY.md
5. **"Which icon goes here?"** → ICON_LIBRARY.md
6. **"How do I build a modal?"** → CARD_CONTAINER_LIBRARY.md
7. **"How do I build a form?"** → FORM_PATTERNS_LIBRARY.md
8. **"Why does this card look flat?"** → SHADOW_ELEVATION_LIBRARY.md

---

## 🎯 At a Glance

```
8 Design Libraries
├─ BUTTON_LIBRARY           (13 components, interactions)
├─ COLOR_THEME_LIBRARY      (6 themes, 18 colours each)
├─ TYPOGRAPHY_LIBRARY       (5 fonts, 7 sizes, hierarchy)
├─ SPACING_LAYOUT_LIBRARY   (6 spacing levels, 4 radius levels)
├─ SHADOW_ELEVATION_LIBRARY (3 shadow levels, depth)
├─ ICON_LIBRARY             (Ionicons reference, sizing)
├─ CARD_CONTAINER_LIBRARY   (8 card patterns, modals)
└─ FORM_PATTERNS_LIBRARY    (forms, inputs, validation)

= Complete Design System
  for 50+ screens
  across all themes & modes
  with consistent visual language
```

---

**Last updated**: 2026-06-27  
**Status**: Complete design system libraries (8 docs, 3000+ lines)  
**Coverage**: Components, colours, typography, spacing, shadows, icons, cards, forms  
**Token-based**: All values sourced from `constants/theme.ts`  
**Theme-aware**: Light, dark, and 6 colour themes  
**Accessible**: WCAG AA compliant with detailed guidelines
