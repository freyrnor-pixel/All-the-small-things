/**
 * useFeedbackStore.ts — quick header + freetext debug notes for the debug overlay
 *
 * Zustand store for short notes a developer/tester jots down via the debug
 * overlay's note composer (components/DebugOverlay.tsx). Each note is just a
 * header and a freetext body — not tied to any screen or on-screen position.
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, lib/id
 *   Used by → app/_layout.tsx, components/DebugOverlay.tsx
 *   Data    → defines a Zustand store; owns SQLite table feedback_notes
 *
 * Edit notes:
 *   - feedback_notes is NOT pruned by lib/db.ts's pruneOldData() — notes persist
 *     until explicitly cleared via clearAll() (the panel's "Reset" button).
 *   - The table still has legacy `screen`/`x`/`y` NOT NULL columns from the old
 *     tap-to-pin annotation feature; add() writes empty/zero placeholders since
 *     those columns are no longer surfaced anywhere in the UI.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { Row, loadAll, loadFirst, insertRow, readStr } from '@/lib/dataAccess';
import { generateId } from '@/lib/id';

export type FeedbackNote = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

type FeedbackStore = {
  notes: FeedbackNote[];
  load: () => void;
  add: (title: string, note: string) => FeedbackNote;
  clearAll: () => void;
};

function rowToNote(row: Row): FeedbackNote {
  return {
    id: readStr(row, 'id'),
    title: readStr(row, 'title'),
    note: readStr(row, 'note'),
    createdAt: readStr(row, 'created_at'),
  };
}

export const useFeedbackStore = create<FeedbackStore>((set) => ({
  notes: [],

  load() {
    set({ notes: loadAll('feedback_notes', rowToNote, { orderBy: 'created_at' }) });
  },

  add(title, note) {
    const id = generateId();
    insertRow('feedback_notes', { id, screen: '', x: 0, y: 0, title, note });
    const created =
      loadFirst('feedback_notes', rowToNote, { where: 'id = ?', params: [id] }) ??
      { id, title, note, createdAt: new Date().toISOString() };
    set((s) => ({ notes: [...s.notes, created] }));
    return created;
  },

  clearAll() {
    db.runSync('DELETE FROM feedback_notes');
    set({ notes: [] });
  },
}));
