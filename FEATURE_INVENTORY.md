# UnFocus — Feature Inventory & Edit Notes (2026-06-21)

A function-by-function map of the whole app, built so you can write **Edit notes**
against each part. Every discrete function/UI element has its own `Edit notes:`
slot — fill them in, and we turn them into work.

## How to use this file

- **Section 0 (Connections map + Recurring patterns)** is the "how it all wires
  together" view — read it first to see the links between features (e.g. how
  Meals feeds Shopping feeds the Catalog feeds the Budget), and where the same
  logic repeats so we can keep it consistent everywhere.
- **Section 1 (Cross-cutting features)** covers the 7 areas from your notes,
  each with a `Connects to →` line showing its reach across the app. Your
  existing notes are pre-seeded here.
- **Sections 2–4** are the exhaustive lists: every screen, every store, every
  shared component/helper.
- Anywhere you see `Edit notes:` with nothing after it, that's yours to fill.
  Lines already filled in are your 2026-06-21 notes (lightly spell-cleaned).

---

## 0. Connections map — how the app wires together

The repo already documents links in each file header under `Connections:`
(Imports → / Used by → / Data →). This is the bird's-eye version of that.

### Major data flows

```
Meals ──(add dish ingredients)──▶ Shopping list ──▶ Catalog (autocomplete + learned prices)
  │                                     │                    │
  │                                     │                    ├─▶ Purchase log (history)
  │                                     │                    └─▶ Budget / Receipts (monthly spend)
  │                                     │
Scan (OCR receipt / QR) ──────────────┘ (adds items, learns prices, logs receipt)

Shopping monthly ↔ weekly:  list → staged → in_cart → purchased   (status pipeline)
                            monthly staple ──(allocate N)──▶ N weekly child items
                            + inventory qty tracking, payday carry-over prompt

Share:  lib/share.ts + useSharedStore  ◀──▶  Shopping · Tasks/Home · Plans
        (QR encode/decode)                    · share-modal · scan (QR import)
                                               · shared history · SharedRequestsSection

Energy check-in ──(low day)──▶ Home narrows today-tasks to priority=high only
Inbox (quick capture) ──(promote)──▶ Tasks
Automations (IFTTT) ──(trigger)──▶ Tasks done / Shopping opened → show message / add item
Habits ──(completion)──▶ Pet reacts (happy/excited)
Settings ──▶ theme · language · notifications · work/essentials filtering  (everywhere)

Notifications fan-out:
  lib/notifications.ts (primitives)
     ▲        ▲          ▲
     │        │          └── lib/reminders.ts        (weekly planning + monthly reset)
     │        └───────────── lib/habitNotifications   (per-habit daily reminder)
     └────────────────────── lib/taskNotifications    (per-task one-off + weekly + time-box end)
                  ▲ all read settings (quiet hours, language) + their store
```

### Per-feature reach (quick index)

- **Energy** → Home task filtering only.
- **Tasks/Plans** → Home, Plans screen, QuickAddSheet, DayTimeline, NextTaskCard, task reminders, Automations trigger, Share (tasks), Inbox promotion target.
- **Shopping** → Meals (ingredients in), Catalog (autocomplete), Scan (items in), Receipts/Budget, Share (shopping), SharedRequests, Pet (food reactions via item names), Automations (add item action).
- **Habits** → Habit form, daily reminder, Pet reactions, child profiles (Settings).
- **Share** → see the dedicated touchpoint list in §1.4.
- **Settings** → read by virtually every screen (theme, language, notifications, work mode, essentials mode, accessibility, pet, bubble tuning, reset cadence, budget).

### Recurring patterns / consistency callout

These patterns repeat across the app. To keep "the same logic throughout,"
changing one should mean reviewing the others:

| Pattern | Where it appears | Notes |
|---|---|---|
| **Check-off / status pipeline** | Shopping (weekly check, monthly list→staged→in_cart→purchased), Habits (count→goal), Tasks (done), Shared items (done) | Weekly shopping is a simple boolean; monthly is a 4-stage pipeline — these two are *not* consistent with each other today. |
| **List grouping** | Shopping (by category / by dish), Habits (build vs break), Meals (by meal type), Plans (anytime vs timed) | Category order is centralized in Shopping; meal types fixed in store. |
| **Add via bottom sheet** | QuickAddSheet (tasks), Shopping add sheet, Meals new-dish modal, scan manual-add | Swipe-to-close gesture + ConfirmationBanner are the shared idiom. |
| **Reminder scheduling** | Tasks, Habits, weekly/monthly reminders | All route through `lib/notifications.ts`, all defer past quiet hours, all use stable ids so re-scheduling replaces. Habits currently allow only ONE time/day (see §1.6). |
| **Hint card at top of scroll** | Nearly every screen | `components/HintCard.tsx`, gated by `showHints` setting. |
| **Confirmation banner** | Task save, capture, shopping actions | `components/ConfirmationBanner.tsx` slide-in + auto-dismiss. |
| **Pressable feedback** | All buttons/bubbles | `components/PressableScale.tsx` (scale + haptic), respects reducedMotion. |
| **Theme + material finish** | Every surface | `useAppTheme` + `getMaterialStyle` (glass/metal/rock/paper/plain), independent of colour theme. |

---

## 1. Cross-cutting features (your flagged areas)

### 1.1 Energy level
`components/EnergyCheckIn.tsx` · `store/useEnergyStore.ts` (SQLite `energy_logs`)
**Connects to →** Home only: on a `low` day, `app/index.tsx` narrows today's
visible tasks to `priority === 'high'`, layered on top of essentials/work-mode
filtering (never replacing it). Medium/high do **not** currently change anything.

- **Three-tile picker (low / medium / high)** — once-a-day energy self-report with battery emojis (🔋 / 🔋🔋 / 🔋🔋🔋).
  - Edit notes: No difference between medium and high.
- **Re-select behaviour** — tapping a tile re-sets the day's level (upsert, one row per date); no lock after first pick.
  - Edit notes:
- **Effect on home task list** — `low` filters today-tasks to high-priority only.
  - Edit notes:

### 1.2 Today's plans
`app/plans.tsx` · `components/DayTimeline.tsx` · `components/QuickAddSheet.tsx` · `store/useTaskStore.ts` (SQLite `tasks`)
**Connects to →** Home (3-item preview widget + full screen), task reminders
(`lib/taskNotifications`), Share (tasks), Inbox (promotion target), Automations
(`task_completed` trigger).

- **DayTimeline agenda** — anytime tasks first, then timed tasks on a vertical timeline.
  - Edit notes: Need a better/easier way to view "time now + rest of day." Visual improvements.
- **Live "now" marker** — re-rendered ~every 60s, inserted at the correct position in the timeline.
  - Edit notes:
- **Time-box vs start-at display** — time-box shows a span (e.g. `08:00–09:30`); start-at shows a single time.
  - Edit notes:
- **Essential star + done dimming** — essential tasks flagged; done tasks dimmed, not hidden.
  - Edit notes:
- **Home Plans widget (preview + expand)** — collapsible 3-item preview that links to the full Plans screen.
  - Edit notes:
- **Add / Share buttons (header)** — open task-form / share-modal for tasks.
  - Edit notes:

### 1.3 FAB bubble menu
`components/BubbleMenu.tsx` · bubble tuning in `store/useSettingsStore.ts`
**Connects to →** Navigation entry point for all major screens; reads
`bubbleMaterial`, `leftHanded`, and debug tuning (`bubbleSize`, `bubbleSpacing`,
`bubbleSpringIntensity`, `bubbleAnimSpeed`) from settings; haptics via `lib/haptics`.

- **Radial spinning wheel** — 3 full + 2 half-visible bubbles, drag-to-rotate with spring snap.
  - Edit notes:
- **Bubble appearance (colour + letters)** — current per-bubble look.
  - Edit notes: Gradient coloring instead of today's look. Letters must be the same color and easily readable.
- **Bubble sizing** — size currently scales with label length.
  - Edit notes: All satellite bubbles same size. Size must be big enough to fit the longest word (for any bubble/function).
- **Material finish** — glass/metal/rock/paper finish from settings, independent of colour theme.
  - Edit notes:
- **Left-handed flip** — moves FAB to bottom-left when `leftHanded` is on.
  - Edit notes:
- **Tap-to-navigate + tree-logo press flash** — taps route to home/tasks/shopping/habits/settings/scan/automations; labels localised via `t.nav`.
  - Edit notes:

### 1.4 Share function
`lib/share.ts` (QR encode/decode) · `store/useSharedStore.ts` (SQLite `shared_tasks`, `shared_shopping_items`) · `components/QRCodeDisplay.tsx` · `components/SharedRequestsSection.tsx`
**Connects to →** every per-screen Share touchpoint below. Wire format is a
versioned compact JSON (`UNFOCUS:` v1, kind `s`=shopping / `t`=task).

Per-screen Share touchpoints (the "Share per site" view you asked for):
- **Shopping screen** — header Share button → `share-modal?kind=s`; link icon → `shared` history.
  - Edit notes: Short explanation of what sharing the shopping list does (e.g. "synchronises the list" — wording TBD). Note: cross-device sync / messaging comes in a later build.
- **Home / Tasks** — `SharedRequestsSection(kind='task')` shows incoming shared tasks (accept/dismiss).
  - Edit notes:
- **Plans screen** — header Share button → `share-modal` for tasks.
  - Edit notes:
- **share-modal** — pick items/tasks, encode to QR, record as outbound shared items.
  - Edit notes:
- **Scan screen** — QR scanner imports a shared payload (decode → add locally).
  - Edit notes:
- **Shared history (`app/shared.tsx`)** — tabbed in/out list with check-off and remove.
  - Edit notes:
- **SharedRequestsSection (shopping)** — incoming shared shopping items inline above the list.
  - Edit notes:

General Share notes:
- **What "sharing" means per function** — needs a short, plain explanation on each surface.
  - Edit notes: Each share point should explain exactly what it does. Real sync between devices / sending messages is a later build.

### 1.5 Shopping list
`app/shopping.tsx` · `store/useShoppingStore.ts` (SQLite `shopping_items`) · `store/useCatalogStore.ts` (`store_items`, `purchase_log`) · `lib/catalogSeed.ts` · `app/scan.tsx` · `components/ShoppingRow.tsx` · `components/MonthlyTableRow.tsx` · `components/CarryOverPromptModal.tsx`
**Connects to →** Meals (ingredients in), Catalog (autocomplete + learned prices),
Scan (OCR/QR items in), Receipts/Budget, Share (shopping), Pet (food reactions),
Automations (`add_shopping_item`).

> Overall: **Edit notes:** Needs a big overhaul. Looks crowded and hard to read because of layout. I need input to make decisions on the redesign.

**Tabs & layout**
- **Weekly / Monthly tabs** — separate lists with badge counts and accent colour (green / orange).
  - Edit notes:
- **Section order** — hint → shared requests → summary row → (monthly action row) → "from meals" group → items → in-cart → clear/finish → purchased history → reset.
  - Edit notes: Layout feels crowded — this ordering is a prime candidate for the overhaul.

**Adding items**
- **FAB + add sheet (two tabs: Freely / From Monthly)** — manual entry or allocate from monthly staples.
  - Edit notes:
- **Manual fields (name, amount, unit, category, price, temporary flag)** — full entry form.
  - Edit notes:
- **Autocomplete suggestions** — chips from catalog, showing last-paid price; popular items when empty; excludes items already on the list.
  - Edit notes:
- **Swipe-to-close add sheet** — pan gesture on the handle, spring-back or close.
  - Edit notes:

**Categories & grouping**
- **13 fixed categories** — produce, dairy, meat, fish, bread, frozen, canned, dry, snacks, drinks, cleaning, personal, other.
  - Edit notes:
- **Canonical category order** — groceries → consumables → household → other.
  - Edit notes:
- **Group by dish** — items pushed from Meals are grouped under the dish name with icon + ingredient count + est. price.
  - Edit notes:
- **Sort unchecked alphabetically** — within/after dish groups.
  - Edit notes:

**Quantities & check-off**
- **Inline amount stepper (−/value/+)** — for numeric unchecked items.
  - Edit notes:
- **Weekly check-off (+ → in cart, − → back)** — simple boolean per item; "Clear checked items" removes them.
  - Edit notes:
- **Monthly status pipeline (list → staged → in_cart → purchased)** — circle tap stages; "Save/Add to shopping list" commits staged → in_cart; "Finish shopping" → purchased.
  - Edit notes:
- **Excel-style monthly table** — columns check / name / price / total / amount, with grand total row.
  - Edit notes:

**Monthly-specific**
- **Monthly → weekly allocation** — a monthly staple of N spawns N weekly child items; removing children decrements the allocation.
  - Edit notes:
- **Temporary items + payday carry-over** — `CarryOverPromptModal` on monthly reset asks keep/drop per temporary item (or all-carry / all-drop).
  - Edit notes:
- **Inventory qty / "Update inventory"** — manual stock tracking entry point.
  - Edit notes:

**History & reset**
- **Purchased history** — weekly grouped by week key; monthly a flat list; read-only checkmarks.
  - Edit notes:
- **Reset weekly / reset monthly** — destructive resets; monthly triggers carry-over prompt.
  - Edit notes:

**Scan / OCR (`app/scan.tsx`)**
- **Capture or pick receipt photo** — camera or library.
  - Edit notes:
- **ML Kit OCR → parsed priced items** — `parseReceiptText` in `lib/receipt.ts`, skip totals/dates, match `NAME PRICE`.
  - Edit notes:
- **Review checklist + store picker** — deselect/edit rows; pick store (REMA 1000, Kiwi, Coop Extra/Mega, Meny, Spar, Bunnpris, Joker, Prix).
  - Edit notes:
- **Add to list → records purchases + receipt** — updates shopping list, catalog (`recordPurchases`), and receipts/budget.
  - Edit notes:
- **QR scanner** — imports shared payloads.
  - Edit notes:

**Sharing (see §1.4)**
- **Share button + shared requests** — outbound share + inline incoming items.
  - Edit notes:

### 1.6 Habits
`app/habits.tsx` · `app/habit-form.tsx` · `store/useHabitStore.ts` (SQLite `habits`, `habit_logs`) · `lib/habitNotifications.ts` · `components/HabitIcon.tsx`
**Connects to →** habit reminders (`lib/habitNotifications` → `lib/notifications`),
Pet reactions on completion, child profiles (Settings).

> Overall: **Edit notes:** I need this full function list to write detailed Edit notes (this section is the list).

**Create / edit (`app/habit-form.tsx`)**
- **Kind toggle (build ↑ green / break ↓ danger)** — habit type.
  - Edit notes:
- **Title input** — required, autofocus on create.
  - Edit notes:
- **Recurrence chips (daily / weekly / monthly / once)** — stored in `recurrence`; `recurrenceDays` is saved but **not exposed in UI**.
  - Edit notes:
- **Profile assignment (Me / child names)** — conditional on existing child profiles.
  - Edit notes:
- **Notification toggle + single time picker** — ONE `notificationTime` (HH:MM, default 08:00); schedules one DAILY reminder via `syncHabitReminder`.
  - Edit notes: Add option to get a reminder several times a day. User chooses the number of times, OR the interval between reminders, plus when it should start and end. (Today only ONE fixed time is possible — needs schema + form + scheduling changes.)
- **"More options" disclosure** — reveals icon, category, 4 steps, daily goal.
  - Edit notes:
- **Icon picker (30+)** — default `star-outline`.
  - Edit notes:
- **Category chips (8)** — physical, mental, health, nutrition, sleep, work, wellbeing, other.
  - Edit notes:
- **Four steps (cue / craving / response / reward)** — BJ Fogg model fields, optional.
  - Edit notes:
- **Daily goal stepper (1–20)** — completions needed per day.
  - Edit notes:
- **Delete (edit mode)** — confirm → removes habit + all logs + cancels reminder.
  - Edit notes:

**Tracking & views (`app/habits.tsx`)**
- **Profile selector chips** — Me + child names; add child inline; long-press to remove.
  - Edit notes:
- **Today / Week / Month view tabs** — three layouts.
  - Edit notes:
- **Summary chip** — "X / Y completed" for the day.
  - Edit notes:
- **Building / Breaking sections** — grouped lists with empty-state CTAs.
  - Edit notes:
- **HabitCard (collapsible)** — header (icon, title, streak badge, progress dots, −/+); expanded (4 steps, week strip, rest-day toggle).
  - Edit notes:
- **Streak badge + dots** — consecutive met days (count ≥ goal OR rest day), 35-day window.
  - Edit notes:
- **Progress dots** — filled to count/goal ratio; partial = orange, met = green/blue, never red.
  - Edit notes:
- **Increment / decrement (−/+)** — adjust today's count; completion fires success haptic + glow + pet reaction.
  - Edit notes:
- **Rest day toggle ("no-shame")** — marks today as rest; treated as "met" for streaks.
  - Edit notes:
- **Week grid** — 7 dots per habit, today's dot highlighted.
  - Edit notes:
- **Month grid + ← → navigation** — scrollable dates, forward disabled past current month.
  - Edit notes:

### 1.7 Notes / Inbox
`store/useInboxStore.ts` (SQLite `inbox_items`) · `components/InboxSection.tsx` · `app/capture.tsx`
**Connects to →** Home (inbox display), Tasks (promote target).
> Note: there is no dedicated free-form "Notes" screen — quick thoughts live in
> the **Inbox** (capture → home list → promote/discard). The only other "notes"
> surface is the debug-overlay feedback notes (`useFeedbackStore`).

- **Quick capture (`app/capture.tsx`)** — multiline input → adds a one-liner to the inbox; confirmation banner.
  - Edit notes:
- **Inbox list on home** — shows captured thoughts.
  - Edit notes: Lacks a way of fixing/editing existing (previous) notes.
- **Promote to task** — one-tap, sensible defaults (today, start-at, regular, medium).
  - Edit notes:
- **Discard** — dismiss an inbox item.
  - Edit notes:
- **Edit existing item** — *(does not exist today)*.
  - Edit notes: This is the gap — add the ability to open and edit a previously captured note.

---

## 2. All screens (route-by-route)

Each screen: one-line purpose + discrete UI parts. Add `Edit notes:` inline as needed.

### 2.1 `/index.tsx` — Home
Daily landing: greeting, plans widget, shopping preview, points, quick actions.
- Greeting header (name + time-of-day emoji) — Edit notes:
- Progress bar + completed-count + streak — Edit notes:
- Daily overview + hint card — Edit notes:
- Inbox section (captured thoughts) — Edit notes:
- Shared requests (incoming) — Edit notes:
- Energy check-in — Edit notes:
- Next task card — Edit notes:
- Plans widget (expand/collapse) — Edit notes:
- Backlog section (undated tasks) — Edit notes:
- Shopping preview (weekly, inline checkboxes) — Edit notes:
- Points display — Edit notes:
- Settings + focus-mode buttons — Edit notes:
- Share button (tasks) — Edit notes:
- Floating add button (QuickAddSheet) — Edit notes:
- OTA "Restart" banner (when update ready) — Edit notes:

### 2.2 `/capture.tsx` — Quick Capture Inbox
Type a thought, capture to inbox instantly, no categorization.
- Back + title header — Edit notes:
- Multiline input — Edit notes:
- Capture button — Edit notes:
- Confirmation banner — Edit notes:

### 2.3 `/habits.tsx` — Habit Tracker
See §1.6 for full breakdown.
- Profile chips · view tabs · hint · summary · building/breaking lists · week grid · month grid · habit cards · add FAB — Edit notes:

### 2.4 `/health.tsx` — Health / Symptom Log
Log ailments (date, 1–5 severity, notes); 30-day overview.
- Hint card — Edit notes:
- Overview card (top ailments, frequency bar, severity strip) — Edit notes:
- Add form (date, ailment, severity picker, notes) — Edit notes:
- Confirmation banner — Edit notes:
- Log list (chronological) — Edit notes:

### 2.5 `/habit-form.tsx` — Add/Edit Habit
See §1.6.
- Kind toggle · title · recurrence · profile · notification + time · more-options (icon, category, 4 steps, goal) · delete — Edit notes:

### 2.6 `/budget.tsx` — Monthly Grocery Budget
Month's receipt total vs optional budget.
- Header link to budget settings — Edit notes:
- Progress bar (spent vs budget) — Edit notes:
- Hint text — Edit notes:
- Receipts list — Edit notes:

### 2.7 `/meals.tsx` — Dish Library
Dishes grouped by meal type; create with ingredient autocomplete.
- Random/surprise button — Edit notes:
- Hint card — Edit notes:
- Category tiles (breakfast/lunch/dinner/snack/kveldsmat) — Edit notes:
- Category dish lists (expandable) — Edit notes:
- Ingredient rows (delete per row) — Edit notes:
- "Add to shopping" (sends ingredients to list) — Edit notes:
- Delete dish — Edit notes:
- New-dish modal (meal pills, name, price, ingredients, autocomplete) — Edit notes:

### 2.8 `/automations.tsx` — IFTTT Rule Builder
When X → Then Y rules (trigger/action), toggle + delete.
- Hint card — Edit notes:
- Rule cards (summary, active toggle, delete) — Edit notes:
- New-rule form (trigger chips, action chips, param input) — Edit notes:
- Empty state — Edit notes:

### 2.9 `/scan.tsx` — Receipt OCR + QR Import
See §1.5 (Scan/OCR).
- Header budget link · hint · manual-entry link · camera hint · store chips · action buttons · preview + guide · loading · OCR empty state · parsed checklist · add-to-list · QR modal · manual-add sheet — Edit notes:

### 2.10 `/shared.tsx` — Shared Items History
Tabbed (shopping/tasks) in/out items, check-off + remove.
- Back header — Edit notes:
- Tabs (shopping/tasks) — Edit notes:
- Hint card — Edit notes:
- Active + Done sections — Edit notes:
- Empty states — Edit notes:
- Shared rows (checkbox, meta, remove) — Edit notes:

### 2.11 `/settings.tsx` — App Settings
Central config; Essentials Mode pinned at top.
- Privacy card — Edit notes:
- Essentials Mode hero toggle — Edit notes:
- Profile (name) — Edit notes:
- Language chips (EN/NO) — Edit notes:
- Appearance (colour theme grid, bubble material grid, dark mode) — Edit notes:
- Accessibility (reduced motion, font size, left-handed) — Edit notes:
- Motivation (show points, show hints) — Edit notes:
- Companion pet (enabled, name, type, colour) — Edit notes:
- Shopping (list mode, weekly reset day, monthly reset date, monthly budget) — Edit notes:
- Notifications (reminders, reminder time, task notifs, persistent notif, quiet hours, holidays, automations link) — Edit notes:
- Work Mode (active, auto-activate, work hours) — Edit notes:
- Data (debug mode, test data, destructive resets) — Edit notes:

### 2.12 `/share-modal.tsx` — QR Share Sheet
Pick items/tasks, encode to QR, record outbound. See §1.4.
- Back header · select-all toggle + checkbox list · empty state · share button (count) · QR card · done button — Edit notes:

### 2.13 `/plans.tsx` — Full-Day Plans
Expanded DayTimeline for today. See §1.2.
- Back header · add button · share button · hint · empty state · DayTimeline — Edit notes:

### 2.14 `/shopping.tsx` — Weekly & Monthly Shopping
See §1.5 for full breakdown.
- Tabs · shared requests · summary · monthly actions · dish groups · item lists · in-cart · clear/finish · purchased history · reset · add sheet · carry-over modal · FAB — Edit notes:

### 2.15 `/task-form.tsx` — Add/Edit Task
Title, date, time (or "Whenever"), type, duration, importance, priority, weekly recurrence.
- Cancel/save header — Edit notes:
- Hint card — Edit notes:
- Title input — Edit notes:
- Date week chips + calendar toggle — Edit notes:
- Time toggle (set time / whenever) + picker — Edit notes:
- Type toggle (start-at / time-box) — Edit notes:
- Duration chips (time-box) — Edit notes:
- Importance toggle — Edit notes:
- Priority toggle — Edit notes:
- Recurring toggle + day chips — Edit notes:
- Delete (edit mode) — Edit notes:
- Confirmation banner — Edit notes:

### 2.16 Onboarding (`/onboarding/*`)
Flow: language → privacy → guided/explore → name → work mode → shopping days → notifications → theme → pet → home.
- `language.tsx` — EN/NO picker — Edit notes:
- `privacy.tsx` — local-only/free-forever trust screen — Edit notes:
- `guided.tsx` — Guided vs Explore branch — Edit notes:
- `index.tsx` (step 1) — welcome + name capture + feature list — Edit notes:
- `step2.tsx` — work mode + hours — Edit notes:
- `step3.tsx` — weekly/monthly reset days — Edit notes:
- `step4.tsx` — notification confirmation — Edit notes:
- `step5.tsx` — colour theme + handedness — Edit notes:
- `step6.tsx` — companion pet naming + finish (requests notifs, schedules reminders) — Edit notes:

---

## 3. Stores (Zustand + SQLite)

Each: purpose · table(s) · what it backs. Add `Edit notes:` as needed.

- **useEnergyStore** — daily energy level · `energy_logs` · home task filtering. Edit notes:
- **useTaskStore** — one-off + weekly tasks, per-task notifications · `tasks` · Plans, Home, backlog, focus, Automations trigger. Edit notes:
- **useHabitStore** — build/break habits + daily logs + reminders · `habits`, `habit_logs` (35-day load) · Habits screens. Edit notes:
- **useShoppingStore** — weekly/monthly lists, status pipeline, allocation, carry-over · `shopping_items` · Shopping. Edit notes:
- **useCatalogStore** — grocery catalog + purchase history, typeahead, price learning · `store_items`, `purchase_log` · Shopping/Scan autocomplete, Budget. Edit notes:
- **useSettingsStore** — single-row app config (profile, theme, notifications, modes, pet, bubble tuning, budget) · `settings` · everything. Edit notes:
- **useInboxStore** — quick-capture one-liners · `inbox_items` · Home inbox, promote-to-task. Edit notes:
- **useAutomationStore** — IFTTT rules · `ifttt_rules` · Automations. Edit notes:
- **useHealthStore** — symptom/ailment log · `health_logs` · Health. Edit notes:
- **useFeedbackStore** — debug overlay notes · `feedback_notes` · DebugOverlay. Edit notes:
- **useMealStore** — dishes + ingredients, random picker · `dishes`, `ingredients` · Meals, shopping population. Edit notes:
- **useReceiptStore** — receipts for budget · `receipts` · Budget, scan. Edit notes:
- **useUpdateStore** — in-memory OTA-ready flag · (no SQLite) · Home restart banner. Edit notes:
- **useSharedStore** — shared tasks/shopping in/out · `shared_tasks`, `shared_shopping_items` · Share/QR, shared history, SharedRequestsSection. Edit notes:

---

## 4. Shared components & lib helpers

### Components
- **BubbleMenu** — radial FAB nav (see §1.3). Edit notes:
- **EnergyCheckIn** — 3-tile energy picker (§1.1). Edit notes:
- **QuickAddSheet** — bottom-sheet quick task add. Edit notes:
- **DayTimeline** — plans agenda with "now" marker (§1.2). Edit notes:
- **InboxSection** — home inbox list + promote (§1.7). Edit notes:
- **SharedRequestsSection** — inline incoming shared items. Edit notes:
- **ShoppingRow** — shopping item row. Edit notes:
- **MonthlyTableRow** — monthly status-pipeline row. Edit notes:
- **CarryOverPromptModal** — payday keep/drop modal. Edit notes:
- **DatePickerCalendar** — month/date picker. Edit notes:
- **TaskItem** — task row (checkbox, time, priority, star). Edit notes:
- **TimePickerWheel** — scrolling hour/minute wheel. Edit notes:
- **HabitIcon** — habit completion circle / streak visual. Edit notes:
- **Pet** — companion pet (types, states, habitat, food reactions). Edit notes:
- **NextTaskCard** — focus-view single task. Edit notes:
- **Surface / ScreenBackground / ScreenHeader** — themed card / backdrop / header. Edit notes:
- **ConfirmationBanner** — transient feedback banner. Edit notes:
- **ExpandableCard** — collapsible card. Edit notes:
- **HintCard** — explanation/hint box (gated by `showHints`). Edit notes:
- **QRCodeDisplay** — QR renderer for sharing. Edit notes:
- **CompletionGlow** — completion glow animation. Edit notes:
- **PressableScale** — press scale + haptic wrapper. Edit notes:
- **DebugOverlay** — dev panel (feedback notes, perf, bubble tuning). Edit notes:
- **Cover screen set** (CoverScreen/CoverHeader/CoverTasksSection/CoverHabitsSection) — lock-screen widget content. Edit notes:

### Lib helpers
- **share.ts** — QR payload encode/decode (§1.4). Edit notes:
- **notifications.ts** — low-level scheduling primitives, quiet-hours math, snooze, interactive actions. Edit notes:
- **taskNotifications.ts** — per-task reminders (one-off + weekly + time-box end). Edit notes:
- **habitNotifications.ts** — per-habit daily reminder (single time today). Edit notes:
- **reminders.ts** — weekly planning + monthly reset reminders from settings. Edit notes:
- **date.ts** — `todayStr` / `dateStr` / week & month helpers (YYYY-MM-DD, local). Edit notes:
- **time.ts** — HH:MM parse/format/next-hour. Edit notes:
- **haptics.ts** — crash-safe intent-named haptics (tap/success/selection/warning/tug/confirm/heavy). Edit notes:
- **i18n.ts** — EN/NO dictionaries + `useT` / `getTranslations`. Edit notes:
- **catalogSeed.ts** — ~230 Norwegian groceries seeded into `store_items`. Edit notes:
- **useAppTheme.ts** — resolve palette, dark mode, soft theme, accessibility scaling. Edit notes:
- **receipt.ts** — `parseReceiptText` OCR parsing. Edit notes:
- **db.ts / dataAccess.ts** — SQLite init, migrations, pruning, row marshalling. Edit notes:
- **id.ts** — short time-ordered IDs. Edit notes:
- **seedTestData.ts** — sample data loader. Edit notes:
- **holidays.ts / taskOrder.ts / taskSuggestion.ts / taskVisual.ts** — holiday detection, task sorting, suggestions, visual attributes. Edit notes:

### Constants
- **theme.ts** — design tokens, 5 themes + dark, materials, spacing/radius/type, `getTheme`/`getSoftTheme`/`getMaterialStyle`/`tintToTheme`. Edit notes:
- **petData.ts** — pet emojis, habitats, food keyword/category reactions. Edit notes:
