/**
 * useSettingsStore.ts — single-row app settings / preferences
 *
 * Zustand store mirroring the one settings row: user name, language, theme,
 * dark mode, reminder/notification toggles, reset cadence, work/essentials modes,
 * onboarding state, accessibility flags, and companion pet settings.
 *
 * Connections:
 *   Imports → lib/db
 *   Used by → app/_layout.tsx, app/focus.tsx, app/habit-form.tsx, app/habits.tsx, app/index.tsx, app/onboarding/* , app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, components/BubbleMenu.tsx, components/HintCard.tsx, components/QuickAddSheet.tsx, lib/i18n.ts, lib/reminders.ts, lib/useAppTheme.ts, store/useHabitStore.ts, store/useTaskStore.ts
 *   Data    → defines a Zustand store; owns the single-row SQLite table settings (id = 1)
 *
 * Edit notes:
 *   - Settings live in ONE row (id = 1, inserted by initDb); update() always rewrites every column WHERE id = 1.
 *   - `loaded` and `workModeSessionOverride` are session-only (never persisted to SQLite).
 *   - update() updates in-memory state even if the DB write throws (e.g. column not yet migrated), so the UI stays responsive.
 *   - New settings columns go through the migrations array in lib/db.ts; add to Settings type, load() mapping, and update()'s column list.
 */
import { create } from 'zustand';
import db from '@/lib/db';

export type ColorTheme = 'default' | 'tech' | 'gothic' | 'nature' | 'custom';
export type Language = 'en' | 'no';
export type DarkMode = 'system' | 'on' | 'off';
export type FontSizePref = 'small' | 'default' | 'large';
export type PetType = 'cat' | 'dog' | 'bird' | 'fox' | 'bunny';
/** Bubble/FAB surface finish — see getMaterialStyle() in constants/theme.ts. */
export type BubbleMaterial = 'glass' | 'metal' | 'rock' | 'paper';

export type Settings = {
  userName: string;
  weeklyResetDay: number;
  monthlyResetDate: number;
  shoppingListMode: 'weekly' | 'monthly';
  remindersEnabled: boolean;
  reminderTime: string;
  taskNotificationsEnabled: boolean;
  setupComplete: boolean;
  colorTheme: ColorTheme;
  workModeEnabled: boolean;
  workHoursStart: string;
  workHoursEnd: string;
  enforceWorkHours: boolean;
  workDays: number[];
  essentialsModeEnabled: boolean;
  showPoints: boolean;
  showHints: boolean;
  language: Language;
  holidaysEnabled: boolean;
  darkMode: DarkMode;
  childProfiles: string[];
  // Accessibility (Proposal 4)
  reducedMotion: boolean;
  fontSize: FontSizePref;
  // Companion pet (Proposal 6)
  petEnabled: boolean;
  petName: string;
  petType: PetType;
  petColor: string;
  // Left-handed mode
  leftHanded: boolean;
  // Custom theme colors
  customPrimaryColor: string;
  customSecondaryColor: string;
  // Bubble menu surface finish
  bubbleMaterial: BubbleMaterial;
};

type SettingsStore = Settings & {
  // Session-only (not persisted)
  loaded: boolean;
  workModeSessionOverride: boolean;
  load: () => void;
  update: (patch: Partial<Settings>) => void;
  setWorkModeSessionOverride: (v: boolean) => void;
};

/** Maps old theme names (1.0.0) to new ones (1.1.0). Returns null if name is already valid. */
function migrateThemeName(name: string | null): ColorTheme {
  if (!name) return 'default';
  const map: Record<string, ColorTheme> = {
    warm: 'default', cool: 'tech', forest: 'nature', rose: 'nature', highcontrast: 'default',
  };
  if (name in map) return map[name];
  const valid: ColorTheme[] = ['default', 'tech', 'gothic', 'nature', 'custom'];
  return valid.includes(name as ColorTheme) ? (name as ColorTheme) : 'default';
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  userName: '',
  weeklyResetDay: 1,
  monthlyResetDate: 1,
  shoppingListMode: 'weekly',
  remindersEnabled: true,
  reminderTime: '08:00',
  taskNotificationsEnabled: true,
  setupComplete: false,
  colorTheme: 'default',
  workModeEnabled: false,
  workHoursStart: '07:00',
  workHoursEnd: '17:00',
  enforceWorkHours: false,
  workDays: [0, 1, 2, 3, 4],
  essentialsModeEnabled: false,
  showPoints: false,
  showHints: true,
  language: 'no' as Language,
  holidaysEnabled: true,
  darkMode: 'system' as DarkMode,
  childProfiles: [],
  reducedMotion: false,
  fontSize: 'default' as FontSizePref,
  petEnabled: false,
  petName: '',
  petType: 'cat' as PetType,
  petColor: '#A78BFA',
  leftHanded: false,
  customPrimaryColor: '#3B82F6',
  customSecondaryColor: '#10B981',
  bubbleMaterial: 'glass' as BubbleMaterial,
  loaded: false,
  workModeSessionOverride: false,

  load() {
    try {
      const row = db.getFirstSync<{
        user_name: string;
        weekly_reset_day: number;
        monthly_reset_date: number;
        shopping_list_mode: string;
        reminders_enabled: number;
        reminder_time: string;
        task_notifications_enabled: number;
        setup_complete: number;
        color_theme: string | null;
        work_mode_enabled: number | null;
        work_hours_start: string | null;
        work_hours_end: string | null;
        enforce_work_hours: number | null;
        work_days: string | null;
        essentials_mode_enabled: number | null;
        show_points: number | null;
        show_hints: number | null;
        language: string | null;
        holidays_enabled: number | null;
        dark_mode: string | null;
        child_profiles: string | null;
        reduced_motion: number | null;
        font_size: string | null;
        pet_enabled: number | null;
        pet_name: string | null;
        pet_type: string | null;
        pet_color: string | null;
        left_handed: number | null;
        custom_primary_color: string | null;
        custom_secondary_color: string | null;
        bubble_material: string | null;
      }>('SELECT * FROM settings WHERE id = 1');
      if (!row) { set({ loaded: true }); return; }
      set({
        userName: row.user_name,
        weeklyResetDay: row.weekly_reset_day,
        monthlyResetDate: row.monthly_reset_date,
        shoppingListMode: row.shopping_list_mode as 'weekly' | 'monthly',
        remindersEnabled: row.reminders_enabled === 1,
        reminderTime: row.reminder_time,
        taskNotificationsEnabled: row.task_notifications_enabled === 1,
        setupComplete: row.setup_complete === 1,
        colorTheme: migrateThemeName(row.color_theme) ?? 'default',
        workModeEnabled: row.work_mode_enabled === 1,
        workHoursStart: row.work_hours_start ?? '07:00',
        workHoursEnd: row.work_hours_end ?? '17:00',
        enforceWorkHours: row.enforce_work_hours === 1,
        workDays: (() => { try { return JSON.parse(row.work_days ?? '[0,1,2,3,4]'); } catch { return [0,1,2,3,4]; } })(),
        essentialsModeEnabled: row.essentials_mode_enabled === 1,
        showPoints: row.show_points === 1,
        showHints: row.show_hints !== 0,
        language: (row.language as Language) ?? 'no',
        holidaysEnabled: row.holidays_enabled !== 0,
        darkMode: (row.dark_mode as DarkMode) ?? 'system',
        childProfiles: (() => { try { return JSON.parse(row.child_profiles ?? '[]'); } catch { return []; } })(),
        reducedMotion: row.reduced_motion === 1,
        fontSize: (row.font_size as FontSizePref) ?? 'default',
        petEnabled: row.pet_enabled === 1,
        petName: row.pet_name ?? '',
        petType: (row.pet_type as PetType) ?? 'cat',
        petColor: row.pet_color ?? '#A78BFA',
        leftHanded: row.left_handed === 1,
        customPrimaryColor: row.custom_primary_color ?? '#3B82F6',
        customSecondaryColor: row.custom_secondary_color ?? '#10B981',
        bubbleMaterial: (row.bubble_material as BubbleMaterial) ?? 'glass',
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  update(patch) {
    set((s) => {
      const next = { ...s, ...patch };
      try {
        db.runSync(
          `UPDATE settings SET
            user_name = ?, weekly_reset_day = ?, monthly_reset_date = ?,
            shopping_list_mode = ?, reminders_enabled = ?, reminder_time = ?,
            task_notifications_enabled = ?, setup_complete = ?,
            color_theme = ?, work_mode_enabled = ?, work_hours_start = ?,
            work_hours_end = ?, enforce_work_hours = ?, work_days = ?, essentials_mode_enabled = ?,
            show_points = ?, show_hints = ?, language = ?,
            holidays_enabled = ?, dark_mode = ?, child_profiles = ?,
            reduced_motion = ?, font_size = ?,
            pet_enabled = ?, pet_name = ?, pet_type = ?, pet_color = ?,
            left_handed = ?, custom_primary_color = ?, custom_secondary_color = ?,
            bubble_material = ?
          WHERE id = 1`,
          [
            next.userName,
            next.weeklyResetDay,
            next.monthlyResetDate,
            next.shoppingListMode,
            next.remindersEnabled ? 1 : 0,
            next.reminderTime,
            next.taskNotificationsEnabled ? 1 : 0,
            next.setupComplete ? 1 : 0,
            next.colorTheme,
            next.workModeEnabled ? 1 : 0,
            next.workHoursStart,
            next.workHoursEnd,
            next.enforceWorkHours ? 1 : 0,
            JSON.stringify(next.workDays),
            next.essentialsModeEnabled ? 1 : 0,
            next.showPoints ? 1 : 0,
            next.showHints ? 1 : 0,
            next.language,
            next.holidaysEnabled ? 1 : 0,
            next.darkMode,
            JSON.stringify(next.childProfiles),
            next.reducedMotion ? 1 : 0,
            next.fontSize,
            next.petEnabled ? 1 : 0,
            next.petName,
            next.petType,
            next.petColor,
            next.leftHanded ? 1 : 0,
            next.customPrimaryColor,
            next.customSecondaryColor,
            next.bubbleMaterial,
          ]
        );
      } catch {
        // DB write failed (e.g. column not yet migrated) — state still updates in memory
      }
      return next;
    });
  },

  setWorkModeSessionOverride(v) {
    set({ workModeSessionOverride: v });
  },
}));
