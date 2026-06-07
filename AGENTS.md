# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Claude / Agent context

Quick-start guide for future Claude sessions on this codebase.

## App summary

**UnFocus** — ADHD life-management app (React Native / Expo SDK 56, TypeScript, Expo Router, Zustand + SQLite). Local-only, no backend. Norwegian-first but fully bilingual (EN/NO). Target: iOS + Android.

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
- `useT()` depends on `useSettingsStore`, so it re-renders when language changes — this is intentional
- `QuickAddSheet` day options are memoized on `t.today`/`t.tomorrow` — they'll update when language changes
- The scan OCR is a stub (always returns Melk/Brød/Egg). Real OCR needs a backend service (Google Vision, AWS Textract). A demo-mode banner is shown when parsed items are present.
- `BubbleMenu` labels (`'Ny opp.'`, `'Handle'`, etc.) are not translated — they're tiny 2-word abbreviations in the radial bubbles
- `completedCount` in `useTaskStore` counts all-time done tasks (intentional — cumulative "small things add up" philosophy)
- `backlogTasks(today)` only returns non-recurring tasks; recurring tasks reappear by date schedule

## EAS Build

- Workflow: `.github/workflows/build-android.yml` — triggers on push to `claude/adhd-task-life-app-TOdFj`
- Produces an Android APK downloadable from expo.dev → Builds section
- Uses `eas build --platform android --profile preview --non-interactive`
- Push to branch to trigger a build; download from **expo.dev → project → Builds** (not Updates)
