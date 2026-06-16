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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMealStore, MealType, Dish } from '@/store/useMealStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import ExpandableCard from '@/components/ExpandableCard';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import { success } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
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
  { value: 'kveldsmat', icon: '🌙', color: '#9B8EC4' },
];

const UNIT_OPTIONS = ['kg', 'g', 'dl', 'l', 'stk'];

export default function MealsScreen() {
  const router = useRouter();
  const dishes = useMealStore((s) => s.dishes);
  const addDish = useMealStore((s) => s.addDish);
  const removeDish = useMealStore((s) => s.removeDish);
  const addIngredient = useMealStore((s) => s.addIngredient);
  const removeIngredient = useMealStore((s) => s.removeIngredient);
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
  const [showUnitPicker, setShowUnitPicker] = useState(false);
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
        dishId: dish.id,
        dishName: dish.name,
      });
    });
    success();
    setConfirm(t.addedToShoppingConfirm);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
      >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.mealsTitle}</Text>
        <View style={{ width: 40 }} />
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
            style={[styles.chip, { backgroundColor: theme.grayLight }, filterType === mt.value && { backgroundColor: mt.color }]}
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

        {/* Empty state */}
        {filtered.length === 0 && !addingDish && !addingIngredient && (
          <View style={[styles.emptyState, { backgroundColor: theme.white }]}>
            <Text style={styles.emptyEmoji}>
              {filterType === 'all' ? '🍽' : MEAL_TYPES.find((m) => m.value === filterType)?.icon}
            </Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t.noDishesTitle}</Text>
            <Text style={[styles.emptyBody, { color: theme.textLight }]}>
              {filterType === 'all'
                ? t.noDishesBodyGeneric
                : t.noDishesBody(mealLabel(filterType as MealType).toLowerCase())}
            </Text>
          </View>
        )}

        {/* Dishes — hidden while adding a new dish to keep the form focused */}
        {!addingDish && filtered.map((dish) => {
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
                  style={[styles.shoppingBtn, { backgroundColor: theme.grayLight }]}
                  hitSlop={8}
                >
                  <Text style={styles.shoppingBtnText}>🛒</Text>
                </Pressable>
              </View>
            }
          >
            {/* Ingredients list */}
            {dish.ingredients.map((ing, i) => (
              <View
                key={ing.id}
                style={[
                  styles.ingRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.grayLight },
                ]}
              >
                <Text style={[styles.ingText, { color: theme.text }]}>
                  {ing.amount} {ing.unit} {ing.name}
                </Text>
                <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={8}>
                  <Text style={[styles.removeText, { color: theme.gray }]}>−</Text>
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
                  {/* Unit picker — tap to show options instead of free-text */}
                  <Pressable
                    style={[styles.ingInput, styles.unitPickerBtn, { backgroundColor: theme.offWhite }]}
                    onPress={() => setShowUnitPicker((v) => !v)}
                  >
                    <Text style={[{ color: ingUnit ? theme.text : theme.gray }, { fontSize: FontSize.sm }]}>
                      {ingUnit || t.shoppingUnitPlaceholder}
                    </Text>
                    <Text style={{ color: theme.gray, fontSize: 10 }}>▼</Text>
                  </Pressable>
                  <TextInput
                    style={[styles.ingInput, { flex: 1, backgroundColor: theme.offWhite, color: theme.text }]}
                    value={ingName}
                    onChangeText={setIngName}
                    placeholder={t.ingredientPlaceholder}
                    placeholderTextColor={theme.gray}
                    autoFocus
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={() => saveIngredient(dish.id)}
                  />
                  <Pressable style={[styles.confirmBtn, { backgroundColor: theme.orange }]} onPress={() => saveIngredient(dish.id)}>
                    <Text style={styles.confirmBtnText}>+</Text>
                  </Pressable>
                </View>
                {showUnitPicker && (
                  <View style={[styles.unitDropdown, { backgroundColor: theme.white }]}>
                    {UNIT_OPTIONS.map((u) => (
                      <Pressable
                        key={u}
                        style={[styles.unitOption, { borderBottomColor: theme.grayLight }]}
                        onPress={() => { setIngUnit(u); setShowUnitPicker(false); }}
                      >
                        <Text style={[styles.unitOptionText, { color: theme.text }, ingUnit === u && { color: theme.orange, fontWeight: '700' }]}>{u}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      style={styles.unitOption}
                      onPress={() => { setIngUnit(''); setShowUnitPicker(false); }}
                    >
                      <Text style={[styles.unitOptionText, { color: theme.textLight }]}>—</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.ingFooter}>
                <Pressable
                  style={[styles.ingAddBtn, { borderColor: theme.green }]}
                  onPress={() => setAddingIngredient(dish.id)}
                >
                  <Text style={[styles.ingAddText, { color: theme.green }]}>{t.addIngredientTrigger}</Text>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => removeDish(dish.id)}>
                  <Ionicons name="trash-outline" size={14} color={theme.danger} />
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
  ingText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  removeText: { fontSize: 18, color: Colors.gray },
  shoppingBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingBtnText: { fontSize: 16 },
  ingAddCard: { marginTop: Spacing.xs },
  ingInput: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  unitPickerBtn: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  unitDropdown: {
    marginTop: 4,
    borderRadius: Radius.sm,
    ...Shadow.card,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  unitOptionText: { fontSize: FontSize.sm, fontWeight: '500' },
  ingAmountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  ingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  ingAddBtn: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  ingAddText: { fontSize: FontSize.sm, color: Colors.green, fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: { fontSize: FontSize.sm, color: Colors.danger },
  emptyState: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '600' },
  emptyBody: { fontSize: FontSize.sm, textAlign: 'center' },
});
