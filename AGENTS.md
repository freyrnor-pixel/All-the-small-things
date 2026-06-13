# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Claude / Agent context

Quick-start guide for future Claude sessions on this codebase.

## App summary

**UnFocus** — ADHD life-management app (React Native / Expo SDK 56, TypeScript, Expo Router, Zustand + SQLite). Local-only, no backend. Norwegian-first but fully bilingual (EN/NO). Target: iOS + Android.

## Read the file header first

Every `.ts`/`.tsx` file starts with a JSDoc header block. **Read it before editing — it is the fastest way to orient.** Format:

```
/**
 * <filename> — <one-line purpose>
 *
 * <1–3 sentence description>
 *
 * Connections:
 *   Imports → <local @/ deps>
 *   Used by → <files that import this, or the Expo Router route>
 *   Data    → <SQLite tables / Zustand store / notifications>
 *
 * Edit notes:
 *   - <file-specific gotchas>
 * /
```

- **Use by → / Imports →** are a hand-maintained dependency map. To find every caller of a module, open the module and read its `Used by →` line (or grep `from '@/<path>'`). When you add/remove an import or change who consumes a file, **update the affected headers** (both ends) so the map stays true.
- **Edit notes** capture the real traps for that file — honour them.
- Two files are intentionally dead and labelled as such: `App.tsx` (leftover Expo template; real entry is `index.ts`) and `lib/seed.ts` (legacy catalog seeder; the live one is `lib/catalogSeed.ts`). Don't wire either back in.

## Key invariants — do NOT break these

| Rule | Why |
|---|---|
| `slug` in `app.json` MUST stay `all-the-small-things` | EAS project is registered under this slug; changing it breaks builds |
| All strings through `useT()` from `lib/i18n.ts` | Bilingual app — never hardcode UI text |
| Date format is always `YYYY-MM-DD` strings | Used as keys throughout the stores |
| `todayStr()` / `dateStr(d)` from `lib/date.ts` | Shared helpers — do not re-implement locally |
| SQLite file name: `unfocus.db` | Set in `lib/db.ts` |
| New DB columns: `ALTER TABLE … ADD COLUMN` in migrations array | Runs once on upgrade; never drop or recreate tables |

## Architecture at a glance

```
Screens (app/)  →  Zustand stores (store/)  →  SQLite (lib/db.ts)
                                               ↑
                       lib/i18n.ts (useT)  ───┘
                       lib/date.ts (dateStr, todayStr)
                       constants/theme.ts (getTheme, Colors)
```

- **Navigation**: file-based Expo Router; no bottom tabs — a radial FAB (`BubbleMenu`) is the only nav entry point
- **Onboarding**: language → guided/explore choice → name → work mode → shopping day → notifications → theme → home
- **i18n**: `const t = useT()` in any component; `t.someKey`; add new keys to both `en` and `no` objects in `lib/i18n.ts`

## Common tasks

### Add a new screen
1. Create `app/my-screen.tsx`
2. Add a bubble entry in `components/BubbleMenu.tsx` `BASE_ITEMS` array
3. Add hint strings to `lib/i18n.ts` under `hints.myScreen`
4. Add `HintCard` at the top of the scroll content

### Add a new i18n string
1. Add the key under `en` in `lib/i18n.ts`
2. Add the Norwegian equivalent under `no` (TypeScript will error if missing)
3. Use `t.myNewKey` in the component

### Add a new SQLite column
1. Add to the `migrations` array in `lib/db.ts`:
   ```ts
   "ALTER TABLE my_table ADD COLUMN new_col TEXT DEFAULT ''"
   ```
2. Update the Zustand store `load()` to read it, and `update()` to write it
3. Add the TypeScript field to the Settings/Task/etc. type

### Add a new setting toggle
1. Add field to `Settings` type and `defaultSettings` in `store/useSettingsStore.ts`
2. Add migration (see above)
3. Update `load()` and `update()` in the store
4. Add to `app/settings.tsx` UI
5. Add i18n labels

## Known gotchas

- **`StyleSheet.absoluteFill`** (not `.absoluteFillObject`) for full-screen overlays
- `useT()` depends on `useSettingsStore`, so it re-renders when language changes — this is intentional. Outside components (stores, schedulers) use `getTranslations(lang?)` instead — it reads the current language from the store when no arg is given.
- `QuickAddSheet` day options are memoized on `t.today`/`t.tomorrow` — they'll update when language changes
- The scan uses on-device OCR via `@react-native-ml-kit/text-recognition` (`parseReceiptText` in `app/scan.tsx`). Confirmed items are added to the shopping list, logged to `purchase_log`, and upserted into the `store_items` catalog (powers shopping autocomplete).
- `BubbleMenu` labels are localised via `t.nav` — add new entries there when adding a bubble.
- `completedCount` in `useTaskStore` counts all-time done tasks (intentional — cumulative "small things add up" philosophy)
- `backlogTasks(today)` only returns non-recurring tasks; recurring tasks reappear by date schedule
- **Notifications**: `lib/notifications.ts` only takes already-localised content. Per-task reminders live in `useTaskStore` and cover both kinds — one-off tasks fire once (skipped if done/past), weekly-recurring tasks fire on every selected weekday (via `scheduleWeeklyTaskNotifications`); time-box tasks also get an "end" reminder. Habit daily reminders in `useHabitStore`; weekly/monthly reminders in `lib/reminders.ts` (`syncReminders`). `settings.tsx` re-syncs on relevant changes; `_layout.tsx` and onboarding step 5 sync on startup/finish.
- **Retention**: `pruneOldData()` in `lib/db.ts` trims dated history to the last `RETENTION_DAYS` (365) on startup; config tables are left untouched.

## Builds and updates

### OTA updates (normal flow)
- Workflow: `.github/workflows/update.yml` — triggers on every push to `main` or any `claude/**` branch
- Runs `eas update --branch preview --runtime-version 1.0.0 --message "..."` — always publishes to EAS branch `preview`, targeting the installed APK (build 148977ec, runtime 1.0.0)
- Apps pick it up automatically on next launch — no download needed
- Takes ~1–2 min on CI
- **If a new APK is built**, update `--runtime-version` in `update.yml` to match the new `version` in `app.json`

### New APK build (only when native code changes)
- Workflow: `.github/workflows/build-android.yml` — **manual trigger only** (`workflow_dispatch`)
- Use when: new native package added, `app.json` plugin changed, `eas.json` build config changed
- Produces an Android APK downloadable from **expo.dev → project → Builds** (not Updates)
- Takes ~20–30 min on CI

### When to do a new build vs. OTA update
| Change type | Need new build? |
|---|---|
| UI text, styles, logic | No — OTA handles it |
| New screen, new store | No — OTA handles it |
| Add a native package (expo install) | Yes |
| Change `app.json` plugins | Yes |
| Camera/permission changes | Yes |

### Runtime version
- Policy: `appVersion` — OTA updates only reach devices whose installed APK runtime version matches the update's runtime version
- The installed APK (build 148977ec) has runtime `1.0.0`; `app.json` is currently at `1.1.0`
- `update.yml` hardcodes `--runtime-version 1.0.0` to target the installed APK — do NOT remove this flag
- When a new APK build is done: bump `version` in `app.json`, build the APK, then update `--runtime-version` in `update.yml` to match
