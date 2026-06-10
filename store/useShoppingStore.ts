/**
 * useShoppingStore.ts — weekly + monthly shopping list
 *
 * Zustand store for shopping items across a weekly and a monthly list, with
 * check-off, quantity adjust, and a monthly→weekly allocation flow (a monthly
 * staple can spawn weekly entries that decrement its allocated count when removed).
 *
 * Connections:
 *   Imports → lib/db, lib/id
 *   Used by → app/_layout.tsx, app/index.tsx, app/meals.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, components/MonthlyPickerSheet.tsx, components/ShoppingRow.tsx
 *   Data    → defines a Zustand store; owns SQLite table shopping_items (both weekly and monthly rows, distinguished by list_type)
 *
 * Edit notes:
 *   - monthly_source_id links a weekly item back to its monthly staple; removeWithSource()/adjustAmount()/resetWeekly() must release the parent's monthly_allocated — use these, not the bare remove().
 *   - resetWeekly() deletes all weekly rows (releasing allocations first); resetMonthly() only unchecks + zeroes monthly_allocated, it does not delete.
 *   - New columns (e.g. monthly_allocated, monthly_source_id) go through the migrations array in lib/db.ts; never recreate tables.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type ShoppingItem = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  listType: 'weekly' | 'monthly';
  checked: boolean;
  store: string;
  price: number;
  category: string;
  monthlyAllocated: number;
  monthlySourceId?: string;
};

type ShoppingAddInput = Omit<ShoppingItem, 'id' | 'checked' | 'category' | 'monthlyAllocated' | 'monthlySourceId'> & {
  category?: string;
};

type ShoppingStore = {
  items: ShoppingItem[];
  load: () => void;
  add: (item: ShoppingAddInput) => void;
  update: (id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => void;
  toggleCheck: (id: string) => void;
  remove: (id: string) => void;
  removeWithSource: (id: string) => void;
  adjustAmount: (id: string, delta: number) => void;
  addFromMonthly: (monthlyId: string, qty: number) => void;
  resetWeekly: () => void;
  resetMonthly: () => void;
};

function rowToItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    name: row.name as string,
    amount: (row.amount as string) || '1',
    unit: (row.unit as string) || '',
    listType: (row.list_type as 'weekly' | 'monthly') ?? 'weekly',
    checked: row.checked === 1,
    store: (row.store as string) || '',
    price: (row.price as number) || 0,
    category: (row.category as string) || 'other',
    monthlyAllocated: (row.monthly_allocated as number) || 0,
    monthlySourceId: (row.monthly_source_id as string) || undefined,
  };
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],

  load() {
    try {
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM shopping_items ORDER BY list_type, checked, name'
      );
      set({ items: rows.map(rowToItem) });
    } catch {
      set({ items: [] });
    }
  },

  add(item) {
    const id = generateId();
    const category = item.category ?? 'other';
    db.runSync(
      `INSERT INTO shopping_items
         (id, name, amount, unit, list_type, checked, store, price, category, monthly_allocated, monthly_source_id)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, NULL)`,
      [id, item.name, item.amount, item.unit, item.listType, item.store, item.price, category]
    );
    set((s) => ({
      items: [...s.items, { ...item, id, checked: false, category, monthlyAllocated: 0, monthlySourceId: undefined }],
    }));
  },

  update(id, patch) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    db.runSync(
      `UPDATE shopping_items
         SET name=?, amount=?, unit=?, list_type=?, checked=?, store=?, price=?, category=?,
             monthly_allocated=?, monthly_source_id=?
       WHERE id=?`,
      [
        next.name, next.amount, next.unit, next.listType,
        next.checked ? 1 : 0, next.store, next.price, next.category,
        next.monthlyAllocated, next.monthlySourceId ?? null, id,
      ]
    );
    set((s) => ({ items: s.items.map((i) => (i.id === id ? next : i)) }));
  },

  toggleCheck(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    get().update(id, { checked: !item.checked });
  },

  remove(id) {
    db.runSync('DELETE FROM shopping_items WHERE id = ?', [id]);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  removeWithSource(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;

    if (item.monthlySourceId) {
      const qty = parseInt(item.amount, 10) || 1;
      try {
        db.runSync(
          'UPDATE shopping_items SET monthly_allocated = MAX(0, monthly_allocated - ?) WHERE id = ?',
          [qty, item.monthlySourceId]
        );
      } catch { /* ignore */ }
      set((s) => ({
        items: s.items.map((i) =>
          i.id === item.monthlySourceId
            ? { ...i, monthlyAllocated: Math.max(0, i.monthlyAllocated - qty) }
            : i
        ),
      }));
    }

    db.runSync('DELETE FROM shopping_items WHERE id = ?', [id]);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  adjustAmount(id, delta) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const current = parseInt(item.amount, 10) || 1;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      get().removeWithSource(id);
    } else {
      get().update(id, { amount: String(next) });
    }
  },

  addFromMonthly(monthlyId, qty) {
    if (qty <= 0) return;
    const monthly = get().items.find((i) => i.id === monthlyId);
    if (!monthly) return;

    const weeklyId = generateId();
    try {
      db.runSync(
        `INSERT INTO shopping_items
           (id, name, amount, unit, list_type, checked, store, price, category, monthly_allocated, monthly_source_id)
         VALUES (?, ?, ?, ?, 'weekly', 0, ?, ?, ?, 0, ?)`,
        [weeklyId, monthly.name, String(qty), monthly.unit, monthly.store, monthly.price, monthly.category, monthlyId]
      );
      db.runSync(
        'UPDATE shopping_items SET monthly_allocated = monthly_allocated + ? WHERE id = ?',
        [qty, monthlyId]
      );
    } catch { return; }

    set((s) => ({
      items: [
        ...s.items.map((i) =>
          i.id === monthlyId ? { ...i, monthlyAllocated: i.monthlyAllocated + qty } : i
        ),
        {
          id: weeklyId,
          name: monthly.name,
          amount: String(qty),
          unit: monthly.unit,
          listType: 'weekly' as const,
          checked: false,
          store: monthly.store,
          price: monthly.price,
          category: monthly.category,
          monthlyAllocated: 0,
          monthlySourceId: monthlyId,
        },
      ],
    }));
  },

  resetWeekly() {
    // Release any monthly allocations before deleting weekly items
    const weeklyWithSource = get().items.filter(
      (i) => i.listType === 'weekly' && i.monthlySourceId
    );
    for (const w of weeklyWithSource) {
      const qty = parseInt(w.amount, 10) || 1;
      try {
        db.runSync(
          'UPDATE shopping_items SET monthly_allocated = MAX(0, monthly_allocated - ?) WHERE id = ?',
          [qty, w.monthlySourceId]
        );
      } catch { /* ignore */ }
    }

    db.runSync("DELETE FROM shopping_items WHERE list_type = 'weekly'");
    set((s) => {
      const sourceIds = new Set(weeklyWithSource.map((w) => w.monthlySourceId!));
      return {
        items: s.items
          .filter((i) => i.listType !== 'weekly')
          .map((i) =>
            sourceIds.has(i.id)
              ? { ...i, monthlyAllocated: Math.max(0, i.monthlyAllocated - (weeklyWithSource.find((w) => w.monthlySourceId === i.id) ? parseInt(weeklyWithSource.find((w) => w.monthlySourceId === i.id)!.amount, 10) || 1 : 0)) }
              : i
          ),
      };
    });
  },

  resetMonthly() {
    db.runSync("UPDATE shopping_items SET checked = 0, monthly_allocated = 0 WHERE list_type = 'monthly'");
    set((s) => ({
      items: s.items.map((i) =>
        i.listType === 'monthly' ? { ...i, checked: false, monthlyAllocated: 0 } : i
      ),
    }));
  },
}));
