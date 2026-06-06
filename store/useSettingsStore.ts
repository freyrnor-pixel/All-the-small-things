import { create } from 'zustand';
import db from '@/lib/db';

export type Settings = {
  userName: string;
  weeklyResetDay: number;
  monthlyResetDate: number;
  shoppingListMode: 'weekly' | 'monthly';
  remindersEnabled: boolean;
  reminderTime: string;
  taskNotificationsEnabled: boolean;
  setupComplete: boolean;
};

type SettingsStore = Settings & {
  load: () => void;
  update: (patch: Partial<Settings>) => void;
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

  load() {
    const row = db.getFirstSync<{
      user_name: string;
      weekly_reset_day: number;
      monthly_reset_date: number;
      shopping_list_mode: string;
      reminders_enabled: number;
      reminder_time: string;
      task_notifications_enabled: number;
      setup_complete: number;
    }>('SELECT * FROM settings WHERE id = 1');
    if (!row) return;
    set({
      userName: row.user_name,
      weeklyResetDay: row.weekly_reset_day,
      monthlyResetDate: row.monthly_reset_date,
      shoppingListMode: row.shopping_list_mode as 'weekly' | 'monthly',
      remindersEnabled: row.reminders_enabled === 1,
      reminderTime: row.reminder_time,
      taskNotificationsEnabled: row.task_notifications_enabled === 1,
      setupComplete: row.setup_complete === 1,
    });
  },

  update(patch) {
    set((s) => {
      const next = { ...s, ...patch };
      db.runSync(
        `UPDATE settings SET
          user_name = ?, weekly_reset_day = ?, monthly_reset_date = ?,
          shopping_list_mode = ?, reminders_enabled = ?, reminder_time = ?,
          task_notifications_enabled = ?, setup_complete = ?
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
        ]
      );
      return next;
    });
  },
}));
