/**
 * useShoppingStore.ts — Katalog (permanent inventory) + Ukeliste (weekly working list)
 *
 * Zustand store for shopping items, all living in the single `shopping_items`
 * table, driven by a single `status` pipeline:
 *   'catalog' -> 'staged' -> 'inWeeklyList' -> 'purchased'
 * ('staged' is vestigial — staging is now tracked via the `pendingRestock` flag
 * while status stays 'catalog', not via the status enum; the value is kept in
 * the type only so old rows remain a valid enum value.)
 *
 * Katalog (was "Månedsliste") is the permanent household inventory: items sit
 * at status='catalog', optionally flagged pendingRestock=true ("in the staging
 * tray"). Confirming the tray moves them to status='inWeeklyList' — the working
 * list for the current shopping trip. "Handlingen fullført" (doneShopping)
 * marks every inWeeklyList item 'purchased', stamps shoppingTripId +
 * purchasedAt, and creates a shopping_trips row that groups them for the
 * "Kjøpt denne måneden" sections back in Katalog. Monthly reset reverts
 * purchased/inWeeklyList non-temporary items back to 'catalog' and purges
 * shopping_trips + isTemporary rows (see monthlyReset()).
 *
 * Connections:
 *   Imports → lib/db, lib/dataAccess, lib/id
 *   Used by → app/_layout.tsx, app/index.tsx, app/meals.tsx, app/scan.tsx, app/settings.tsx, app/share-modal.tsx, app/shared.tsx, app/shopping.tsx, components/MonthlyTableRow.tsx, components/ShoppingRow.tsx, components/UpdateSheet.tsx, components/AddItemSheet.tsx, store/useAutomationStore.ts (read-only, for the add_shopping_item action)
 *   Data    → defines a Zustand store; owns SQLite tables shopping_items + shopping_trips
 *
 * Edit notes:
 *   - monthly_source_id/monthlyAllocated are legacy weekly<-monthly allocation
 *     fields, kept for backward read compatibility on old rows; new code paths
 *     (the staging-tray flow) don't write them. adjustAmount/removeWithSource
 *     still release allocations for any pre-existing rows that carry one.
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 *   - isTemporary purges on monthly reset; permanent (isTemporary=false) catalog
 *     items are NEVER deleted by reset, only their status/pendingRestock fields move.
 *   - targetQuantity is only ever edited via the Update Sheet (components/UpdateSheet.tsx) —
 *     there is no live +/- stepper on the main Katalog rows any more.
 *   - getCarryOverCandidates is now purely informational — there is no interactive
 *     carry/drop prompt; monthlyReset() always purges temporary items outright
 *     (see CarryOverPromptModal removal note in app/shopping.tsx).
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
  readInt,
  readBool,
} from '@/lib/dataAccess';
import { generateId } from '@/lib/id';

export type ShoppingStatus = 'catalog' | 'staged' | 'inWeeklyList' | 'purchased';

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
  pendingRestock: boolean;
  targetQuantity: number;
  shoppingTripId?: string;
};

export type ShoppingTrip = {
  id: string;
  completedAt: string;
  label: string;
  monthResetDate: number;
};

type ShoppingAddInput = Omit<ShoppingItem, 'id' | 'checked' | 'category' | 'monthlyAllocated' | 'monthlySourceId' | 'status' | 'purchasedAt' | 'weekKey' | 'isTemporary' | 'pendingRestock' | 'targetQuantity' | 'shoppingTripId'> & {
  category?: string;
  isTemporary?: boolean;
  status?: ShoppingStatus;
  targetQuantity?: number;
};

type ShoppingStore = {
  items: ShoppingItem[];
  trips: ShoppingTrip[];
  load: () => void;
  add: (item: ShoppingAddInput) => string;
  update: (id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => void;
  toggleCheck: (id: string) => void;
  remove: (id: string) => void;
  removeWithSource: (id: string) => void;
  adjustAmount: (id: string, delta: number) => void;
  addFromMonthly: (monthlyId: string, qty: number) => void;
  resetWeekly: () => void;
  // New katalog/ukeliste pipeline actions
  setPendingRestock: (id: string, pending: boolean) => void;
  confirmStagingTray: () => void;
  doneShopping: (label: string, monthResetDate: number) => string;
  monthlyReset: () => void;
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
    status: (readStr(row, 'status') || 'catalog') as ShoppingStatus,
    isTemporary: readBool(row, 'is_temporary'),
    purchasedAt: readStr(row, 'purchased_at') || undefined,
    weekKey: readStr(row, 'week_key') || undefined,
    pendingRestock: readBool(row, 'pending_restock'),
    targetQuantity: readInt(row, 'target_quantity', 1),
    shoppingTripId: readStr(row, 'shopping_trip_id') || undefined,
  };
}

function rowToTrip(row: Row): ShoppingTrip {
  return {
    id: readStr(row, 'id'),
    completedAt: readStr(row, 'completed_at'),
    label: readStr(row, 'label'),
    monthResetDate: readInt(row, 'month_reset_date', 1),
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
  pendingRestock: { col: 'pending_restock', to: (v) => (v ? 1 : 0) },
  targetQuantity: { col: 'target_quantity', to: (v) => v ?? 1 },
  shoppingTripId: { col: 'shopping_trip_id', to: (v) => v ?? null },
};

/** Informational only — items never purchased that will be purged on the next monthly reset. */
export function getCarryOverCandidates(items: ShoppingItem[]): ShoppingItem[] {
  return items.filter((i) => i.isTemporary && i.status !== 'purchased');
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  trips: [],

  load() {
    set({
      items: loadAll('shopping_items', rowToItem, { orderBy: 'list_type, checked, name' }),
      trips: loadAll('shopping_trips', rowToTrip, { orderBy: 'completed_at DESC' }),
    });
  },

  add(item) {
    const id = generateId();
    const category = item.category ?? 'other';
    const isTemporary = item.isTemporary ?? false;
    const status = item.status ?? 'catalog';
    const targetQuantity = item.targetQuantity ?? 1;
    const newItem: ShoppingItem = {
      ...item,
      id,
      checked: false,
      category,
      monthlyAllocated: 0,
      monthlySourceId: undefined,
      inventoryQty: item.inventoryQty ?? 0,
      status,
      isTemporary,
      purchasedAt: undefined,
      weekKey: undefined,
      pendingRestock: false,
      targetQuantity,
      shoppingTripId: undefined,
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
        status: 'inWeeklyList',
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
          status: 'inWeeklyList' as const,
          isTemporary: false,
          pendingRestock: false,
          targetQuantity: 1,
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

  /** Catalog checkbox press: flags an item for the staging tray without changing status. */
  setPendingRestock(id, pending) {
    get().update(id, { pendingRestock: pending });
  },

  /** Staging tray "Legg til i ukeliste" — commits every staged (pendingRestock) catalog item to the weekly list. */
  confirmStagingTray() {
    const staged = get().items.filter((i) => i.pendingRestock && i.status === 'catalog');
    if (staged.length === 0) return;
    db.runSync(
      "UPDATE shopping_items SET status = 'inWeeklyList', pending_restock = 0 WHERE pending_restock = 1 AND status = 'catalog'"
    );
    set((s) => ({
      items: s.items.map((i) =>
        i.pendingRestock && i.status === 'catalog'
          ? { ...i, status: 'inWeeklyList' as const, pendingRestock: false }
          : i
      ),
    }));
  },

  /** "Handlingen fullført" — creates a shopping_trips row and marks every inWeeklyList item purchased. */
  doneShopping(label, monthResetDate) {
    const tripId = generateId();
    const now = new Date().toISOString();
    insertRow('shopping_trips', {
      id: tripId,
      completed_at: now,
      label,
      month_reset_date: monthResetDate,
    });
    db.runSync(
      "UPDATE shopping_items SET status = 'purchased', purchased_at = ?, shopping_trip_id = ?, checked = 0 WHERE status = 'inWeeklyList'",
      [now, tripId]
    );
    const trip: ShoppingTrip = { id: tripId, completedAt: now, label, monthResetDate };
    set((s) => ({
      trips: [trip, ...s.trips],
      items: s.items.map((i) =>
        i.status === 'inWeeklyList'
          ? { ...i, status: 'purchased' as const, purchasedAt: now, shoppingTripId: tripId, checked: false }
          : i
      ),
    }));
    return tripId;
  },

  /**
   * Monthly reset, per the redesign's 5-step contract:
   *  1. Every shopping_trips row's purchased items get detached (status='catalog',
   *     shopping_trip_id=NULL, purchased_at=NULL), then all trip rows are deleted.
   *  2. Delete all isTemporary=1 items outright (purges quick adds permanently).
   *  3. Clear pendingRestock on everything that's left.
   *  4. Any remaining status='inWeeklyList' item (guaranteed isTemporary=0 here,
   *     since step 2 already removed temporary ones) reverts to status='catalog'.
   *  5. isTemporary=0 catalog items are never deleted — only their status/flags move.
   */
  monthlyReset() {
    db.runSync(
      "UPDATE shopping_items SET status = 'catalog', shopping_trip_id = NULL, purchased_at = NULL WHERE shopping_trip_id IS NOT NULL"
    );
    db.runSync('DELETE FROM shopping_trips');
    db.runSync('DELETE FROM shopping_items WHERE is_temporary = 1');
    db.runSync('UPDATE shopping_items SET pending_restock = 0');
    db.runSync("UPDATE shopping_items SET status = 'catalog' WHERE status = 'inWeeklyList'");

    set((s) => ({
      trips: [],
      items: s.items
        .filter((i) => !i.isTemporary)
        .map((i) => {
          if (i.shoppingTripId || i.status === 'inWeeklyList') {
            return { ...i, status: 'catalog' as const, shoppingTripId: undefined, purchasedAt: undefined, pendingRestock: false };
          }
          return { ...i, pendingRestock: false };
        }),
    }));
  },
}));
