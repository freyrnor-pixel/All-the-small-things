# UnFocus

An ADHD-friendly life-management app for iOS and Android. One setup, then it runs
itself — tasks, shopping, meals, health, habits, and receipt scanning, all in one
warm, low-friction place. Fully bilingual (English / Norwegian) and local-only.

## Features

- **Tasks** — assign to a day and time; *Start-at* (reminder) or *Time-box* (countdown);
  one-off or recurring. Tasks with a time get a local reminder automatically.
- **Shopping lists** — weekly list (auto-resets on your chosen day) + monthly recurring
  items. Autocomplete suggests known items and pre-fills their category as you type.
- **Meals** — dish library with ingredients; push any dish straight to the shopping
  list; random meal picker.
- **Health log** — symptoms with severity, date, and notes; 30-day overview.
- **Habits** — build/break habits with optional daily reminders.
- **Receipt scan** — camera-first OCR; selected items are added to the shopping list,
  logged as purchases, and used to keep the item catalog's prices current.
- **Work mode** — separates work and personal tasks; can auto-activate during work
  hours (and stays off on weekends and Norwegian public holidays).
- **Essentials mode**, **gentle points**, **backlog**, and **four colour themes**.
- **Reminders** — a weekly planning nudge and a monthly shopping-reset reminder, in
  your chosen language.

All data is local-only. No accounts, no servers, no analytics.

## Privacy & data retention

Everything lives in a local SQLite database (`unfocus.db`) on the device. To keep the
app fast and the database small, dated history (tasks, health logs, habit logs,
purchase log, received shared items) is automatically pruned to the **last
365 days** on startup. Configuration — recurring tasks, dishes, habits, the item
catalog, and settings — is never pruned.

## Language

The language setting is purely a UI preference for the user: every screen, alert, and
notification follows the user's chosen language. Real-world data the user enters or
scans (item names, store names, prices) is content, not UI, and is left as-is.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 56 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Persistence | expo-sqlite |
| Notifications | expo-notifications |
| Camera / OCR | expo-camera, expo-image-picker, @react-native-ml-kit/text-recognition |

## Getting started

```bash
npm install
npx expo start
```

Open in Expo Go or run on a simulator/emulator. For a production build, see **Building**.

## Building

Builds are handled by [EAS Build](https://expo.dev/eas). A GitHub Actions workflow
(`.github/workflows/build-android.yml`) produces an Android APK.

> **Note:** the Expo slug is `all-the-small-things` (matches the registered EAS
> project). The display name is `UnFocus`. Do not change the slug — it will break
> EAS builds.

## Project structure

> **Tip:** every source file starts with a header comment (purpose, what it
> imports, what uses it, which data it touches, and edit gotchas). Open any file
> to see how it fits in — you rarely need to read the whole thing first.

```
index.ts          # Real app entry (expo-router/entry)
app/               # File-based routes (Expo Router) — one screen per file; onboarding/ holds the first-run wizard
components/        # Shared UI. BottomNav.tsx is the current primary nav; BubbleMenu.tsx (radial FAB) is disabled, kept for a future redesign
store/             # Zustand stores, one per domain — each owns its SQLite table(s)
lib/               # Framework-free helpers: db.ts (schema/migrations), dataAccess.ts (shared row read/write used by most stores), date.ts, i18n.ts, notifications.ts, reminders.ts, holidays.ts, catalogSeed.ts, useAppTheme.ts
constants/         # theme.ts — colours, spacing, shadows, theme presets
```

## Conventions

See `AGENTS.md` — file headers, key invariants, and gotchas are documented there
as the canonical reference and kept current; not duplicated here.
