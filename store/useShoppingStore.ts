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
 *   Imports → lib/db, lib/dataAccess, lib/id
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
import {
  Row,
  FieldMap,
  loadAll,
  insertRow,
  updateRow,
  rowValues,
  readStr,
  readReal,
  readBool,
} from '@/lib/dataAccess';
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

function rowToItem(row: Row): ShoppingItem {
  return {
    id: readStr(row, 'id'),
    name: readStr(row, 'name'),
    amount: readStr(row, 'amount') || '1',
    unit: readStr(row, 'unit'),
    listType: (readStr(row, 'list_type', 'weekly') as 'weekly' | 'monthly'),
    checked: readBool(row, 'checked'),
    store: readStr(row, 'store'),
    price: readReal(row, 'price'),
    category: readStr(row, 'category') || 'other',
    monthlyAllocated: readReal(row, 'monthly_allocated'),
    monthlySourceId: readStr(row, 'monthly_source_id') || undefined,
    inventoryQty: readReal(row, 'inventory_qty'),
    dishName: readStr(row, 'dish_name') || undefined,
    status: (readStr(row, 'status') || 'list') as ShoppingStatus,
    isTemporary: readBool(row, 'is_temporary'),
    purchasedAt: readStr(row, 'purchased_at') || undefined,
    weekKey: readStr(row, 'week_key') || undefined,
  };
}

/** Field → column mapping for shopping items (serialisers preserve the old INSERT/UPDATE nulls/booleans). */
const ITEM_COLUMNS: FieldMap<ShoppingItem> = {
  id: { col: 'id' },
  name: { col: 'name' },
  amount: { col: 'amount' },
  unit: { col: 'unit' },
  listType: { col: 'list_type' },
  checked: { col: 'checked', to: (v) => (v ? 1 : 0) },
  store: { col: 'store' },
  price: { col: 'price' },
  category: { col: 'category' },
  monthlyAllocated: { col: 'monthly_allocated' },
  monthlySourceId: { col: 'monthly_source_id', to: (v) => v ?? null },
  inventoryQty: { col: 'inventory_qty', to: (v) => v ?? 0 },
  dishName: { col: 'dish_name', to: (v) => v ?? null },
  status: { col: 'status' },
  isTemporary: { col: 'is_temporary', to: (v) => (v ? 1 : 0) },
  purchasedAt: { col: 'purchased_at', to: (v) => v ?? null },
  weekKey: { col: 'week_key', to: (v) => v ?? null },
};

/** Candidates for the payday-boundary carry-over prompt: temporary monthly items never bought. */
export function getCarryOverCandidates(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter((i) => i.listType === 'monthly' && i.isTemporary && i.status !== 'purchased');
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],

  load() {
    set({ items: loadAll('shopping_items', rowToItem, { orderBy: 'list_type, checked, name' }) });
  },

  add(item) {
    const id = generateId();
    const category = item.category ?? 'other';
    const isTemporary = item.isTemporary ?? false;
    const newItem: ShoppingItem = {
      ...item,
      id,
      checked: false,
      category,
      monthlyAllocated: 0,
      monthlySourceId: undefined,
      inventoryQty: item.inventoryQty ?? 0,
      status: 'list',
      isTemporary,
      purchasedAt: undefined,
      weekKey: undefined,
    };
    insertRow('shopping_items', rowValues(newItem, ITEM_COLUMNS));
    set((s) => ({ items: [...s.items, newItem] }));
    return id;
  },

  update(id, patch) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    updateRow('shopping_items', rowValues(patch, ITEM_COLUMNS), 'id = ?', [id]);
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
      insertRow('shopping_items', {
        id: weeklyId,
        name: monthly.name,
        amount: String(qty),
        unit: monthly.unit,
        list_type: 'weekly',
        checked: 0,
        store: monthly.store,
        price: monthly.price,
        category: monthly.category,
        monthly_allocated: 0,
        monthly_source_id: monthlyId,
      });
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
