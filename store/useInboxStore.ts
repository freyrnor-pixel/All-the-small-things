/**
 * useInboxStore.ts — quick-capture inbox (AP-02)
 *
 * Zustand store for frictionless one-line capture: jot a thought down now,
 * decide what to do with it later. Items sit in `inbox_items` until promoted
 * into a real task (via useTaskStore) or discarded.
 *
 * Connections:
 *   Imports → lib/db, lib/id, store/useTaskStore (add() only, for promoteToTask)
 *   Used by → app/_layout.tsx, app/capture.tsx, components/InboxSection.tsx (via app/index.tsx)
 *   Data    → defines a Zustand store; owns SQLite table inbox_items
 *
 * Edit notes:
 *   - load() fetches everything (capture volume is low; no pagination needed).
 *   - promoteToTask() is additive: it adds the new task first, then removes the
 *     inbox row — never the reverse, so a crash mid-promotion can't lose the capture.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';
import { useTaskStore, Task } from '@/store/useTaskStore';

export type InboxItem = {
  id: string;
  text: string;
  createdAt: string;
};

type InboxStore = {
  items: InboxItem[];
  load: () => void;
  add: (text: string) => InboxItem;
  remove: (id: string) => void;
  promoteToTask: (id: string, taskFields: Omit<Task, 'id'>) => void;
};

function rowToItem(row: Record<string, unknown>): InboxItem {
  return {
    id: row.id as string,
    text: row.text as string,
    createdAt: row.created_at as string,
  };
}

export const useInboxStore = create<InboxStore>((set, get) => ({
  items: [],

  load() {
    try {
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM inbox_items ORDER BY created_at DESC'
      );
      set({ items: rows.map(rowToItem) });
    } catch {
      set({ items: [] });
    }
  },

  add(text) {
    const id = generateId();
    db.runSync('INSERT INTO inbox_items (id, text) VALUES (?, ?)', [id, text]);
    const row = db.getFirstSync<Record<string, unknown>>('SELECT * FROM inbox_items WHERE id = ?', [id]);
    const created = row ? rowToItem(row) : { id, text, createdAt: new Date().toISOString() };
    set((s) => ({ items: [created, ...s.items] }));
    return created;
  },

  remove(id) {
    db.runSync('DELETE FROM inbox_items WHERE id = ?', [id]);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  promoteToTask(id, taskFields) {
    useTaskStore.getState().add(taskFields);
    get().remove(id);
  },
}));
