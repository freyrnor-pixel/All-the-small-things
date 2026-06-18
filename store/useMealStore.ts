/**
 * useMealStore.ts — dishes and their ingredients (meal planning)
 *
 * Zustand store for saved dishes (by meal type) and their nested ingredient
 * lists. Backs the meals screen and the randomDish() "what should I cook" picker;
 * ingredients can be pushed onto the shopping list from the consuming screen.
 *
 * Connections:
 *   Imports → lib/db, lib/id
 *   Used by → app/_layout.tsx, app/meals.tsx
 *   Data    → defines a Zustand store; owns SQLite tables dishes and ingredients (1-to-many)
 *
 * Edit notes:
 *   - ingredients are loaded in one query and grouped onto dishes in JS (loadDishes), not via a JOIN.
 *   - dishes/ingredients are configuration, not dated history — they are NOT pruned by RETENTION_DAYS; deleting a dish cascades to its ingredients (FK ON DELETE CASCADE).
 *   - New columns go through the migrations array in lib/db.ts; never recreate tables.
 */
import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'kveldsmat';

export type Ingredient = {
  id: string;
  dishId: string;
  name: string;
  amount: string;
  unit: string;
};

export type Dish = {
  id: string;
  name: string;
  mealType: MealType;
  ingredients: Ingredient[];
};

type MealStore = {
  dishes: Dish[];
  load: () => void;
  addDish: (d: { name: string; mealType: MealType }) => Dish;
  updateDish: (id: string, patch: { name?: string; mealType?: MealType }) => void;
  removeDish: (id: string) => void;
  addIngredient: (i: Omit<Ingredient, 'id'>) => void;
  removeIngredient: (id: string) => void;
  randomDish: (mealType?: MealType) => Dish | undefined;
};

function loadDishes(): Dish[] {
  const dishRows = db.getAllSync<{
    id: string;
    name: string;
    meal_type: string;
  }>('SELECT * FROM dishes ORDER BY name');

  const ingredientRows = db.getAllSync<{
    id: string;
    dish_id: string;
    name: string;
    amount: string;
    unit: string;
  }>('SELECT * FROM ingredients ORDER BY name');

  return dishRows.map((d) => ({
    id: d.id,
    name: d.name,
    mealType: d.meal_type as MealType,
    ingredients: ingredientRows
      .filter((i) => i.dish_id === d.id)
      .map((i) => ({
        id: i.id,
        dishId: i.dish_id,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
  }));
}

export const useMealStore = create<MealStore>((set, get) => ({
  dishes: [],

  load() {
    try {
      set({ dishes: loadDishes() });
    } catch {
      set({ dishes: [] });
    }
  },

  addDish({ name, mealType }) {
    const id = generateId();
    db.runSync('INSERT INTO dishes (id, name, meal_type) VALUES (?, ?, ?)', [
      id,
      name,
      mealType,
    ]);
    const dish: Dish = { id, name, mealType, ingredients: [] };
    set((s) => ({ dishes: [...s.dishes, dish] }));
    return dish;
  },

  updateDish(id, patch) {
    const dish = get().dishes.find((d) => d.id === id);
    if (!dish) return;
    const next = { ...dish, ...patch };
    db.runSync('UPDATE dishes SET name=?, meal_type=? WHERE id=?', [
      next.name,
      next.mealType,
      id,
    ]);
    set((s) => ({
      dishes: s.dishes.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  },

  removeDish(id) {
    db.runSync('DELETE FROM dishes WHERE id = ?', [id]);
    set((s) => ({ dishes: s.dishes.filter((d) => d.id !== id) }));
  },

  addIngredient(i) {
    const id = generateId();
    db.runSync(
      'INSERT INTO ingredients (id, dish_id, name, amount, unit) VALUES (?, ?, ?, ?, ?)',
      [id, i.dishId, i.name, i.amount, i.unit]
    );
    const ingredient: Ingredient = { ...i, id };
    set((s) => ({
      dishes: s.dishes.map((d) =>
        d.id === i.dishId
          ? { ...d, ingredients: [...d.ingredients, ingredient] }
          : d
      ),
    }));
  },

  removeIngredient(id) {
    db.runSync('DELETE FROM ingredients WHERE id = ?', [id]);
    set((s) => ({
      dishes: s.dishes.map((d) => ({
        ...d,
        ingredients: d.ingredients.filter((i) => i.id !== id),
      })),
    }));
  },

  randomDish(mealType) {
    const { dishes } = get();
    const pool = mealType
      ? dishes.filter((d) => d.mealType === mealType)
      : dishes;
    if (pool.length === 0) return undefined;
    return pool[Math.floor(Math.random() * pool.length)];
  },
}));
