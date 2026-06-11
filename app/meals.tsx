/**
 * meals.tsx — dish library
 *
 * Library of dishes grouped by meal type, each with an editable ingredient
 * list. Dishes (or a random pick via 🎲) can be pushed straight onto the
 * weekly shopping list. Add/edit happens inline within the screen.
 *
 * Connections:
 *   Imports → components/ConfirmationBanner, components/ExpandableCard, components/HintCard, components/PressableScale, constants/theme, lib/haptics, lib/i18n, store/useMealStore, store/useShoppingStore
 *   Used by → Expo Router route "/meals"
 *   Data    → useMealStore (dishes + ingredients tables); writes to useShoppingStore (shopping_items) when pushing a dish to shopping
 *
 * Edit notes:
 *   - All visible strings go through useT(); MEAL_TYPES holds only icon/colour metadata, labels come from t.mealTypes.
 *   - pushDishToShopping always adds ingredients as listType 'weekly' and surfaces a ConfirmationBanner.
 *   - Prep complexity is a derived proxy (ingredient count → 1–3 dots), NOT a DB column: 0–2 = simple, 3–5 = medium, 6+ = involved.
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import ConfirmationBanner from '@/components/ConfirmationBanner';
import PressableScale from '@/components/PressableScale';
import { success } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/lib/useAppTheme';

// Prep-complexity proxy from ingredient count (no DB column). Returns 1–3 dots.
function prepLevel(ingredientCount: number): 1 | 2 | 3 {
  if (ingredientCount >= 6) return 3;
  if (ingredientCount >= 3) return 2;
  return 1;
}

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
  const [confirm, setConfirm] = useState<string | null>(null);

  const prepLabels: Record<1 | 2 | 3, string> = {
    1: t.prepSimple,
    2: t.prepMedium,
    3: t.prepComplex,
  };

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
    success();
    setConfirm(t.addedToShoppingConfirm);
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
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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

        {/* Prominent random picker — the headline interaction */}
        <PressableScale
          style={[styles.surpriseBtn, { backgroundColor: theme.green }]}
          onPress={() => pickRandom(filterType === 'all' ? undefined : filterType)}
          scaleTo={0.96}
        >
          <Text style={styles.surpriseIcon}>🎲</Text>
          <Text style={styles.surpriseTitle}>{t.surpriseMe}</Text>
          <Text style={styles.surpriseSub}>{t.pickRandomDishSub}</Text>
        </PressableScale>

        {/* Add dish */}
        {addingDish ? (
          <View style={[styles.addCard, { backgroundColor: theme.white }]}>
            {/* Meal type row — pick type first so the name field stays visible above keyboard */}
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt.value}
                  style={[
                    styles.typePill,
                    { backgroundColor: theme.grayLight },
                    newDishType === mt.value && { backgroundColor: theme.orange },
                  ]}
                  onPress={() => setNewDishType(mt.value)}
                >
                  <Text style={styles.typePillIcon}>{mt.icon}</Text>
                  <Text style={[styles.typePillLabel, { color: theme.text }, newDishType === mt.value && { color: '#fff' }]}>
                    {mealLabel(mt.value)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { flex: 1, backgroundColor: theme.offWhite, color: theme.text }]}
                value={newDishName}
                onChangeText={setNewDishName}
                placeholder={t.dishNamePlaceholder}
                placeholderTextColor={theme.gray}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveNewDish}
              />
              <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={saveNewDish}>
                <Text style={styles.confirmBtnText}>{t.save}</Text>
              </Pressable>
              <Pressable onPress={() => setAddingDish(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: theme.textLight }]}>✕</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.addTrigger, { borderColor: theme.green }]} onPress={() => setAddingDish(true)}>
            <Text style={[styles.addTriggerText, { color: theme.green }]}>{t.newDishTrigger}</Text>
          </Pressable>
        )}

        {/* Dishes */}
        {filtered.map((dish) => {
          const level = prepLevel(dish.ingredients.length);
          return (
          <ExpandableCard
            key={dish.id}
            title={dish.name}
            subtitle={`${mealLabel(dish.mealType)} · ${prepLabels[level]}`}
            badge={t.ingredientsCount(dish.ingredients.length)}
            accentColor={MEAL_TYPES.find((m) => m.value === dish.mealType)?.color}
            rightAction={
              <View style={styles.rightActions}>
                <View style={styles.prepDots} accessibilityLabel={prepLabels[level]}>
                  {[1, 2, 3].map((d) => (
                    <View
                      key={d}
                      style={[
                        styles.prepDot,
                        { backgroundColor: d <= level ? theme.green : theme.grayLight },
                      ]}
                    />
                  ))}
                </View>
                <Pressable
                  onPress={() => pushDishToShopping(dish)}
                  style={styles.shoppingBtn}
                  hitSlop={8}
                >
                  <Text style={styles.shoppingBtnText}>🛒</Text>
                </Pressable>
              </View>
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
                <View style={styles.ingAmountRow}>
                  <TextInput
                    style={[styles.ingInput, { width: 52, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingAmount}
                    onChangeText={setIngAmount}
                    keyboardType="decimal-pad"
                    placeholder={t.shoppingAmountPlaceholder}
                    placeholderTextColor={theme.gray}
                  />
                  <TextInput
                    style={[styles.ingInput, { width: 60, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingUnit}
                    onChangeText={setIngUnit}
                    placeholder={t.shoppingUnitPlaceholder}
                    placeholderTextColor={theme.gray}
                  />
                  <TextInput
                    style={[styles.ingInput, { flex: 1, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingName}
                    onChangeText={setIngName}
                    placeholder={t.ingredientPlaceholder}
                    placeholderTextColor={theme.gray}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => saveIngredient(dish.id)}
                  />
                  <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={() => saveIngredient(dish.id)}>
                    <Text style={styles.confirmBtnText}>+</Text>
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
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>
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
  surpriseBtn: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 2,
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  surpriseIcon: { fontSize: 40 },
  surpriseTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.xl, marginTop: 4 },
  surpriseSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  prepDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  prepDot: { width: 7, height: 7, borderRadius: Radius.full },
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
    gap: Spacing.sm,
    ...Shadow.card,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.xs },
  typePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  typePillIcon: { fontSize: 16 },
  typePillLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  cancelBtn: { padding: Spacing.xs },
  cancelText: { fontSize: FontSize.md, color: Colors.textLight },
  confirmBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },
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
  ingAddCard: { marginTop: Spacing.xs },
  ingInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  ingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  ingAddText: { fontSize: FontSize.sm, color: Colors.green, fontWeight: '600' },
  deleteText: { fontSize: FontSize.sm, color: Colors.danger },
});
