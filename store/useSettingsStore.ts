import { create } from 'zustand';
import db from '@/lib/db';

export type ColorTheme = 'warm' | 'cool' | 'forest' | 'rose';
export type Language = 'en' | 'no';

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
  essentialsModeEnabled: boolean;
  showPoints: boolean;
  showHints: boolean;
  language: Language;
  holidaysEnabled: boolean;
};

type SettingsStore = Settings & {
  // Session-only (not persisted)
  loaded: boolean;
  workModeSessionOverride: boolean;
  load: () => void;
  update: (patch: Partial<Settings>) => void;
  setWorkModeSessionOverride: (v: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  userName: '',
  weeklyResetDay: 1,
  monthlyResetDate: 1,
  shoppingListMode: 'weekly',
  remindersEnabled: true,
  reminderTime: '08:00',
  taskNotificationsEnabled: true,
  setupComplete: false,
  colorTheme: 'warm',
  workModeEnabled: false,
  workHoursStart: '09:00',
  workHoursEnd: '17:00',
  enforceWorkHours: false,
  essentialsModeEnabled: false,
  showPoints: false,
  showHints: true,
  language: 'no' as Language,
  holidaysEnabled: true,
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
        essentials_mode_enabled: number | null;
        show_points: number | null;
        show_hints: number | null;
        language: string | null;
        holidays_enabled: number | null;
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
        colorTheme: (row.color_theme as ColorTheme) ?? 'warm',
        workModeEnabled: row.work_mode_enabled === 1,
        workHoursStart: row.work_hours_start ?? '09:00',
        workHoursEnd: row.work_hours_end ?? '17:00',
        enforceWorkHours: row.enforce_work_hours === 1,
        essentialsModeEnabled: row.essentials_mode_enabled === 1,
        showPoints: row.show_points === 1,
        showHints: row.show_hints !== 0,
        language: (row.language as Language) ?? 'no',
        holidaysEnabled: row.holidays_enabled !== 0,
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
            work_hours_end = ?, enforce_work_hours = ?, essentials_mode_enabled = ?,
            show_points = ?, show_hints = ?, language = ?,
            holidays_enabled = ?
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
            next.essentialsModeEnabled ? 1 : 0,
            next.showPoints ? 1 : 0,
            next.showHints ? 1 : 0,
            next.language,
            next.holidaysEnabled ? 1 : 0,
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
