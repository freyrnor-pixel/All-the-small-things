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

function seedCatalog(): StoreItem[] {
  const now = new Date().toISOString();
  const inserted: StoreItem[] = [];
  for (const s of CATALOG_SEED) {
    const id = generateId();
    try {
      db.runSync(
        `INSERT OR IGNORE INTO store_items (id, name, category, store, price, last_updated)
         VALUES (?, ?, ?, '', 0, ?)`,
        [id, s.name, s.category, now]
      );
      inserted.push({ id, name: s.name, category: s.category, store: '', price: 0 });
    } catch { /* already exists */ }
  }
  return inserted;
}

export const useCatalogStore = create<CatalogStore>((set, get) => ({
  items: [],

  load() {
    try {
      const rows = db.getAllSync<Record<string, unknown>>(
        'SELECT * FROM store_items ORDER BY name'
      );
      let items = rows.map(rowToItem);
      if (items.length === 0) {
        seedCatalog();
        const seeded = db.getAllSync<Record<string, unknown>>(
          'SELECT * FROM store_items ORDER BY name'
        );
        items = seeded.map(rowToItem);
      }
      set({ items });
    } catch {
      set({ items: [] });
    }
  },

  suggest(query, limit = 8) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = get().items.filter((i) => i.name.toLowerCase().includes(q));
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
