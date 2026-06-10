/**
 * meals.tsx — dish library
 *
 * Library of dishes grouped by meal type, each with an editable ingredient
 * list. Dishes (or a random pick via 🎲) can be pushed straight onto the
 * weekly shopping list. Add/edit happens inline within the screen.
 *
 * Connections:
 *   Imports → components/ExpandableCard, components/HintCard, constants/theme, lib/i18n, store/useMealStore, store/useShoppingStore
 *   Used by → Expo Router route "/meals"
 *   Data    → useMealStore (dishes + ingredients tables); writes to useShoppingStore (shopping_items) when pushing a dish to shopping
 *
 * Edit notes:
 *   - All visible strings go through useT(); MEAL_TYPES holds only icon/colour metadata, labels come from t.mealTypes.
 *   - pushDishToShopping always adds ingredients as listType 'weekly'.
 */
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMealStore, MealType, Dish } from '@/store/useMealStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import ExpandableCard from '@/components/ExpandableCard';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

// Visual metadata only — labels come from the user's language via `t.mealTypes`.
const MEAL_TYPES: { value: MealType; icon: string; color: string }[] = [
  { value: 'breakfast', icon: '🌅', color: '#F6C344' },
  { value: 'lunch', icon: '🥙', color: '#6BAA75' },
  { value: 'dinner', icon: '🍽', color: '#F4A261' },
  { value: 'snack', icon: '🍎', color: '#7BC8A4' },
];

export default function MealsScreen() {
  const router = useRouter();
  const dishes = useMealStore((s) => s.dishes);
  const addDish = useMealStore((s) => s.addDish);
  const removeDish = useMealStore((s) => s.removeDish);
  const addIngredient = useMealStore((s) => s.addIngredient);
  const removeIngredient = useMealStore((s) => s.removeIngredient);
  const randomDish = useMealStore((s) => s.randomDish);
  const t = useT();
  const theme = useAppTheme();
  const addToShopping = useShoppingStore((s) => s.add);
  const mealLabel = (v: MealType) => t.mealTypes[v];

  const [filterType, setFilterType] = useState<MealType | 'all'>('all');
  const [addingDish, setAddingDish] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishType, setNewDishType] = useState<MealType>('dinner');

  const [addingIngredient, setAddingIngredient] = useState<string | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingAmount, setIngAmount] = useState('1');
  const [ingUnit, setIngUnit] = useState('');

  const filtered = filterType === 'all'
    ? dishes
    : dishes.filter((d) => d.mealType === filterType);

  function saveNewDish() {
    if (!newDishName.trim()) return;
    addDish({ name: newDishName.trim(), mealType: newDishType });
    setNewDishName('');
    setAddingDish(false);
  }

  function saveIngredient(dishId: string) {
    if (!ingName.trim()) return;
    addIngredient({ dishId, name: ingName.trim(), amount: ingAmount, unit: ingUnit });
    setIngName('');
    setIngAmount('1');
    setIngUnit('');
    setAddingIngredient(null);
  }

  function pushDishToShopping(dish: Dish) {
    dish.ingredients.forEach((ing) => {
      addToShopping({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        listType: 'weekly',
        store: '',
        price: 0,
      });
    });
  }

  function pickRandom(mealType?: MealType) {
    const dish = randomDish(mealType);
    if (!dish) {
      Alert.alert(
        t.noDishesTitle,
        mealType ? t.noDishesBody(mealLabel(mealType).toLowerCase()) : t.noDishesBodyGeneric
      );
      return;
    }
    Alert.alert(
      dish.name,
      dish.ingredients.length > 0
        ? t.randomIngredientsLabel(dish.ingredients.map((i) => `${i.amount} ${i.unit} ${i.name}`).join(', '))
        : t.randomNoIngredients,
      [
        { text: t.addToShoppingList, onPress: () => pushDishToShopping(dish) },
        { text: t.ok },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.mealsTitle}</Text>
        <Pressable style={[styles.randomBtn, { backgroundColor: theme.white }]} onPress={() => pickRandom()}>
          <Text style={styles.randomBtnText}>🎲</Text>
        </Pressable>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.chip, { backgroundColor: theme.grayLight }, filterType === 'all' && { backgroundColor: theme.orange }]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.chipText, { color: theme.text }, filterType === 'all' && { color: '#fff' }]}>{t.mealAll}</Text>
        </Pressable>
        {MEAL_TYPES.map((mt) => (
          <Pressable
            key={mt.value}
            style={[styles.chip, { backgroundColor: theme.grayLight }, filterType === mt.value && { backgroundColor: theme.orange }]}
            onPress={() => setFilterType(mt.value)}
          >
            <Text style={[styles.chipText, { color: theme.text }, filterType === mt.value && { color: '#fff' }]}>
              {mt.icon} {mealLabel(mt.value)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <HintCard text={t.hints.meals.text} example={t.hints.meals.example} />
        {/* Add dish */}
        {addingDish ? (
          <View style={[styles.addCard, { backgroundColor: theme.white }]}>
            <TextInput
              style={[styles.addInput, { backgroundColor: theme.offWhite, color: theme.text }]}
              value={newDishName}
              onChangeText={setNewDishName}
              placeholder={t.dishNamePlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
              <View style={styles.typeRow}>
                {MEAL_TYPES.map((mt) => (
                  <Pressable
                    key={mt.value}
                    style={[styles.chip, { backgroundColor: theme.grayLight }, newDishType === mt.value && { backgroundColor: theme.orange }]}
                    onPress={() => setNewDishType(mt.value)}
                  >
                    <Text style={[styles.chipText, { color: theme.text }, newDishType === mt.value && { color: '#fff' }]}>
                      {mt.icon} {mealLabel(mt.value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.addActions}>
              <Pressable onPress={() => setAddingDish(false)}>
                <Text style={[styles.cancelText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={saveNewDish}>
                <Text style={styles.confirmBtnText}>{t.save}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.addTrigger, { borderColor: theme.green }]} onPress={() => setAddingDish(true)}>
            <Text style={[styles.addTriggerText, { color: theme.green }]}>{t.newDishTrigger}</Text>
          </Pressable>
        )}

        {/* Dishes */}
        {filtered.map((dish) => (
          <ExpandableCard
            key={dish.id}
            title={dish.name}
            subtitle={mealLabel(dish.mealType)}
            badge={t.ingredientsCount(dish.ingredients.length)}
            accentColor={MEAL_TYPES.find((m) => m.value === dish.mealType)?.color}
            rightAction={
              <Pressable
                onPress={() => pushDishToShopping(dish)}
                style={styles.shoppingBtn}
                hitSlop={8}
              >
                <Text style={styles.shoppingBtnText}>🛒</Text>
              </Pressable>
            }
          >
            {/* Ingredients list */}
            {dish.ingredients.map((ing) => (
              <View key={ing.id} style={styles.ingRow}>
                <Text style={[styles.ingText, { color: theme.text }]}>
                  {ing.amount} {ing.unit} {ing.name}
                </Text>
                <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={8}>
                  <Text style={[styles.removeText, { color: theme.gray }]}>×</Text>
                </Pressable>
              </View>
            ))}

            {/* Add ingredient inline */}
            {addingIngredient === dish.id ? (
              <View style={styles.ingAddCard}>
                <TextInput
                  style={[styles.ingInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                  value={ingName}
                  onChangeText={setIngName}
                  placeholder={t.ingredientPlaceholder}
                  placeholderTextColor={theme.gray}
                  autoFocus
                />
                <View style={styles.ingAmountRow}>
                  <TextInput
                    style={[styles.ingInput, { width: 60, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingAmount}
                    onChangeText={setIngAmount}
                    keyboardType="decimal-pad"
                    placeholder={t.shoppingAmountPlaceholder}
                    placeholderTextColor={theme.gray}
                  />
                  <TextInput
                    style={[styles.ingInput, { flex: 1, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingUnit}
                    onChangeText={setIngUnit}
                    placeholder={t.shoppingUnitPlaceholder}
                    placeholderTextColor={theme.gray}
                  />
                </View>
                <View style={styles.ingActions}>
                  <Pressable onPress={() => setAddingIngredient(null)}>
                    <Text style={[styles.cancelText, { color: theme.textLight }]}>{t.cancel}</Text>
                  </Pressable>
                  <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={() => saveIngredient(dish.id)}>
                    <Text style={styles.confirmBtnText}>{t.addItemBtn}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.ingFooter}>
                <Pressable onPress={() => setAddingIngredient(dish.id)}>
                  <Text style={[styles.ingAddText, { color: theme.green }]}>{t.addIngredientTrigger}</Text>
                </Pressable>
                <Pressable onPress={() => removeDish(dish.id)}>
                  <Text style={[styles.deleteText, { color: theme.danger }]}>{t.deleteDish}</Text>
                </Pressable>
              </View>
            )}
          </ExpandableCard>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  back: { fontSize: FontSize.md, color: Colors.orange, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  randomBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  randomBtnText: { fontSize: 20 },
  filterRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  chipActive: { backgroundColor: Colors.orange },
  chipText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  chipActiveText: { color: Colors.white },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  addTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.green,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addTriggerText: { fontSize: FontSize.md, color: Colors.green, fontWeight: '600' },
  addCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  addInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textLight },
  confirmBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  ingText: { fontSize: FontSize.sm, color: Colors.text },
  removeText: { fontSize: 18, color: Colors.gray },
  shoppingBtn: { padding: Spacing.xs },
  shoppingBtnText: { fontSize: 18 },
  ingAddCard: { marginTop: Spacing.sm, gap: Spacing.sm },
  ingInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  ingAmountRow: { flexDirection: 'row', gap: Spacing.sm },
  ingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  ingAddText: { fontSize: FontSize.sm, color: Colors.green, fontWeight: '600' },
  deleteText: { fontSize: FontSize.sm, color: Colors.danger },
});
