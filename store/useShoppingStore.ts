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
 *     (the staging-tray flow) don't write them — the old writer (addFromMonthly)
 *     was removed since no UI called it. adjustAmount/removeWithSource still
 *     release allocations for any pre-existing rows that carry one.
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 *   - isTemporary purges on monthly reset; permanent (isTemporary=false) catalog
 *     items are NEVER deleted by reset, only their status/pendingRestock fields move.
 *   - targetQuantity is only ever edited via the Update Sheet (components/UpdateSheet.tsx) —
 *     there is no live +/- stepper on the main Katalog rows any more.
 *   - There is no interactive carry/drop prompt for temporary items any more
 *     (CarryOverPromptModal was removed) — monthlyReset() always purges them outright.
 *   - add() consolidates duplicates: adding an item with the same status+name+dishName
 *     as an existing row bumps that row's targetQuantity (catalog) or amount
 *     (weekly/inWeeklyList) instead of inserting a new row — never assume add()
 *     always returns a freshly created id.
 *   - toggleCheck(id) flips `checked` immediately — a single tap moves an item straight
 *     into the cart, no separate staging/confirm step.
 *   - collected = "checked off while sitting in the cart" (cart-only UI state, distinct
 *     from checked, which means "moved to cart"). fromCatalog = true means this
 *     row originated from the standing Katalog (status started as 'catalog'); it powers
 *     the monthly reset summary's inventory-vs-ad-hoc split (buildMonthlyResetSummary()).
 *     Call buildMonthlyResetSummary() BEFORE monthlyReset() — reset clears the very
 *     purchasedAt/shoppingTripId fields the summary reads.
 *   - load() runs every row through mergeDuplicateItems() first: a one-time self-healing
 *     pass that merges any pre-existing duplicate rows (same status+name+dishName) left
 *     over from before add()'s dedup safeguard existed, summing amount/targetQuantity
 *     and deleting the extra row(s). New duplicates can't form going forward (add()
 *     already prevents them) — this only cleans up old data.
 *   - putBackToInventory(id) reverts ANY row to status='catalog' (clearing checked/
 *     collected/pendingRestock) — used when removing a fromCatalog row from the weekly
 *     list/cart, since that single row IS the user's permanent Katalog entry (deleting it
 *     would lose it from inventory forever). addToWeeklyFromCatalog's optional `quantity`
 *     sets the new weekly row's `amount` (defaults to 1, matching the old no-arg behaviour).
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

export type ShoppingStatus = 'catalog' | 'staged' /* vestigial: never written by new code; kept for old row compatibility */ | 'inWeeklyList' | 'purchased';

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
  collected: boolean;
  fromCatalog: boolean;
};

export type ShoppingTrip = {
  id: string;
  completedAt: string;
  label: string;
  monthResetDate: number;
};

export type MonthlyResetSummaryItem = {
  id: string;
  name: string;
  price: number;
  amount: string;
  unit: string;
  purchasedAt: string;
};

export type MonthlyResetSummary = {
  generatedAt: string;
  inventorySpent: number;
  inventoryTotalValue: number;
  inventoryItems: MonthlyResetSummaryItem[];
  adHocItems: MonthlyResetSummaryItem[];
};

type ShoppingAddInput = Omit<ShoppingItem, 'id' | 'checked' | 'category' | 'monthlyAllocated' | 'monthlySourceId' | 'status' | 'purchasedAt' | 'weekKey' | 'isTemporary' | 'pendingRestock' | 'targetQuantity' | 'shoppingTripId' | 'collected' | 'fromCatalog'> & {
  category?: string;
  isTemporary?: boolean;
  status?: ShoppingStatus;
  targetQuantity?: number;
  fromCatalog?: boolean;
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
  resetWeekly: () => void;
  // New katalog/ukeliste pipeline actions
  setPendingRestock: (id: string, pending: boolean) => void;
  confirmStagingTray: () => void;
  doneShopping: (label: string, monthResetDate: number) => string;
  monthlyReset: () => void;
  // Cart "collected" checkbox (distinct from "checked" = moved to cart)
  toggleCollected: (id: string) => void;
  // "+" menu's "From Inventory" option — flips an existing catalog row straight
  // into the weekly list, bypassing the staging tray. `quantity` sets the
  // weekly row's amount (defaults to 1).
  addToWeeklyFromCatalog: (id: string, quantity?: number) => void;
  // Reverts a row back to status='catalog' — used when a fromCatalog item is
  // removed from the weekly list/cart instead of deleting it outright.
  putBackToInventory: (id: string) => void;
  buildMonthlyResetSummary: () => MonthlyResetSummary;
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
    collected: readBool(row, 'collected'),
    fromCatalog: readBool(row, 'from_catalog'),
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
  collected: { col: 'collected', to: (v) => (v ? 1 : 0) },
  fromCatalog: { col: 'from_catalog', to: (v) => (v ? 1 : 0) },
};

/**
 * One-time self-healing pass: merges rows that share status+name+dishName (the
 * same key add()'s dedup safeguard checks) into a single row, summing amount
 * (weekly/cart/purchased rows) or targetQuantity (catalog rows) and deleting the
 * extras. Needed because that safeguard only stops *new* duplicates — rows
 * created before it existed can still be sitting in the DB.
 */
function mergeDuplicateItems(items: ShoppingItem[]): ShoppingItem[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = `${item.status}|${item.name.trim().toLowerCase()}|${item.dishName ?? ''}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const result: ShoppingItem[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    try {
      const [keep, ...dupes] = [...group].sort((a, b) => a.id.localeCompare(b.id));
      let amount = parseInt(keep.amount, 10) || 1;
      let targetQuantity = keep.targetQuantity;
      let price = keep.price;
      for (const dupe of dupes) {
        if (keep.status === 'catalog') {
          targetQuantity += dupe.targetQuantity;
        } else {
          amount += parseInt(dupe.amount, 10) || 1;
        }
        if (dupe.price > 0) price = dupe.price;
        db.runSync('DELETE FROM shopping_items WHERE id = ?', [dupe.id]);
      }
      const merged: ShoppingItem = { ...keep, amount: String(amount), targetQuantity, price };
      updateRow('shopping_items', rowValues(merged, ITEM_COLUMNS), 'id = ?', [keep.id]);
      result.push(merged);
    } catch {
      // Merge failed (e.g. mid-write error) — keep the rows as-is rather than losing data.
      result.push(...group);
    }
  }
  return result;
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  trips: [],

  load() {
    const items = loadAll('shopping_items', rowToItem, { orderBy: 'status, name' });
    set({
      items: mergeDuplicateItems(items),
      trips: loadAll('shopping_trips', rowToTrip, { orderBy: 'completed_at DESC' }),
    });
  },

  add(item) {
    const status = item.status ?? 'catalog';
    const targetQuantity = item.targetQuantity ?? 1;

    // Consolidate with an existing row of the same status/name/dish instead of
    // creating a duplicate row — same item added twice becomes one row with an
    // incremented amount (weekly/inventory-add) or target quantity (catalog-add).
    const trimmedName = item.name.trim();
    const existing = get().items.find(
      (i) =>
        i.status === status &&
        i.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (i.dishName ?? undefined) === (item.dishName ?? undefined)
    );
    if (existing) {
      const patch: Partial<Omit<ShoppingItem, 'id'>> =
        status === 'catalog'
          ? { targetQuantity: existing.targetQuantity + targetQuantity }
          : { amount: String((parseInt(existing.amount, 10) || 1) + (parseInt(item.amount, 10) || 1)) };
      if (item.price > 0) patch.price = item.price;
      get().update(existing.id, patch);
      return existing.id;
    }

    const id = generateId();
    const category = item.category ?? 'other';
    const isTemporary = item.isTemporary ?? false;
    const fromCatalog = item.fromCatalog ?? status === 'catalog';
    const newItem: ShoppingItem = {
      ...item,
      id,
      name: trimmedName,
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
      collected: false,
      fromCatalog,
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
    const patch: Partial<Omit<ShoppingItem, 'id'>> = { checked: !item.checked };
    // When unchecking a collected cart item, clear collected too so it
    // doesn't silently re-enter the cart in a pre-collected state.
    if (item.checked && item.collected) patch.collected = false;
    get().update(id, patch);
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
      const deductMap = new Map<string, number>();
      for (const w of weeklyWithSource) {
        const qty = parseInt(w.amount, 10) || 1;
        deductMap.set(w.monthlySourceId!, (deductMap.get(w.monthlySourceId!) ?? 0) + qty);
      }
      return {
        items: s.items
          .filter((i) => i.listType !== 'weekly')
          .map((i) =>
            deductMap.has(i.id)
              ? { ...i, monthlyAllocated: Math.max(0, i.monthlyAllocated - deductMap.get(i.id)!) }
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
      "UPDATE shopping_items SET status = 'purchased', purchased_at = ?, shopping_trip_id = ?, checked = 0, collected = 0 WHERE status = 'inWeeklyList'",
      [now, tripId]
    );
    const trip: ShoppingTrip = { id: tripId, completedAt: now, label, monthResetDate };
    set((s) => ({
      trips: [trip, ...s.trips],
      items: s.items.map((i) =>
        i.status === 'inWeeklyList'
          ? { ...i, status: 'purchased' as const, purchasedAt: now, shoppingTripId: tripId, checked: false, collected: false }
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
      "UPDATE shopping_items SET status = 'catalog', shopping_trip_id = NULL, purchased_at = NULL, checked = 0, collected = 0 WHERE shopping_trip_id IS NOT NULL"
    );
    db.runSync('DELETE FROM shopping_trips');
    db.runSync('DELETE FROM shopping_items WHERE is_temporary = 1');
    db.runSync('UPDATE shopping_items SET pending_restock = 0');
    db.runSync("UPDATE shopping_items SET status = 'catalog', checked = 0, collected = 0 WHERE status = 'inWeeklyList'");

    set((s) => ({
      trips: [],
      items: s.items
        .filter((i) => !i.isTemporary)
        .map((i) => {
          if (i.shoppingTripId || i.status === 'inWeeklyList') {
            return { ...i, status: 'catalog' as const, shoppingTripId: undefined, purchasedAt: undefined, pendingRestock: false, checked: false, collected: false };
          }
          return { ...i, pendingRestock: false };
        }),
    }));
  },

  toggleCollected(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    get().update(id, { collected: !item.collected });
  },

  addToWeeklyFromCatalog(id, quantity = 1) {
    const item = get().items.find((i) => i.id === id && i.status === 'catalog');
    if (!item) return;
    get().update(id, { status: 'inWeeklyList', pendingRestock: false, amount: String(Math.max(1, quantity)) });
  },

  putBackToInventory(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    get().update(id, { status: 'catalog', checked: false, collected: false, pendingRestock: false });
  },

  /**
   * Snapshot for the monthly reset summary — must be called BEFORE monthlyReset(),
   * since that mutates/clears the very purchasedAt/shoppingTripId fields this reads.
   */
  buildMonthlyResetSummary() {
    const items = get().items;
    const lineTotal = (i: ShoppingItem) => i.price * (parseInt(i.amount, 10) || 1);
    const byPurchasedAt = (a: ShoppingItem, b: ShoppingItem) =>
      (a.purchasedAt ?? '').localeCompare(b.purchasedAt ?? '');
    const toSummaryItem = (i: ShoppingItem): MonthlyResetSummaryItem => ({
      id: i.id,
      name: i.name,
      price: i.price,
      amount: i.amount,
      unit: i.unit,
      purchasedAt: i.purchasedAt ?? '',
    });

    const purchased = items.filter((i) => i.status === 'purchased');
    const inventoryPurchased = purchased.filter((i) => i.fromCatalog).sort(byPurchasedAt);
    const adHocPurchased = purchased.filter((i) => !i.fromCatalog).sort(byPurchasedAt);

    // "Full inventory list" value = everything that's part of the standing Katalog
    // right now (status='catalog') plus catalog-sourced rows currently checked out
    // for this trip (inWeeklyList/purchased, same row, fromCatalog carries over).
    const inventoryUniverse = items.filter((i) => !i.isTemporary && (i.status === 'catalog' || i.fromCatalog));
    const inventoryTotalValue = inventoryUniverse.reduce((sum, i) => sum + i.price * i.targetQuantity, 0);

    return {
      generatedAt: new Date().toISOString(),
      inventorySpent: inventoryPurchased.reduce((sum, i) => sum + lineTotal(i), 0),
      inventoryTotalValue,
      inventoryItems: inventoryPurchased.map(toSummaryItem),
      adHocItems: adHocPurchased.map(toSummaryItem),
    };
  },
}));
