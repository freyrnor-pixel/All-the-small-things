# UnFocus

An ADHD-friendly life-management app for iOS and Android. One setup, then it runs itself — tasks, shopping, meals, health, and receipt scanning, all in one warm and low-friction place.

## Features

- **Tasks** — assign to a specific day and time; *Start-at* (reminder) or *Time-box* (countdown timer); one-off or recurring
- **Shopping lists** — weekly list (auto-resets on your chosen day) + monthly recurring items; preview on home screen
- **Meals** — dish library with ingredients; push any dish straight to the shopping list; random meal picker
- **Health log** — symptoms with severity, date, and notes; 30-day overview
- **Receipt scan** — camera-first flow; parsed items selectable for the shopping list (demo mode, real OCR requires a backend)
- **Work mode** — separates work and personal tasks; toggleable from home or auto-activated by work hours
- **Essentials mode** — shows only tasks marked "essential" for focus days
- **Gentle points** — opt-in cumulative "you've done X things" counter; no streaks, no pressure
- **Backlog** — overdue non-recurring tasks shown softly below today's tasks
- **Bilingual** — English and Norwegian, selectable on first launch and in Settings
- **Themes** — four warm colour palettes; swap in Settings

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 56 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Persistence | expo-sqlite |
| Notifications | expo-notifications |
| Camera/gallery | expo-image-picker |

All data is local-only. No accounts, no servers, no analytics.

## Getting started

```bash
npm install
npx expo start
```

Open in Expo Go or run on a simulator/emulator. For a production build, see **Building**.

## Building

Builds are handled by [EAS Build](https://expo.dev/eas). A GitHub Actions workflow (`.github/workflows/build-android.yml`) triggers on push to the `claude/adhd-task-life-app-TOdFj` branch and produces an Android APK.

> **Note:** The Expo slug is `all-the-small-things` (matches the registered EAS project). The display name is `UnFocus`. Do not change the slug — it will break EAS builds.

## Project structure

```
app/
  index.tsx              # Home screen
  task-form.tsx          # Add / edit task
  shopping.tsx           # Weekly + monthly shopping lists
  meals.tsx              # Dish library
  health.tsx             # Health log
  scan.tsx               # Receipt scanner
  settings.tsx           # App settings
  onboarding/
    language.tsx         # Language selection (first screen)
    guided.tsx           # Guided vs explore choice
    index.tsx            # Name entry (step 1)
    step2–5.tsx          # Work mode, shopping day, notifications, theme
components/
  BubbleMenu.tsx         # Radial FAB navigation
  QuickAddSheet.tsx      # Bottom sheet for fast task capture
  TaskItem.tsx
  ExpandableCard.tsx
  ShoppingRow.tsx
  HintCard.tsx           # Per-screen hint (toggleable in Settings)
store/
  useTaskStore.ts
  useShoppingStore.ts
  useMealStore.ts
  useHealthStore.ts
  useSettingsStore.ts
lib/
  db.ts                  # SQLite schema + migrations (file: unfocus.db)
  date.ts                # Shared date helpers (todayStr, dateStr)
  i18n.ts                # EN/NO translation system (useT hook)
  notifications.ts
  ocr.ts
constants/
  theme.ts               # Colours, spacing, shadows, four theme presets
```

## Conventions

- **Date format** everywhere: `YYYY-MM-DD` string. Use `todayStr()` / `dateStr(d)` from `lib/date.ts`.
- **Translations**: all user-visible strings go through `useT()` from `lib/i18n.ts`. Never hardcode Norwegian or English strings in components.
- **Theme colours**: always use `getTheme(settings.colorTheme)` for dynamic colours; `Colors.*` only for static values that don't change with theme.
- **Store selectors**: one `useSettingsStore` call per component, selecting only what's needed.
- **SQLite migrations**: add new columns as `ALTER TABLE … ADD COLUMN` entries in the migrations array in `lib/db.ts`. They run once on first open after upgrade.
