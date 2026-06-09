import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type SharedDirection = 'in' | 'out';

export type SharedTask = {
  id: string;
  sourceTaskId: string | null;
  title: string;
  date: string;
  done: boolean;
  direction: SharedDirection;
  sharedBy: string;
  createdAt: string;
};

export type SharedShoppingItem = {
  id: string;
  sourceItemId: string | null;
  name: string;
  amount: string;
  unit: string;
  done: boolean;
  direction: SharedDirection;
  sharedBy: string;
  createdAt: string;
};

type SharedStore = {
  tasks: SharedTask[];
  shoppingItems: SharedShoppingItem[];
  load: () => void;
  addSharedTasks: (items: Omit<SharedTask, 'id' | 'createdAt' | 'done'>[]) => void;
  addSharedShopping: (items: Omit<SharedShoppingItem, 'id' | 'createdAt' | 'done'>[]) => void;
  toggleTask: (id: string) => void;
  toggleShopping: (id: string) => void;
  removeTask: (id: string) => void;
  removeShopping: (id: string) => void;
};

function rowToTask(row: Record<string, unknown>): SharedTask {
  return {
    id: row.id as string,
    sourceTaskId: (row.source_task_id as string) || null,
    title: row.title as string,
    date: row.date as string,
    done: row.done === 1,
    direction: row.direction as SharedDirection,
    sharedBy: (row.shared_by as string) || '',
    createdAt: (row.created_at as string) || '',
  };
}

function rowToShopping(row: Record<string, unknown>): SharedShoppingItem {
  return {
    id: row.id as string,
    sourceItemId: (row.source_item_id as string) || null,
    name: row.name as string,
    amount: (row.amount as string) || '1',
    unit: (row.unit as string) || '',
    done: row.done === 1,
    direction: row.direction as SharedDirection,
    sharedBy: (row.shared_by as string) || '',
    createdAt: (row.created_at as string) || '',
  };
}

export const useSharedStore = create<SharedStore>((set, get) => ({
  tasks: [],
  shoppingItems: [],

  load() {
    try {
      const taskRows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM shared_tasks ORDER BY created_at DESC'
      );
      const shoppingRows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM shared_shopping_items ORDER BY created_at DESC'
      );
      set({ tasks: taskRows.map(rowToTask), shoppingItems: shoppingRows.map(rowToShopping) });
    } catch {
      set({ tasks: [], shoppingItems: [] });
    }
  },

  addSharedTasks(items) {
    const now = new Date().toISOString();
    const newItems: SharedTask[] = [];
    for (const item of items) {
      const id = generateId();
      try {
        db.runSync(
          `INSERT INTO shared_tasks (id, source_task_id, title, date, done, direction, shared_by, created_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
          [id, item.sourceTaskId ?? null, item.title, item.date, item.direction, item.sharedBy, now]
        );
        newItems.push({ ...item, id, done: false, createdAt: now });
      } catch { /* skip duplicate */ }
    }
    set((s) => ({ tasks: [...newItems, ...s.tasks] }));
  },

  addSharedShopping(items) {
    const now = new Date().toISOString();
    const newItems: SharedShoppingItem[] = [];
    for (const item of items) {
      const id = generateId();
      try {
        db.runSync(
          `INSERT INTO shared_shopping_items (id, source_item_id, name, amount, unit, done, direction, shared_by, created_at)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
          [id, item.sourceItemId ?? null, item.name, item.amount, item.unit, item.direction, item.sharedBy, now]
        );
        newItems.push({ ...item, id, done: false, createdAt: now });
      } catch { /* skip duplicate */ }
    }
    set((s) => ({ shoppingItems: [...newItems, ...s.shoppingItems] }));
  },

  toggleTask(id) {
    const item = get().tasks.find((t) => t.id === id);
    if (!item) return;
    const done = !item.done;
    db.runSync('UPDATE shared_tasks SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, done } : t)) }));
  },

  toggleShopping(id) {
    const item = get().shoppingItems.find((i) => i.id === id);
    if (!item) return;
    const done = !item.done;
    db.runSync('UPDATE shared_shopping_items SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
    set((s) => ({ shoppingItems: s.shoppingItems.map((i) => (i.id === id ? { ...i, done } : i)) }));
  },

  removeTask(id) {
    db.runSync('DELETE FROM shared_tasks WHERE id = ?', [id]);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  removeShopping(id) {
    db.runSync('DELETE FROM shared_shopping_items WHERE id = ?', [id]);
    set((s) => ({ shoppingItems: s.shoppingItems.filter((i) => i.id !== id) }));
  },
}));
