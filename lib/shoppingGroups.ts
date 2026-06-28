/**
 * shoppingGroups.ts — dish-grouping helpers for shopping items.
 *
 * Pure functions shared by every screen that needs to bucket ShoppingItem rows by
 * their optional dishName (the "From meals" grouping Week lists and Monthly both use).
 *
 * Connections:
 *   Imports → store/useShoppingStore (ShoppingItem type)
 *   Used by → app/shopping.tsx, app/index.tsx (Shopping widget)
 *   Data    → none — pure functions over arrays passed in by the caller
 *
 * Edit notes:
 *   - Not memoized — same cost as the inline filters this was extracted from; callers
 *     that render every frame should wrap calls in their own useMemo.
 *   - groupByDish() is also used standalone by the Monthly tab (no listId/status notion
 *     there, just catalog rows), while computeListGroups() is Week-list-specific
 *     (filters by status==='inWeeklyList' and a given listId first).
 */
import { ShoppingItem } from '@/store/useShoppingStore';

/** Buckets items into dish groups (sorted by dish name) and an ungrouped leftover list. */
export function groupByDish(items: ShoppingItem[]): { dishGroups: [string, ShoppingItem[]][]; ungrouped: ShoppingItem[] } {
  const dishMap = new Map<string, ShoppingItem[]>();
  const ungrouped: ShoppingItem[] = [];
  for (const item of items) {
    if (item.dishName) {
      const group = dishMap.get(item.dishName);
      if (group) group.push(item);
      else dishMap.set(item.dishName, [item]);
    } else {
      ungrouped.push(item);
    }
  }
  return { dishGroups: Array.from(dishMap.entries()).sort((a, b) => a[0].localeCompare(b[0])), ungrouped };
}

/** Buckets one Week list's inWeeklyList items into dish groups / ungrouped (orderIndex-sorted) / checked. */
export function computeListGroups(items: ShoppingItem[], listId: string) {
  const unchecked = items.filter((i) => i.status === 'inWeeklyList' && !i.checked && i.listId === listId);
  const checked = items
    .filter((i) => i.status === 'inWeeklyList' && i.checked && i.listId === listId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const { dishGroups, ungrouped: ungroupedUnchecked } = groupByDish(unchecked);
  ungroupedUnchecked.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return { dishGroups, ungroupedUnchecked, checked };
}
