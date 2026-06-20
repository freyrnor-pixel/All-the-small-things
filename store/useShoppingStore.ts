/**
 * useShoppingStore.ts — weekly + monthly shopping list
 *
 * Zustand store for shopping items across a weekly and a monthly list, with
 * check-off, quantity adjust, and a monthly→weekly allocation flow (a monthly
 * staple can spawn weekly entries that decrement its allocated count when removed).
 *
 * Monthly items additionally run through a `status` pipeline —
 * 'list' -> 'staged' -> 'in_cart' -> 'purchased' — driven from app/shopping.tsx
 * (circle tap stages, "Save/Add to shopping list" commits to cart, "Finish
 * shopping" commits to purchased). Weekly items keep using `checked` for cart
 * state, but also gain a 'purchased' status (with weekKey) once a weekly trip
 * is finished, so past weeks can be reviewed.
 *
 * Connections:
 *   Imports → lib/db, lib/id
 *   Used by → app/_layout.tsx, app/index.tsx, app/meals.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, components/CarryOverPromptModal.tsx, components/MonthlyTableRow.tsx, components/ShoppingRow.tsx, store/useAutomationStore.ts (read-only, for the add_shopping_item action)
 *   Data    → defines a Zustand store; owns SQLite table shopping_items (both weekly and monthly rows, distinguished by list_type)
 *
 * Edit notes:
 *   - monthly_source_id links a weekly item back to its monthly staple; removeWithSource()/adjustAmount()/resetWeekly() must release the parent's monthly_allocated — use these, not the bare remove().
 *   - resetWeekly() deletes all weekly rows (releasing allocations first); resetMonthly() only unchecks + zeroes monthly_allocated, it does not delete. resetMonthlyWithCarryOver() is the carry-over-aware variant the UI should call instead.
 *   - New columns (e.g. monthly_allocated, monthly_source_id, status, is_temporary) go through the migrations array in lib/db.ts; never recreate tables.
 *   - dishName (dish_name column) is set when an item was pushed from a meal dish (app/meals.tsx); used to group shopping items by dish in app/shopping.tsx.
 *   - status/isTemporary are monthly-only concepts; weekly rows keep status:'list' except the one-way bump to 'purchased' done by finishShopping('weekly', weekKey).
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type ShoppingStatus = 'list' | 'staged' | 'in_cart' | 'purchased';

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
  inventoryQty: number;
  dishName?: string;
  status: ShoppingStatus;
  isTemporary: boolean;
  purchasedAt?: string;
  weekKey?: string;
};

type ShoppingAddInput = Omit<ShoppingItem, 'id' | 'checked' | 'category' | 'monthlyAllocated' | 'monthlySourceId' | 'status' | 'purchasedAt' | 'weekKey' | 'isTemporary'> & {
  category?: string;
  isTemporary?: boolean;
};

type ShoppingStore = {
  items: ShoppingItem[];
  load: () => void;
  add: (item: ShoppingAddInput) => string;
  update: (id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => void;
  toggleCheck: (id: string) => void;
  remove: (id: string) => void;
  removeWithSource: (id: string) => void;
  adjustAmount: (id: string, delta: number) => void;
  addFromMonthly: (monthlyId: string, qty: number) => void;
  resetWeekly: () => void;
  resetMonthly: () => void;
  stageItem: (id: string) => void;
  commitStaged: () => void;
  finishShopping: (listType: 'weekly' | 'monthly', weekKey?: string) => void;
  resetMonthlyWithCarryOver: (carryIds: string[], dropIds: string[]) => void;
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
    inventoryQty: (row.inventory_qty as number) || 0,
    dishName: (row.dish_name as string) || undefined,
    status: (row.status as ShoppingStatus) || 'list',
    isTemporary: row.is_temporary === 1,
    purchasedAt: (row.purchased_at as string) || undefined,
    weekKey: (row.week_key as string) || undefined,
  };
}

/** Candidates for the payday-boundary carry-over prompt: temporary monthly items never bought. */
export function getCarryOverCandidates(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter((i) => i.listType === 'monthly' && i.isTemporary && i.status !== 'purchased');
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
    const isTemporary = item.isTemporary ?? false;
    db.runSync(
      `INSERT INTO shopping_items
         (id, name, amount, unit, list_type, checked, store, price, category, monthly_allocated, monthly_source_id, inventory_qty, dish_name, status, is_temporary, purchased_at, week_key)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, NULL, ?, ?, 'list', ?, NULL, NULL)`,
      [id, item.name, item.amount, item.unit, item.listType, item.store, item.price, category, item.inventoryQty ?? 0, item.dishName ?? null, isTemporary ? 1 : 0]
    );
    set((s) => ({
      items: [...s.items, {
        ...item, id, checked: false, category, monthlyAllocated: 0, monthlySourceId: undefined,
        inventoryQty: item.inventoryQty ?? 0, status: 'list', isTemporary, purchasedAt: undefined, weekKey: undefined,
      }],
    }));
    return id;
  },

  update(id, patch) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    db.runSync(
      `UPDATE shopping_items
         SET name=?, amount=?, unit=?, list_type=?, checked=?, store=?, price=?, category=?,
             monthly_allocated=?, monthly_source_id=?, inventory_qty=?, dish_name=?,
             status=?, is_temporary=?, purchased_at=?, week_key=?
       WHERE id=?`,
      [
        next.name, next.amount, next.unit, next.listType,
        next.checked ? 1 : 0, next.store, next.price, next.category,
        next.monthlyAllocated, next.monthlySourceId ?? null, next.inventoryQty ?? 0, next.dishName ?? null,
        next.status, next.isTemporary ? 1 : 0, next.purchasedAt ?? null, next.weekKey ?? null, id,
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
          inventoryQty: 0,
          status: 'list' as const,
          isTemporary: false,
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
          [qty, w.monthlySourceId!] // guaranteed non-null by the monthlySourceId filter above
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

  stageItem(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item || item.listType !== 'monthly') return;
    if (item.status !== 'list' && item.status !== 'staged') return;
    get().update(id, { status: item.status === 'staged' ? 'list' : 'staged' });
  },

  commitStaged() {
    db.runSync("UPDATE shopping_items SET status = 'in_cart' WHERE list_type = 'monthly' AND status = 'staged'");
    set((s) => ({
      items: s.items.map((i) =>
        i.listType === 'monthly' && i.status === 'staged' ? { ...i, status: 'in_cart' as const } : i
      ),
    }));
  },

  finishShopping(listType, weekKey) {
    const now = new Date().toISOString();
    if (listType === 'monthly') {
      db.runSync(
        "UPDATE shopping_items SET status = 'purchased', purchased_at = ? WHERE list_type = 'monthly' AND status = 'in_cart'",
        [now]
      );
      set((s) => ({
        items: s.items.map((i) =>
          i.listType === 'monthly' && i.status === 'in_cart'
            ? { ...i, status: 'purchased' as const, purchasedAt: now }
            : i
        ),
      }));
    } else {
      db.runSync(
        "UPDATE shopping_items SET status = 'purchased', checked = 0, purchased_at = ?, week_key = ? WHERE list_type = 'weekly' AND checked = 1",
        [now, weekKey ?? null]
      );
      set((s) => ({
        items: s.items.map((i) =>
          i.listType === 'weekly' && i.checked
            ? { ...i, status: 'purchased' as const, checked: false, purchasedAt: now, weekKey }
            : i
        ),
      }));
    }
  },

  resetMonthlyWithCarryOver(carryIds, dropIds) {
    for (const id of dropIds) {
      get().remove(id);
    }
    const carrySet = new Set(carryIds);
    db.runSync(
      "UPDATE shopping_items SET status = 'list', checked = 0, monthly_allocated = 0 WHERE list_type = 'monthly' AND is_temporary = 0"
    );
    for (const id of carryIds) {
      db.runSync(
        "UPDATE shopping_items SET status = 'list', checked = 0, monthly_allocated = 0 WHERE id = ?",
        [id]
      );
    }
    set((s) => ({
      items: s.items
        .filter((i) => !dropIds.includes(i.id))
        .map((i) => {
          if (i.listType !== 'monthly') return i;
          if (!i.isTemporary || carrySet.has(i.id)) {
            return { ...i, status: 'list' as const, checked: false, monthlyAllocated: 0 };
          }
          return i;
        }),
    }));
  },
}));
