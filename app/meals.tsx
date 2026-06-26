/**
 * meals.tsx — dish library
 *
 * Library of dishes grouped by meal type. Entry shows 4 category tiles; tapping
 * a tile drills into that category's dish list. Dish creation via modal sheet with
 * ingredient rows and catalog autocomplete.
 *
 * Connections:
 *   Imports → components/AddFAB, components/AppModal, components/BottomNav, components/ConfirmationBanner, components/ExpandableCard, components/PressableScale, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/haptics, lib/i18n, store/useMealStore, store/useShoppingStore, store/useCatalogStore
 *   Used by → Expo Router route "/meals"
 *   Data    → useMealStore (dishes + ingredients tables); writes to useShoppingStore when pushing a dish to shopping; scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - All visible strings go through useT(); MEAL_TYPES holds only icon/colour metadata.
 *   - Category tiles show dish count per type; tapping drills into category view.
 *   - New dish modal collects name + ingredients with catalog autocomplete via suggest().
 *   - pushDishToShopping always adds ingredients as listType 'weekly', tags them with dishName so app/shopping.tsx can group by dish, and surfaces a ConfirmationBanner.
 *   - estimatedPriceNok on a dish is optional (defaults to 0, hidden from the subtitle when 0).
 *   - Design system pass: fontWeight string literals replaced with Fonts.* tokens.
 *   - "Ny rett" is a floating AddFAB (plain theme.orange, no per-category tint) →
 *     openModal(activeCategory). The new-dish sheet's Cancel/Save live in a header row
 *     at the top (matching app/task-form.tsx's pattern) instead of a bottom footer.
 */
import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { Ionicons } from '@expo/vector-icons';
import { useMealStore, MealType, Dish } from '@/store/useMealStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useCatalogStore, StoreItem } from '@/store/useCatalogStore';
import ExpandableCard from '@/components/ExpandableCard';
import ConfirmationBanner from '@/components/ConfirmationBanner';
import { showAppModal } from '@/components/AppModal';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import AddFAB from '@/components/AddFAB';
import { success } from '@/lib/haptics';
import { useT } from '@/lib/i18n';
import { FontSize, Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

const MEAL_TYPES: { value: MealType; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'breakfast', icon: 'sunny-outline', color: '#F6C344' },
  { value: 'lunch', icon: 'fast-food-outline', color: '#6BAA75' },
  { value: 'dinner', icon: 'restaurant-outline', color: '#F4A261' },
  { value: 'snack', icon: 'nutrition-outline', color: '#7BC8A4' },
  { value: 'kveldsmat', icon: 'moon-outline', color: '#9B8EC4' },
];

type DraftIngredient = { name: string; amount: string; unit: string };

export default function MealsScreen() {
  const router = useRouter();
  const dishes = useMealStore((s) => s.dishes);
  const addDish = useMealStore((s) => s.addDish);
  const removeDish = useMealStore((s) => s.removeDish);
  const addIngredient = useMealStore((s) => s.addIngredient);
  const removeIngredient = useMealStore((s) => s.removeIngredient);
  const randomDish = useMealStore((s) => s.randomDish);
  const suggest = useCatalogStore((s) => s.suggest);
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);
  const addToShopping = useShoppingStore((s) => s.add);
  const mealLabel = (v: MealType) => t.mealTypes[v];

  const [activeCategory, setActiveCategory] = useState<MealType | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  // New dish modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [dishName, setDishName] = useState('');
  const [dishType, setDishType] = useState<MealType>('dinner');
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [ingName, setIngName] = useState('');
  const [ingAmount, setIngAmount] = useState('1');
  const [ingUnit, setIngUnit] = useState('');
  const [suggestions, setSuggestions] = useState<StoreItem[]>([]);
  const [dishPrice, setDishPrice] = useState('');

  function openModal(type: MealType) {
    setDishType(type);
    setDishName('');
    setDraftIngredients([]);
    setIngName('');
    setIngAmount('1');
    setIngUnit('');
    setSuggestions([]);
    setDishPrice('');
    setModalVisible(true);
  }

  function addDraftIngredient() {
    if (!ingName.trim()) return;
    setDraftIngredients((prev) => [...prev, { name: ingName.trim(), amount: ingAmount, unit: ingUnit }]);
    setIngName('');
    setIngAmount('1');
    setIngUnit('');
    setSuggestions([]);
  }

  function removeDraftIngredient(idx: number) {
    setDraftIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function saveDish() {
    if (!dishName.trim()) return;
    const dish = addDish({ name: dishName.trim(), mealType: dishType, estimatedPriceNok: parseFloat(dishPrice.replace(',', '.')) || 0 });
    draftIngredients.forEach((ing) => {
      addIngredient({ dishId: dish.id, name: ing.name, amount: ing.amount, unit: ing.unit });
    });
    setModalVisible(false);
    // Confirm even when the filter chip hides the new dish (e.g. added as 'dinner' while filtered to 'lunch').
    setConfirm(t.taskSavedSimple);
  }

  function onIngNameChange(text: string) {
    setIngName(text);
    setSuggestions(text.length >= 2 ? suggest(text, 5) : []);
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
        inventoryQty: 0,
        dishName: dish.name,
        status: 'inWeeklyList',
      });
    });
    success();
    setConfirm(t.addedToShoppingConfirm);
  }

  function pickRandom(mealType?: MealType) {
    const dish = randomDish(mealType);
    if (!dish) {
      showAppModal(
        t.noDishesTitle,
        mealType ? t.noDishesBody(mealLabel(mealType).toLowerCase()) : t.noDishesBodyGeneric
      );
      return;
    }
    showAppModal(
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

  const categoryDishes = activeCategory ? dishes.filter((d) => d.mealType === activeCategory) : [];
  const activeMeta = MEAL_TYPES.find((m) => m.value === activeCategory);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ConfirmationBanner message={confirm} onDismiss={() => setConfirm(null)} />

      <ScreenHeader
        title={activeCategory ? mealLabel(activeCategory) : t.mealsTitle}
        onBack={activeCategory ? () => setActiveCategory(null) : () => router.back()}
        right={
          <Pressable style={[styles.randomBtn, { backgroundColor: theme.white, ...Shadow.card }]} onPress={() => pickRandom(activeCategory ?? undefined)}>
            <Ionicons name="shuffle" size={18} color={theme.orange} />
          </Pressable>
        }
      />

      {/* Category tile view */}
      {!activeCategory && (
        <SiteSwipeView>
        <ScrollView contentContainerStyle={styles.tileGrid} showsVerticalScrollIndicator={false}>
          <PressableScale
            style={[styles.surpriseBtn, { backgroundColor: theme.green }]}
            onPress={() => pickRandom()}
            scaleTo={0.96}
          >
            <Ionicons name="shuffle" size={26} color="#FFFFFF" style={styles.surpriseIconView} />
            <Text style={styles.surpriseTitle}>{t.surpriseMe}</Text>
            <Text style={styles.surpriseSub}>{t.pickRandomDishSub}</Text>
          </PressableScale>

          <View style={styles.tilesRow}>
            {MEAL_TYPES.map((mt) => {
              const count = dishes.filter((d) => d.mealType === mt.value).length;
              return (
                <Pressable
                  key={mt.value}
                  style={[styles.tile, { backgroundColor: mt.color }]}
                  onPress={() => setActiveCategory(mt.value)}
                >
                  <Ionicons name={mt.icon} size={28} color="#FFFFFF" style={styles.tileIconView} />
                  <Text style={styles.tileLabel}>{mealLabel(mt.value)}</Text>
                  <Text style={styles.tileCount}>{count} {t.ingredientsCount(count).replace(/\d+\s*/, '')}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        </SiteSwipeView>
      )}

      {/* Category dish list */}
      {activeCategory && (
        <SiteSwipeView>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {categoryDishes.length === 0 && (
              <Surface style={styles.emptyState}>
                {activeMeta && (
                  <Ionicons name={activeMeta.icon} size={40} color={activeMeta.color} style={styles.emptyEmoji} />
                )}
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{t.noDishesTitle}</Text>
                <Text style={[styles.emptyBody, { color: theme.textLight }]}>
                  {t.noDishesBody(mealLabel(activeCategory).toLowerCase())}
                </Text>
              </Surface>
            )}

            {categoryDishes.map((dish) => (
              <ExpandableCard
                key={dish.id}
                title={dish.name}
                subtitle={
                  dish.estimatedPriceNok > 0
                    ? `${mealLabel(dish.mealType)} · ${t.dishPriceLabel(String(dish.estimatedPriceNok))}`
                    : mealLabel(dish.mealType)
                }
                badge={t.ingredientsCount(dish.ingredients.length)}
                accentColor={activeMeta?.color}
                rightAction={
                  <Pressable
                    onPress={() => pushDishToShopping(dish)}
                    style={[styles.shoppingBtn, { backgroundColor: theme.grayLight }]}
                    hitSlop={8}
                  >
                    <Ionicons name="cart-outline" size={16} color={theme.text} />
                  </Pressable>
                }
              >
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
                <View style={styles.ingFooter}>
                  <Pressable style={styles.deleteBtn} onPress={() => removeDish(dish.id)}>
                    <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    <Text style={[styles.deleteText, { color: theme.danger }]}>{t.deleteDish}</Text>
                  </Pressable>
                </View>
              </ExpandableCard>
            ))}

            <View style={{ height: 96 }} />
          </ScrollView>
        </KeyboardAvoidingView>
        </SiteSwipeView>
      )}

      {activeCategory && <AddFAB onPress={() => openModal(activeCategory)} />}

      {/* New dish modal */}
      <Modal visible={modalVisible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrapper}>
          <View style={[styles.sheet, { backgroundColor: theme.white }]}>
            <View style={styles.sheetHandle} />

            <View style={[styles.sheetHeader, { borderBottomColor: theme.grayLight }]}>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={[styles.sheetCancel, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Text style={[styles.sheetHeaderTitle, { color: theme.text }]}>{t.newDishTrigger}</Text>
              <Pressable onPress={saveDish} disabled={!dishName.trim()}>
                <Text style={[styles.sheetSave, { color: theme.orange }, !dishName.trim() && { opacity: 0.4 }]}>{t.save}</Text>
              </Pressable>
            </View>

            {/* Meal type picker */}
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt.value}
                  style={[styles.typePill, { backgroundColor: dishType === mt.value ? mt.color : theme.grayLight }]}
                  onPress={() => setDishType(mt.value)}
                >
                  <Ionicons
                    name={mt.icon}
                    size={16}
                    color={dishType === mt.value ? '#fff' : theme.text}
                    style={styles.typePillIconView}
                  />
                  <Text style={[styles.typePillLabel, { color: dishType === mt.value ? '#fff' : theme.text }]}>
                    {mealLabel(mt.value)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Dish name */}
            <TextInput
              style={[styles.nameInput, { backgroundColor: theme.offWhite, color: theme.text, borderColor: theme.orange }]}
              value={dishName}
              onChangeText={setDishName}
              placeholder={t.dishNamePlaceholder}
              placeholderTextColor={theme.gray}
              autoFocus
              returnKeyType="next"
            />

            {/* Estimated price */}
            <TextInput
              style={[styles.nameInput, { backgroundColor: theme.offWhite, color: theme.text, borderColor: theme.orange }]}
              value={dishPrice}
              onChangeText={setDishPrice}
              placeholder={t.dishPricePlaceholder}
              placeholderTextColor={theme.gray}
              keyboardType="decimal-pad"
            />

            {/* Draft ingredients */}
            {draftIngredients.map((ing, idx) => (
              <View key={idx} style={[styles.draftRow, { borderBottomColor: theme.grayLight }]}>
                <Text style={[styles.draftText, { color: theme.text }]}>{ing.amount} {ing.unit} {ing.name}</Text>
                <Pressable onPress={() => removeDraftIngredient(idx)} hitSlop={8}>
                  <Text style={[styles.removeText, { color: theme.gray }]}>−</Text>
                </Pressable>
              </View>
            ))}

            {/* Add ingredient row */}
            <View style={styles.ingAddRow}>
              <TextInput
                style={[styles.amountInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                value={ingAmount}
                onChangeText={setIngAmount}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={theme.gray}
              />
              <TextInput
                style={[styles.unitInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                value={ingUnit}
                onChangeText={setIngUnit}
                placeholder={t.shoppingUnitPlaceholder}
                placeholderTextColor={theme.gray}
              />
              <TextInput
                style={[styles.ingNameInput, { backgroundColor: theme.offWhite, color: theme.text }]}
                value={ingName}
                onChangeText={onIngNameChange}
                placeholder={t.ingredientPlaceholder}
                placeholderTextColor={theme.gray}
                returnKeyType="done"
                onSubmitEditing={addDraftIngredient}
              />
              <Pressable style={[styles.addIngBtn, { backgroundColor: theme.orange }]} onPress={addDraftIngredient}>
                <Text style={styles.addIngBtnText}>+</Text>
              </Pressable>
            </View>

            {/* Autocomplete suggestions */}
            {suggestions.length > 0 && (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.name}
                style={[styles.suggestList, { backgroundColor: theme.white, borderColor: theme.grayLight }]}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.suggestRow, { borderBottomColor: theme.grayLight }]}
                    onPress={() => {
                      setIngName(item.name);
                      setSuggestions([]);
                    }}
                  >
                    <Text style={[styles.suggestText, { color: theme.text }]}>{item.name}</Text>
                    {item.price > 0 && (
                      <Text style={[styles.suggestMeta, { color: theme.textLight }]}>{item.price} kr</Text>
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  randomBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  tileGrid: { padding: Spacing.md, gap: Spacing.md },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    width: '47%', flexGrow: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.card,
  },
  tileIconView: { marginBottom: 2 },
  tileLabel: { fontSize: FontSize.md, fontFamily: Fonts.bold, color: '#fff' },
  tileCount: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)' },
  surpriseBtn: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 2,
    ...Shadow.card,
  },
  surpriseIconView: { marginBottom: 2 },
  surpriseTitle: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.xl, marginTop: 4 },
  surpriseSub: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm },
  content: { padding: Spacing.md, gap: Spacing.sm },
  shoppingBtn: { width: 28, height: 28, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  ingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  ingText: { fontSize: FontSize.sm, fontFamily: Fonts.medium },
  removeText: { fontSize: 18 },
  ingFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { fontSize: FontSize.sm },
  emptyState: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm, ...Shadow.card },
  emptyEmoji: { marginBottom: 2 },
  emptyTitle: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  emptyBody: { fontSize: FontSize.sm, textAlign: 'center' },

  // Modal / sheet
  modalOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrapper: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '90%',
    ...Shadow.card,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  sheetHeaderTitle: { fontSize: FontSize.lg, fontFamily: Fonts.bold },
  sheetCancel: { fontSize: FontSize.md },
  sheetSave: { fontSize: FontSize.md, fontFamily: Fonts.bold },
  typeRow: { flexDirection: 'row', gap: Spacing.xs },
  typePill: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', gap: 2 },
  typePillIconView: {},
  typePillLabel: { fontSize: FontSize.xs, fontFamily: Fonts.medium },
  nameInput: {
    borderWidth: 2, borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  draftRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  draftText: { fontSize: FontSize.sm },
  ingAddRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  amountInput: { width: 48, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.sm, textAlign: 'center' },
  unitInput: { width: 56, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.sm },
  ingNameInput: { flex: 1, borderRadius: Radius.sm, padding: Spacing.sm, fontSize: FontSize.sm },
  addIngBtn: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  addIngBtnText: { color: '#fff', fontSize: FontSize.lg, fontFamily: Fonts.bold },
  suggestList: { maxHeight: 160, borderWidth: 1, borderRadius: Radius.sm },
  suggestRow: { padding: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between' },
  suggestText: { fontSize: FontSize.sm },
  suggestMeta: { fontSize: FontSize.xs },
});
