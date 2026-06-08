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
};

type ShoppingAddInput = Omit<ShoppingItem, 'id' | 'checked' | 'category'> & { category?: string };

type ShoppingStore = {
  items: ShoppingItem[];
  load: () => void;
  add: (item: ShoppingAddInput) => void;
  update: (id: string, patch: Partial<Omit<ShoppingItem, 'id'>>) => void;
  toggleCheck: (id: string) => void;
  remove: (id: string) => void;
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
  };
}

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],

  load() {
    const rows = db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM shopping_items ORDER BY list_type, checked, name'
    );
    set({ items: rows.map(rowToItem) });
  },

  add(item) {
    const id = generateId();
    const category = item.category ?? 'other';
    db.runSync(
      `INSERT INTO shopping_items (id, name, amount, unit, list_type, checked, store, price, category)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [id, item.name, item.amount, item.unit, item.listType, item.store, item.price, category]
    );
    set((s) => ({
      items: [...s.items, { ...item, id, checked: false, category }],
    }));
  },

  update(id, patch) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const next = { ...item, ...patch };
    db.runSync(
      `UPDATE shopping_items SET name=?, amount=?, unit=?, list_type=?, checked=?, store=?, price=?, category=? WHERE id=?`,
      [next.name, next.amount, next.unit, next.listType, next.checked ? 1 : 0, next.store, next.price, next.category, id]
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

  resetWeekly() {
    db.runSync("DELETE FROM shopping_items WHERE list_type = 'weekly'");
    set((s) => ({ items: s.items.filter((i) => i.listType !== 'weekly') }));
  },

  resetMonthly() {
    db.runSync("UPDATE shopping_items SET checked = 0 WHERE list_type = 'monthly'");
    set((s) => ({
      items: s.items.map((i) =>
        i.listType === 'monthly' ? { ...i, checked: false } : i
      ),
    }));
  },
}));
