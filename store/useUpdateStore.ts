/**
 * useUpdateStore.ts — in-memory flag for a downloaded OTA update awaiting restart
 *
 * Pure runtime signal (never persisted to SQLite): app/_layout.tsx sets
 * updateReady once a fetched update is ready to apply, and app/index.tsx reads
 * it to show a persistent "Restart" banner instead of a popup or an immediate
 * forced reload.
 *
 * Connections:
 *   Imports → (none)
 *   Used by → app/_layout.tsx (writes updateReady), app/index.tsx (reads it, renders the restart banner)
 *   Data    → none — in-memory only, intentionally not persisted
 *
 * Edit notes:
 *   - Not persisted on purpose: a fresh cold start already runs the new bundle,
 *     so there is nothing left to restart for after a relaunch.
 */
import { create } from 'zustand';

type UpdateState = {
  updateReady: boolean;
  setUpdateReady: (ready: boolean) => void;
};

export const useUpdateStore = create<UpdateState>((set) => ({
  updateReady: false,
  setUpdateReady: (ready) => set({ updateReady: ready }),
}));
