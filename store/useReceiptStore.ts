/**
 * useReceiptStore.ts — scanned/manual receipts (AP-06B budget tracking)
 *
 * Zustand store for the `receipts` table: one row per confirmed scan/manual
 * grocery trip (date, store, total, category, month). Feeds app/budget.tsx's
 * spend-vs-budget view; app/scan.tsx creates a receipt right before logging
 * its items via useCatalogStore.recordPurchases(purchases, receipt.id).
 *
 * Connections:
 *   Imports → lib/date, lib/dataAccess, lib/id
 *   Used by → app/budget.tsx, app/scan.tsx
 *   Data    → defines a Zustand store; owns SQLite table receipts; purchase_log rows link back via the optional receipt_id passed into useCatalogStore.recordPurchases
 *
 * Edit notes:
 *   - month is stored as `YYYY-MM` (lib/date.ts's currentMonthStr()) so receiptsForMonth/totalForMonth are simple equality filters, not date-range scans.
 *   - load() fetches all receipts into memory — same small-table assumption as useEnergyStore; revisit if receipt volume grows much beyond a year of history (pruneOldData() already trims rows past RETENTION_DAYS).
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 */
import { create } from 'zustand';
import { Row, loadAll, insertRow, readStr, readReal } from '@/lib/dataAccess';
import { generateId } from '@/lib/id';
import { currentMonthStr } from '@/lib/date';

export type Receipt = {
  id: string;
  date: string; // YYYY-MM-DD
  store: string;
  total: number;
  category: string;
  month: string; // YYYY-MM
};

export type ReceiptInput = {
  date: string;
  store: string;
  total: number;
  category?: string;
};

type ReceiptStore = {
  receipts: Receipt[];
  load: () => void;
  addReceipt: (input: ReceiptInput) => Receipt;
  receiptsForMonth: (month: string) => Receipt[];
  totalForMonth: (month: string) => number;
};

function rowToReceipt(row: Row): Receipt {
  return {
    id: readStr(row, 'id'),
    date: readStr(row, 'receipt_date'),
    store: readStr(row, 'store'),
    total: readReal(row, 'total'),
    category: readStr(row, 'category') || 'other',
    month: readStr(row, 'month'),
  };
}

export const useReceiptStore = create<ReceiptStore>((set, get) => ({
  receipts: [],

  load() {
    set({ receipts: loadAll('receipts', rowToReceipt, { orderBy: 'receipt_date DESC' }) });
  },

  addReceipt(input) {
    const id = generateId();
    const month = input.date.slice(0, 7) || currentMonthStr();
    insertRow('receipts', {
      id,
      receipt_date: input.date,
      store: input.store,
      total: input.total,
      category: input.category ?? 'other',
      month,
    });
    const receipt: Receipt = {
      id,
      date: input.date,
      store: input.store,
      total: input.total,
      category: input.category ?? 'other',
      month,
    };
    set((s) => ({ receipts: [receipt, ...s.receipts] }));
    return receipt;
  },

  receiptsForMonth(month) {
    return get().receipts.filter((r) => r.month === month);
  },

  totalForMonth(month) {
    return get().receipts.filter((r) => r.month === month).reduce((sum, r) => sum + r.total, 0);
  },
}));
