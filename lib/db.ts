/**
 * db.ts — SQLite database: connection, schema, migrations, retention pruning.
 *
 * Opens the shared `unfocus.db` handle and exports it as default. initDb()
 * creates every table/index and runs idempotent ALTER-TABLE migrations;
 * pruneOldData() trims dated history older than RETENTION_DAYS (365). All Zustand
 * stores import this db handle to run their queries.
 *
 * Connections:
 *   Imports → lib/date
 *   Used by → app/_layout.tsx, store/useCatalogStore.ts, store/useHabitStore.ts, store/useHealthStore.ts, store/useMealStore.ts, store/useSettingsStore.ts, store/useSharedStore.ts, store/useShoppingStore.ts, store/useTaskStore.ts
 *   Data    → owns ALL SQLite tables: settings, tasks, shopping_items, dishes, ingredients, health_logs, store_items, purchase_log, shared_tasks, shared_shopping_items, habits, habit_logs
 *
 * Edit notes:
 *   - Add columns via the `migrations` array ONLY — never edit a CREATE TABLE to
 *     change an existing table; migrations run on every launch and swallow
 *     "column already exists" errors.
 *   - pruneOldData() deliberately spares config-like tables (recurring tasks,
 *     dishes, habits, catalog, settings); only dated/append-only rows are pruned.
 */
import * as SQLite from 'expo-sqlite';
import { dateStr } from '@/lib/date';

const db = SQLite.openDatabaseSync('unfocus.db');

/** The app keeps at most this many days of historical, time-stamped data. */
export const RETENTION_DAYS = 365;

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      user_name TEXT DEFAULT '',
      weekly_reset_day INTEGER DEFAULT 1,
      monthly_reset_date INTEGER DEFAULT 1,
      shopping_list_mode TEXT DEFAULT 'weekly',
      reminders_enabled INTEGER DEFAULT 1,
      reminder_time TEXT DEFAULT '08:00',
      task_notifications_enabled INTEGER DEFAULT 1,
      setup_complete INTEGER DEFAULT 0,
      holidays_enabled INTEGER DEFAULT 1
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      task_date TEXT NOT NULL,
      task_time TEXT,
      task_type TEXT DEFAULT 'start-at',
      duration_minutes INTEGER,
      done INTEGER DEFAULT 0,
      recurring TEXT DEFAULT 'none',
      recurring_days TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount TEXT DEFAULT '1',
      unit TEXT DEFAULT '',
      list_type TEXT DEFAULT 'weekly',
      checked INTEGER DEFAULT 0,
      store TEXT DEFAULT '',
      price REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      meal_type TEXT DEFAULT 'dinner',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      dish_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount TEXT DEFAULT '1',
      unit TEXT DEFAULT '',
      FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_logs (
      id TEXT PRIMARY KEY,
      log_date TEXT NOT NULL,
      ailment TEXT NOT NULL,
      severity INTEGER DEFAULT 3,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      store TEXT DEFAULT '',
      price REAL DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_log (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      store TEXT DEFAULT '',
      price REAL DEFAULT 0,
      was_on_list INTEGER DEFAULT 1,
      purchased_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shared_tasks (
      id TEXT PRIMARY KEY,
      source_task_id TEXT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      direction TEXT NOT NULL,
      shared_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shared_shopping_items (
      id TEXT PRIMARY KEY,
      source_item_id TEXT,
      name TEXT NOT NULL,
      amount TEXT DEFAULT '1',
      unit TEXT DEFAULT '',
      done INTEGER DEFAULT 0,
      direction TEXT NOT NULL,
      shared_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT DEFAULT '⭐',
      kind TEXT DEFAULT 'build',
      category TEXT DEFAULT 'other',
      cue TEXT DEFAULT '',
      craving TEXT DEFAULT '',
      response TEXT DEFAULT '',
      reward TEXT DEFAULT '',
      daily_goal INTEGER DEFAULT 1,
      recurrence TEXT DEFAULT 'daily',
      recurrence_days TEXT DEFAULT '[]',
      notification_enabled INTEGER DEFAULT 0,
      notification_time TEXT DEFAULT '08:00',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );

    -- Indexes for the columns we filter / sort / join on most often.
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date);
    CREATE INDEX IF NOT EXISTS idx_shopping_list ON shopping_items(list_type);
    CREATE INDEX IF NOT EXISTS idx_ingredients_dish ON ingredients(dish_id);
    CREATE INDEX IF NOT EXISTS idx_health_date ON health_logs(log_date);
    CREATE INDEX IF NOT EXISTS idx_habit_logs ON habit_logs(habit_id, log_date);
    CREATE INDEX IF NOT EXISTS idx_store_items_name ON store_items(name);
    CREATE INDEX IF NOT EXISTS idx_purchase_log_date ON purchase_log(purchased_at);
  `);

  // Schema migrations — safe to run repeatedly (errors = column already exists)
  const migrations = [
    "ALTER TABLE tasks ADD COLUMN importance TEXT DEFAULT 'regular'",
    "ALTER TABLE settings ADD COLUMN color_theme TEXT DEFAULT 'warm'",
    "ALTER TABLE settings ADD COLUMN work_mode_enabled INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN work_hours_start TEXT DEFAULT '09:00'",
    "ALTER TABLE settings ADD COLUMN work_hours_end TEXT DEFAULT '17:00'",
    "ALTER TABLE settings ADD COLUMN enforce_work_hours INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN essentials_mode_enabled INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN show_points INTEGER DEFAULT 0",
    "ALTER TABLE settings ADD COLUMN show_hints INTEGER DEFAULT 1",
    "ALTER TABLE settings ADD COLUMN language TEXT DEFAULT 'no'",
    "ALTER TABLE shopping_items ADD COLUMN category TEXT DEFAULT 'other'",
    "ALTER TABLE settings ADD COLUMN holidays_enabled INTEGER DEFAULT 1",
    "ALTER TABLE settings ADD COLUMN dark_mode TEXT DEFAULT 'system'",
    "ALTER TABLE shopping_items ADD COLUMN monthly_allocated INTEGER DEFAULT 0",
    "ALTER TABLE shopping_items ADD COLUMN monthly_source_id TEXT DEFAULT NULL",
    "ALTER TABLE settings ADD COLUMN work_days TEXT DEFAULT '[0,1,2,3,4]'",
    "ALTER TABLE habits ADD COLUMN routine_order INTEGER DEFAULT 0",
  ];
  for (const sql of migrations) {
    try { db.execSync(sql); } catch { /* column already exists */ }
  }
}

/**
 * Keep the local database to roughly the last year of history. Runs once on
 * startup. Recurring tasks, dishes, habits, the item catalog and settings are
 * configuration (not dated history) and are deliberately left untouched —
 * only dated, append-only rows older than the cutoff are removed.
 *
 * The cutoff is a `YYYY-MM-DD` string; it compares correctly against both
 * `YYYY-MM-DD` date columns and `YYYY-MM-DD HH:MM:SS` timestamp columns.
 */
export function pruneOldData() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const c = dateStr(cutoff);
  try {
    db.runSync("DELETE FROM tasks WHERE recurring = 'none' AND task_date < ?", [c]);
    db.runSync('DELETE FROM health_logs WHERE log_date < ?', [c]);
    db.runSync('DELETE FROM habit_logs WHERE log_date < ?', [c]);
    db.runSync('DELETE FROM purchase_log WHERE purchased_at < ?', [c]);
    db.runSync('DELETE FROM shared_tasks WHERE date < ?', [c]);
    db.runSync('DELETE FROM shared_shopping_items WHERE created_at < ?', [c]);
  } catch { /* never block startup on cleanup */ }
}

export default db;
