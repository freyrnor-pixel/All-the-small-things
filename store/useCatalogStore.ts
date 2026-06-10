/**
 * useCatalogStore.ts — item catalog + purchase history (store/price suggestions)
 *
 * Zustand store backing the scan/shopping autocomplete: remembers known grocery
 * items with their last store and price, and logs every purchase. Powers the
 * suggest() typeahead and learns from recordPurchases() so suggestions improve.
 *
 * Connections:
 *   Imports → lib/catalogSeed, lib/db, lib/id
 *   Used by → app/_layout.tsx, app/scan.tsx, app/shopping.tsx
 *   Data    → defines a Zustand store; owns SQLite tables store_items (catalog) and purchase_log (append-only history)
 *
 * Edit notes:
 *   - seedCatalog() runs on every load() and uses stable name-derived IDs ('cat_<name>') with INSERT OR IGNORE — safe to re-run, but renaming seed items orphans old rows.
 *   - purchase_log is append-only and pruned by RETENTION_DAYS in lib/db.ts; recordPurchases() also upserts the catalog row's store/price/category.
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';
import { CATALOG_SEED } from '@/lib/catalogSeed';

export type StoreItem = {
  id: string;
  name: string;
  category: string;
  store: string;
  price: number;
};

export type PurchaseInput = {
  name: string;
  category?: string;
  store: string;
  price: number;
  wasOnList: boolean;
};

type CatalogStore = {
  items: StoreItem[];
  load: () => void;
  suggest: (query: string, limit?: number) => StoreItem[];
  recordPurchases: (purchases: PurchaseInput[]) => void;
};

function rowToItem(row: Record<string, unknown>): StoreItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) || 'other',
    store: (row.store as string) || '',
    price: (row.price as number) || 0,
  };
}

function seedCatalog(): void {
  const now = new Date().toISOString();
  for (const s of CATALOG_SEED) {
    // Stable ID derived from name so this is safe to call on every load.
    const stableId = 'cat_' + s.name.toLowerCase().replace(/\s+/g, '_');
    try {
      db.runSync(
        `INSERT OR IGNORE INTO store_items (id, name, category, store, price, last_updated)
         VALUES (?, ?, ?, '', ?, ?)`,
        [stableId, s.name, s.category, s.price, now]
      );
      // Backfill price for rows that were seeded before prices were added.
      db.runSync(
        `UPDATE store_items SET price = ? WHERE id = ? AND price = 0`,
        [s.price, stableId]
      );
    } catch { /* ignore */ }
  }
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  items: [],

  load() {
    try {
      seedCatalog();
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM store_items ORDER BY name'
      );
      set({ items: rows.map(rowToItem) });
    } catch {
      set({ items: [] });
    }
  },

  suggest(query, limit = 8) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set<string>();
    const matches = get().items.filter((i) => {
      const ln = i.name.toLowerCase();
      if (!ln.includes(q) || seen.has(ln)) return false;
      seen.add(ln);
      return true;
    });
    matches.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return ap !== bp ? ap - bp : a.name.localeCompare(b.name, 'no');
    });
    return matches.slice(0, limit);
  },

  recordPurchases(purchases) {
    if (purchases.length === 0) return;
    const now = new Date().toISOString();
    const next = [...get().items];

    for (const p of purchases) {
      const name = p.name.trim();
      if (!name) continue;
      try {
        db.runSync(
          `INSERT INTO purchase_log (id, item_name, store, price, was_on_list, purchased_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [generateId(), name, p.store, p.price, p.wasOnList ? 1 : 0, now]
        );
      } catch { /* logging is best-effort */ }

      const idx = next.findIndex((i) => i.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const merged: StoreItem = {
          ...next[idx],
          store: p.store || next[idx].store,
          price: p.price > 0 ? p.price : next[idx].price,
          category: p.category ?? next[idx].category,
        };
        next[idx] = merged;
        try {
          db.runSync(
            'UPDATE store_items SET store = ?, price = ?, category = ?, last_updated = ? WHERE id = ?',
            [merged.store, merged.price, merged.category, now, merged.id]
          );
        } catch { /* ignore */ }
      } else {
        const id = generateId();
        const item: StoreItem = { id, name, category: p.category ?? 'other', store: p.store, price: p.price };
        next.push(item);
        try {
          db.runSync(
            `INSERT INTO store_items (id, name, category, store, price, last_updated) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, item.name, item.category, item.store, item.price, now]
          );
        } catch { /* ignore */ }
      }
    }

    next.sort((a, b) => a.name.localeCompare(b.name, 'no'));
    set({ items: next });
  },
}));
