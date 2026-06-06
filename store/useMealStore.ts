import { create } from 'zustand';
import db from '@/lib/db';
import { generateId } from '@/lib/id';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

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
    set({ dishes: loadDishes() });
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
