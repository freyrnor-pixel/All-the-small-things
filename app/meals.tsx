import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMealStore, MealType, Dish } from '@/store/useMealStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import ExpandableCard from '@/components/ExpandableCard';
import HintCard from '@/components/HintCard';
import { useT } from '@/lib/i18n';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const MEAL_TYPES: { value: MealType; label: string; icon: string; color: string }[] = [
  { value: 'breakfast', label: 'Frokost', icon: '🌅', color: '#F6C344' },
  { value: 'lunch', label: 'Lunsj', icon: '🥙', color: '#6BAA75' },
  { value: 'dinner', label: 'Middag', icon: '🍽', color: '#F4A261' },
  { value: 'snack', label: 'Snacks', icon: '🍎', color: '#7BC8A4' },
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
  const addToShopping = useShoppingStore((s) => s.add);

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
      Alert.alert('Ingen retter', `Legg til noen ${mealType ? MEAL_TYPES.find(m => m.value === mealType)?.label.toLowerCase() : 'retter'} først!`);
      return;
    }
    Alert.alert(
      dish.name,
      dish.ingredients.length > 0
        ? `Ingredienser: ${dish.ingredients.map((i) => `${i.amount} ${i.unit} ${i.name}`).join(', ')}`
        : 'Ingen ingredienser registrert.',
      [
        { text: 'Legg i handleliste', onPress: () => pushDishToShopping(dish) },
        { text: 'OK' },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Hjem</Text>
        </Pressable>
        <Text style={styles.title}>Matretter</Text>
        <Pressable style={styles.randomBtn} onPress={() => pickRandom()}>
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
          style={[styles.chip, filterType === 'all' && styles.chipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.chipText, filterType === 'all' && styles.chipActiveText]}>Alle</Text>
        </Pressable>
        {MEAL_TYPES.map((mt) => (
          <Pressable
            key={mt.value}
            style={[styles.chip, filterType === mt.value && styles.chipActive]}
            onPress={() => setFilterType(mt.value)}
          >
            <Text style={[styles.chipText, filterType === mt.value && styles.chipActiveText]}>
              {mt.icon} {mt.label}
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
          <View style={styles.addCard}>
            <TextInput
              style={styles.addInput}
              value={newDishName}
              onChangeText={setNewDishName}
              placeholder="Navn på rett"
              placeholderTextColor={Colors.gray}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
              <View style={styles.typeRow}>
                {MEAL_TYPES.map((mt) => (
                  <Pressable
                    key={mt.value}
                    style={[styles.chip, newDishType === mt.value && styles.chipActive]}
                    onPress={() => setNewDishType(mt.value)}
                  >
                    <Text style={[styles.chipText, newDishType === mt.value && styles.chipActiveText]}>
                      {mt.icon} {mt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View style={styles.addActions}>
              <Pressable onPress={() => setAddingDish(false)}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={saveNewDish}>
                <Text style={styles.confirmBtnText}>Lagre</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addTrigger} onPress={() => setAddingDish(true)}>
            <Text style={styles.addTriggerText}>+ Ny rett</Text>
          </Pressable>
        )}

        {/* Dishes */}
        {filtered.map((dish) => (
          <ExpandableCard
            key={dish.id}
            title={dish.name}
            subtitle={MEAL_TYPES.find((m) => m.value === dish.mealType)?.label}
            badge={`${dish.ingredients.length} ingredienser`}
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
                <Text style={styles.ingText}>
                  {ing.amount} {ing.unit} {ing.name}
                </Text>
                <Pressable onPress={() => removeIngredient(ing.id)} hitSlop={8}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}

            {/* Add ingredient inline */}
            {addingIngredient === dish.id ? (
              <View style={styles.ingAddCard}>
                <TextInput
                  style={styles.ingInput}
                  value={ingName}
                  onChangeText={setIngName}
                  placeholder="Ingrediens"
                  placeholderTextColor={Colors.gray}
                  autoFocus
                />
                <View style={styles.ingAmountRow}>
                  <TextInput
                    style={[styles.ingInput, { width: 60 }]}
                    value={ingAmount}
                    onChangeText={setIngAmount}
                    keyboardType="decimal-pad"
                    placeholder="Antall"
                    placeholderTextColor={Colors.gray}
                  />
                  <TextInput
                    style={[styles.ingInput, { flex: 1 }]}
                    value={ingUnit}
                    onChangeText={setIngUnit}
                    placeholder="Enhet"
                    placeholderTextColor={Colors.gray}
                  />
                </View>
                <View style={styles.ingActions}>
                  <Pressable onPress={() => setAddingIngredient(null)}>
                    <Text style={styles.cancelText}>Avbryt</Text>
                  </Pressable>
                  <Pressable style={styles.confirmBtn} onPress={() => saveIngredient(dish.id)}>
                    <Text style={styles.confirmBtnText}>Legg til</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.ingFooter}>
                <Pressable onPress={() => setAddingIngredient(dish.id)}>
                  <Text style={styles.ingAddText}>+ Ingrediens</Text>
                </Pressable>
                <Pressable onPress={() => removeDish(dish.id)}>
                  <Text style={styles.deleteText}>Slett rett</Text>
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
