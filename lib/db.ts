import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('unfocus.db');

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
      setup_complete INTEGER DEFAULT 0
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
  ];
  for (const sql of migrations) {
    try { db.execSync(sql); } catch { /* column already exists */ }
  }
}

export default db;
