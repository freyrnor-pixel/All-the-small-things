/**
 * useFeedbackStore.ts — free-floating UI feedback pins for the debug overlay
 *
 * Zustand store for user-authored feedback notes dropped on screen while
 * "Annotate mode" is active in the debug overlay (components/DebugOverlay.tsx).
 * Each note is tied to a screen route and a normalized (0..1) x/y position on
 * that screen.
 *
 * Connections:
 *   Imports → lib/db, lib/id
 *   Used by → app/_layout.tsx, components/DebugOverlay.tsx
 *   Data    → defines a Zustand store; owns SQLite table feedback_notes
 *
 * Edit notes:
 *   - These are deliberate documentation notes, not auto-generated history —
 *     feedback_notes is NOT pruned by lib/db.ts's pruneOldData().
 *   - load() fetches all notes across all screens; filter by `screen` in the UI.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { Row, loadAll, loadFirst, insertRow, updateRow, readStr, readReal } from '@/lib/dataAccess';
import { generateId } from '@/lib/id';

export type FeedbackNote = {
  id: string;
  screen: string;
  x: number;
  y: number;
  note: string;
  createdAt: string;
};

type FeedbackStore = {
  notes: FeedbackNote[];
  load: () => void;
  add: (screen: string, x: number, y: number, note: string) => FeedbackNote;
  update: (id: string, note: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
};

function rowToNote(row: Row): FeedbackNote {
  return {
    id: readStr(row, 'id'),
    screen: readStr(row, 'screen'),
    x: readReal(row, 'x'),
    y: readReal(row, 'y'),
    note: readStr(row, 'note'),
    createdAt: readStr(row, 'created_at'),
  };
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  notes: [],

  load() {
    set({ notes: loadAll('feedback_notes', rowToNote, { orderBy: 'created_at' }) });
  },

  add(screen, x, y, note) {
    const id = generateId();
    insertRow('feedback_notes', { id, screen, x, y, note });
    const created =
      loadFirst('feedback_notes', rowToNote, { where: 'id = ?', params: [id] }) ??
      { id, screen, x, y, note, createdAt: new Date().toISOString() };
    set((s) => ({ notes: [...s.notes, created] }));
    return created;
  },

  update(id, note) {
    updateRow('feedback_notes', { note }, 'id = ?', [id]);
    set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, note } : n)) }));
  },

  remove(id) {
    db.runSync('DELETE FROM feedback_notes WHERE id = ?', [id]);
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
  },

  clearAll() {
    db.runSync('DELETE FROM feedback_notes');
    set({ notes: [] });
  },
}));
