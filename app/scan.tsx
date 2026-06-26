/**
 * scan.tsx — receipt OCR scanner & QR import
 *
 * Captures or picks a receipt photo, runs ML Kit text recognition, and parses
 * lines into priced items (parseReceiptText lives here). The user picks a store
 * (or enters a custom store name), edits/deselects rows, overrides categories,
 * and confirms. Also hosts a QR scanner that imports shared shopping/task
 * payloads into the shared store.
 *
 * Connections:
 *   Imports → components/AppModal, components/BottomNav, components/HintCard, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/receipt, lib/share, lib/siteNav, store/useCatalogStore, store/useReceiptStore, store/useSettingsStore, store/useSharedStore, store/useShoppingStore, @expo/vector-icons (Ionicons)
 *   Used by → Expo Router route "/scan"
 *   Data    → confirmed items write to FOUR stores: useShoppingStore (shopping_items) + useReceiptStore.addReceipt (receipts) + useCatalogStore.recordPurchases (purchase_log, linked via receipt_id, + store_items); QR import writes useSharedStore (shared_shopping_items / shared_tasks); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - Four screen modes via `mode` state: idle, scanning, result, manual. Mode transitions handle navigation.
 *   - OCR pipeline: takePhoto/pickImage → mode:scanning → processImage → TextRecognition.recognize → parseReceiptText → enrichItemsWithCategories (early fuzzy match) → auto-transition to mode:result with found items.
 *   - Recognised items are ALWAYS reviewed (checkbox list) before adding; never auto-added.
 *   - On OCR failure/empty result, mode:manual opens automatically.
 *   - Categories are pre-populated via early fuzzy match against store_items and shown as tappable chips in result mode; the user can override via the category picker modal.
 *   - parseReceiptText skips total/sum/MVA/etc. lines and only keeps lines matching a NN[.,]NN price; tune skipPatterns/pricePattern there.
 *   - All visible strings go through useT(); NORWEGIAN_STORES is a hardcoded store list plus "Annen butikk…" for custom entry. recordPurchases sets wasOnList by matching existing shopping names.
 *   - addToList() (AP-06B) creates a receipt (date/store/total of the selected items) via useReceiptStore BEFORE recordPurchases, then threads receipt.id into every recordPurchases entry so app/budget.tsx can total this month's spend; the manual-entry sheet's addManualItem() does NOT create a receipt unless a price is entered (see below).
 *   - addToList() requires a store to be picked first (NORWEGIAN_STORES chip row, or custom store) — without one it shows selectStoreFirstTitle/Body and bails before logging anything.
 *   - addToList() also fuzzy-matches each scanned name (lib/receipt.ts findFuzzyMatch) against Katalog shopping_items (status='catalog') and silently raises that item's price if higher — separate from recordPurchases' exact-match price sync on store_items. Both paths only ever raise the catalog price, never lower it.
 *   - addToList() also fuzzy-matches each scanned name against useCatalogStore's store_items to inherit that item's category ("type of item") when passing purchases to recordPurchases.
 *   - Both addToList() and addManualItem() create their shopping_items rows with status='inWeeklyList' (not the add() default of 'catalog') — scanned/manually-confirmed items represent things just bought or being bought, so they belong on the Ukeliste working list, not the permanent Katalog.
 *   - Manual entry supports multiple items per line (newline-delimited text), counted live. An optional price field applies only when exactly one line is entered; with a store selected and price > 0, it creates a receipt and logs the purchase like addToList does.
 *   - Header's right-side link (reusing t.budget.title) goes to /budget via goToSite() — a plain
 *     navigation shortcut, separate from /budget's own BottomNav entry.
 *   - The QR scanner modal, manual-entry sheet, and category picker modal (all <Modal>) sit outside <SiteSwipeView> —
 *     they're full-screen overlays, not the scrollable screen body.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {
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
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSharedStore } from '@/store/useSharedStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useReceiptStore } from '@/store/useReceiptStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import HintCard from '@/components/HintCard';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { goToSite } from '@/lib/siteNav';
import { showAppModal } from '@/components/AppModal';
import { decodeSharePayload } from '@/lib/share';
import { parseReceiptText, findFuzzyMatch, ParsedReceiptItem as ParsedItem } from '@/lib/receipt';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

const NORWEGIAN_STORES = [
  'REMA 1000', 'Kiwi', 'Coop Extra', 'Coop Mega', 'Meny', 'Spar', 'Bunnpris', 'Joker', 'Prix',
];

const CATEGORIES = ['produce', 'dairy', 'meat', 'fish', 'bread', 'frozen', 'canned', 'dry', 'snacks', 'drinks', 'cleaning', 'personal', 'other'];

type ScreenMode = 'idle' | 'scanning' | 'result' | 'manual';

export default function ScanScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const addShopping = useShoppingStore((s) => s.add);
  const updateShoppingItem = useShoppingStore((s) => s.update);
  const shoppingItems = useShoppingStore((s) => s.items);
  const recordPurchases = useCatalogStore((s) => s.recordPurchases);
  const catalogStoreItems = useCatalogStore((s) => s.items);
  const addReceipt = useReceiptStore((s) => s.addReceipt);
  const addSharedShopping = useSharedStore((s) => s.addSharedShopping);
  const addSharedTasks = useSharedStore((s) => s.addSharedTasks);
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<ScreenMode>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [customStoreVisible, setCustomStoreVisible] = useState(false);
  const [customStoreName, setCustomStoreName] = useState('');
  const [qrScanVisible, setQrScanVisible] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [categoryPickerIndex, setCategoryPickerIndex] = useState(-1);
  const manualInputRef = useRef<TextInput>(null);
  const customStoreRef = useRef<TextInput>(null);
  const cameraLaunched = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Setup pulsing animation for scanning state
  useEffect(() => {
    if (mode === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.14, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mode, pulseAnim]);

  // Auto-focus manual input when entering manual mode
  useEffect(() => {
    if (mode === 'manual') {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [mode]);

  // Open camera automatically on first load
  useEffect(() => {
    if (!cameraLaunched.current) {
      cameraLaunched.current = true;
      // Small delay so screen transition completes first
      setTimeout(() => takePhoto(), 400);
    }
  }, []);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAppModal(t.permissionTitle, t.permissionBody);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setMode('scanning');
      setTimeout(() => processImage(uri), 100);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      setMode('scanning');
      setTimeout(() => processImage(uri), 100);
    }
  }

  function enrichItemsWithCategories(items: ParsedItem[]): ParsedItem[] {
    const storeItemNames = catalogStoreItems.map((i) => i.name);
    return items.map((item) => {
      const match = findFuzzyMatch(item.name, storeItemNames);
      const category = match ? catalogStoreItems.find((i) => i.name === match)?.category : undefined;
      return { ...item, category };
    });
  }

  async function processImage(uri: string) {
    try {
      const result = await TextRecognition.recognize(uri);
      const items = parseReceiptText(result.text);
      if (items.length > 0) {
        const enrichedItems = enrichItemsWithCategories(items);
        setParsedItems(enrichedItems);
        // Simulate OCR processing time, then transition to result
        await new Promise((resolve) => setTimeout(resolve, 1800));
        setMode('result');
      } else {
        handleOcrFailure();
      }
    } catch {
      handleOcrFailure();
    }
  }

  function handleOcrFailure() {
    setImageUri(null);
    setParsedItems([]);
    setMode('manual');
  }

  function toggleItem(i: number) {
    setParsedItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, selected: !item.selected } : item)));
  }

  function updateName(i: number, name: string) {
    setParsedItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, name } : item)));
  }

  function updateCategory(i: number, category: string) {
    setParsedItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, category } : item)));
  }

  function addManualItems() {
    const lines = manualText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) return;

    // A price only makes sense when there's exactly one item to attach it to.
    const price = lines.length === 1 ? parseFloat(manualPrice.replace(',', '.')) || 0 : 0;
    let receiptId: string | undefined;
    if (selectedStore && price > 0) {
      const receipt = addReceipt({ date: todayStr(), store: selectedStore, total: price, category: 'groceries' });
      receiptId = receipt.id;
      recordPurchases([{ name: lines[0], store: selectedStore, price, wasOnList: false }], receiptId);
    }

    lines.forEach((name, idx) => {
      addShopping({ name, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: idx === 0 ? price : 0, inventoryQty: 0, status: 'inWeeklyList' });
    });

    setManualText('');
    setManualPrice('');
    setImageUri(null);
    setParsedItems([]);
    setMode('idle');
    showAppModal(t.addedTitle, t.addedBody(lines.length), [{ text: t.ok }]);
  }

  function addToList() {
    if (!selectedStore) {
      showAppModal(t.selectStoreFirstTitle, t.selectStoreFirstBody);
      return;
    }
    const selected = parsedItems.filter((i) => i.selected);
    const existingNames = new Set(shoppingItems.map((i) => i.name.toLowerCase()));
    // Catalog items (status='catalog') that fuzzy-match a scanned name get their
    // price silently updated, even when the scanned item itself isn't on the list
    // (recordPurchases below already does this for store_items; this covers the
    // separate Katalog shopping_items rows the redesign introduced). Only ever
    // raises the price — a lower scanned price never overwrites a known higher one.
    const catalogItems = shoppingItems.filter((i) => i.status === 'catalog');
    const catalogNames = catalogItems.map((i) => i.name);

    selected.forEach((item) => {
      const match = findFuzzyMatch(item.name, catalogNames);
      if (match) {
        const catalogItem = catalogItems.find((i) => i.name === match);
        if (catalogItem && item.price > catalogItem.price) {
          updateShoppingItem(catalogItem.id, { price: item.price });
        }
      }
      addShopping({ name: item.name, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: item.price, inventoryQty: 0, status: 'inWeeklyList' });
    });

    const receiptId = selected.length
      ? addReceipt({
          date: todayStr(),
          store: selectedStore,
          total: selected.reduce((sum, item) => sum + item.price, 0),
          category: 'groceries',
        }).id
      : undefined;

    // Category is already pre-populated from the early fuzzy match in
    // enrichItemsWithCategories, or manually overridden by the user via the
    // category picker.
    recordPurchases(
      selected.map((item) => ({
        name: item.name,
        store: selectedStore,
        price: item.price,
        category: item.category,
        wasOnList: existingNames.has(item.name.toLowerCase()),
      })),
      receiptId
    );

    setManualText('');
    setImageUri(null);
    setParsedItems([]);
    setMode('idle');
    showAppModal(t.addedTitle, t.addedBody(selected.length), [{ text: t.ok }]);
  }

  async function openQrScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        showAppModal(t.permissionTitle, t.permissionBody);
        return;
      }
    }
    setQrScanned(false);
    setQrScanVisible(true);
  }

  function handleQrScanned({ data }: { data: string }) {
    if (qrScanned) return;
    setQrScanned(true);
    const payload = decodeSharePayload(data);
    if (!payload) {
      showAppModal('', t.qrInvalid, [{ text: t.ok, onPress: () => setQrScanned(false) }]);
      return;
    }
    const sharedBy = payload.b || 'Unknown';
    if (payload.k === 's') {
      addSharedShopping(
        payload.i.map((item) => ({
          sourceItemId: null,
          name: item.n,
          amount: item.a,
          unit: item.u,
          direction: 'in' as const,
          sharedBy,
        }))
      );
      showAppModal(t.qrScanSuccess, t.qrScanSuccessBody(payload.i.length, 'shopping'), [
        { text: t.ok, onPress: () => { setQrScanVisible(false); goToSite(router, pathname, '/shared'); } },
      ]);
    } else {
      addSharedTasks(
        payload.i.map((item) => ({
          sourceTaskId: null,
          title: item.n,
          date: item.d,
          direction: 'in' as const,
          sharedBy,
        }))
      );
      showAppModal(t.qrScanSuccess, t.qrScanSuccessBody(payload.i.length, 'tasks'), [
        { text: t.ok, onPress: () => { setQrScanVisible(false); goToSite(router, pathname, '/shared'); } },
      ]);
    }
  }

  const selectedCount = parsedItems.filter((i) => i.selected).length;
  const totalPrice = parsedItems.filter((i) => i.selected).reduce((sum, item) => sum + item.price, 0);
  const manualLineCount = manualText.split('\n').filter((line) => line.trim().length > 0).length;

  function renderStoreSelector() {
    return (
      <View style={styles.storeSection}>
        <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.store.toUpperCase()}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeScroll}>
          <View style={styles.storeRow}>
            {NORWEGIAN_STORES.map((store) => (
              <Pressable
                key={store}
                style={[
                  styles.storeChip,
                  { borderWidth: 1, borderColor: theme.border },
                  selectedStore === store && { backgroundColor: theme.orange, borderColor: theme.orange },
                ]}
                onPress={() => setSelectedStore(selectedStore === store ? '' : store)}
              >
                <Text style={[styles.storeChipText, { color: theme.text }, selectedStore === store && { color: Colors.white }]}>
                  {store}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[
                styles.storeChip,
                { borderWidth: 1, borderColor: theme.border },
                selectedStore && !NORWEGIAN_STORES.includes(selectedStore) && { backgroundColor: theme.orange, borderColor: theme.orange },
              ]}
              onPress={() => setCustomStoreVisible(true)}
            >
              <Text style={[styles.storeChipText, { color: theme.text }, selectedStore && !NORWEGIAN_STORES.includes(selectedStore) && { color: Colors.white }]}>
                {selectedStore && !NORWEGIAN_STORES.includes(selectedStore) ? selectedStore : t.otherStore}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // IDLE MODE — main scan screen
  if (mode === 'idle') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground />
        <ScreenHeader
          title={t.scanReceipt}
          onBack={() => router.back()}
          bordered
          right={
            <Pressable onPress={() => goToSite(router, pathname, '/budget')} hitSlop={6}>
              <Text style={[styles.backLink, { color: theme.orange }]}>{t.budget.title}</Text>
            </Pressable>
          }
        />

        <SiteSwipeView>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Pressable style={styles.typeInsteadLink} onPress={() => setMode('manual')} hitSlop={6}>
              <Ionicons name="pencil-outline" size={16} color={theme.orange} />
              <Text style={[styles.typeInsteadText, { color: theme.orange }]}>{t.typeItInInstead}</Text>
            </Pressable>

            <View style={[styles.tipBox, { backgroundColor: theme.greenLight }]}>
              <Text style={[styles.tipText, { color: theme.text }]}>{t.scanHintBanner}</Text>
            </View>

            {renderStoreSelector()}

            {/* Primary camera button */}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.orange, shadowColor: theme.orange }]}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={46} color={Colors.white} />
              <Text style={styles.primaryButtonText}>{t.takePhoto}</Text>
            </Pressable>

            {/* 2-column grid */}
            <View style={styles.gridRow}>
              <Pressable style={[styles.gridCard, { backgroundColor: theme.white }]} onPress={pickImage}>
                <Ionicons name="images-outline" size={28} color={theme.orange} />
                <Text style={[styles.gridCardText, { color: theme.text }]}>{t.chooseFromLibrary}</Text>
              </Pressable>
              <Pressable style={[styles.gridCard, { backgroundColor: theme.white }]} onPress={() => setMode('manual')}>
                <Ionicons name="pencil-outline" size={28} color={theme.orange} />
                <Text style={[styles.gridCardText, { color: theme.text }]}>{t.addManually}</Text>
              </Pressable>
            </View>

            {/* QR button */}
            <Pressable
              style={[styles.qrButton, { backgroundColor: theme.greenLight, borderColor: theme.green }]}
              onPress={openQrScanner}
            >
              <Ionicons name="qr-code-outline" size={26} color={theme.green} />
              <Text style={[styles.qrButtonText, { color: theme.green }]}>{t.scanQrCode}</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SiteSwipeView>

        <BottomNav />

        {/* QR scanner modal */}
        <Modal visible={qrScanVisible} animationType="slide" onRequestClose={() => setQrScanVisible(false)}>
          <View style={styles.qrModal}>
            <SafeAreaView style={styles.qrSafeArea}>
              <View style={styles.qrHeader}>
                <Pressable onPress={() => setQrScanVisible(false)}>
                  <Text style={[styles.backLink, { color: theme.orange }]}>{t.cancel}</Text>
                </Pressable>
                <Text style={[styles.qrTitle, { color: Colors.white }]}>{t.qrScanMode}</Text>
                <View style={{ width: 60 }} />
              </View>
              <Text style={styles.qrHint}>{t.qrScanInstructions}</Text>
              {qrScanVisible && (
                <CameraView
                  style={styles.qrCamera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleQrScanned}
                />
              )}
              <View style={styles.qrOverlay} pointerEvents="none">
                <View style={styles.qrFrame} />
              </View>
            </SafeAreaView>
          </View>
        </Modal>

        {/* Custom store sheet */}
        <Modal visible={customStoreVisible} transparent animationType="slide" onRequestClose={() => setCustomStoreVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setCustomStoreVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKvWrapper}>
            <View style={[styles.manualSheet, { backgroundColor: theme.white }]}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.grayLight }]} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.otherStore}</Text>
              <Text style={[styles.sheetLabel, { color: theme.textLight }]}>{t.customStoreLabel}</Text>
              <TextInput
                ref={customStoreRef}
                style={[styles.sheetInput, { color: theme.text, backgroundColor: theme.offWhite }]}
                placeholder={t.customStorePlaceholder}
                placeholderTextColor={theme.gray}
                value={customStoreName}
                onChangeText={setCustomStoreName}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (customStoreName.trim()) {
                    setSelectedStore(customStoreName.trim());
                    setCustomStoreName('');
                    setCustomStoreVisible(false);
                  }
                }}
                autoFocus
              />
              <View style={styles.sheetButtons}>
                <Pressable style={[styles.sheetCancelBtn, { borderColor: theme.grayLight }]} onPress={() => setCustomStoreVisible(false)}>
                  <Text style={[styles.sheetCancelText, { color: theme.textLight }]}>{t.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.sheetAddBtn, { backgroundColor: theme.orange }, !customStoreName.trim() && { opacity: 0.4 }]}
                  onPress={() => {
                    if (customStoreName.trim()) {
                      setSelectedStore(customStoreName.trim());
                      setCustomStoreName('');
                      setCustomStoreVisible(false);
                    }
                  }}
                  disabled={!customStoreName.trim()}
                >
                  <Text style={styles.sheetAddText}>{t.ok}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // SCANNING MODE — pulsing animation
  if (mode === 'scanning') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground />
        <View style={styles.scanningContainer}>
          <Animated.View style={[styles.pulseCircle, { backgroundColor: theme.orangeLight, transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="camera-outline" size={42} color={theme.orange} />
          </Animated.View>
          <Text style={[styles.scanningTitle, { color: theme.text }]}>{t.analysingReceipt}</Text>
          <Text style={[styles.scanningSubtitle, { color: theme.textLight }]}>{t.scanningSubtitle}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // RESULT MODE — parsed items with selection
  if (mode === 'result' && parsedItems.length > 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground />
        <ScreenHeader
          title={t.foundOnReceipt}
          onBack={() => {
            setMode('idle');
            setImageUri(null);
            setParsedItems([]);
          }}
          bordered
        />

        <SiteSwipeView>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <HintCard text={t.itemsSelectedCount(selectedCount, parsedItems.length)} example="" />

            <Surface style={styles.itemsCard}>
              {parsedItems.map((item, i) => (
                <View key={i}>
                  <Pressable style={styles.itemRow} onPress={() => toggleItem(i)}>
                    <View style={[styles.checkbox, { borderColor: theme.orange }, item.selected && { backgroundColor: theme.orange }]}>
                      {item.selected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <TextInput
                      style={[styles.itemName, { color: theme.text }, !item.selected && { opacity: 0.42 }]}
                      value={item.name}
                      onChangeText={(v) => updateName(i, v)}
                    />
                    <Text style={[styles.itemQty, { color: theme.textLight }, !item.selected && { opacity: 0.42 }]}>
                      1 stk
                    </Text>
                    <Text style={[styles.itemPrice, { color: theme.textLight }, !item.selected && { opacity: 0.42 }]}>
                      {item.price.toFixed(2)} kr
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.categoryChip, { backgroundColor: theme.offWhite }]}
                    onPress={() => { setCategoryPickerIndex(i); setCategoryPickerVisible(true); }}
                  >
                    <Text style={[styles.categoryChipText, { color: theme.textLight }]}>{item.category ?? 'other'}</Text>
                  </Pressable>
                </View>
              ))}

              <View style={[styles.totalRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
                <Text style={[styles.totalText, { color: theme.textLight }]}>{t.totalAmount(totalPrice)}</Text>
              </View>
            </Surface>

            <Pressable style={[styles.confirmButton, { backgroundColor: theme.orange }]} onPress={addToList}>
              <Text style={styles.confirmButtonText}>{t.addToListButton(selectedCount)}</Text>
            </Pressable>

            <Pressable style={[styles.cancelButton, { borderColor: theme.border }]} onPress={() => {
              setMode('idle');
              setImageUri(null);
              setParsedItems([]);
            }}>
              <Text style={[styles.cancelButtonText, { color: theme.textLight }]}>{t.cancel}</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SiteSwipeView>

        <BottomNav />

        {/* Category picker modal */}
        <Modal visible={categoryPickerVisible} transparent animationType="slide" onRequestClose={() => setCategoryPickerVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setCategoryPickerVisible(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKvWrapper}>
            <View style={[styles.manualSheet, { backgroundColor: theme.white }]}>
              <View style={[styles.sheetHandle, { backgroundColor: theme.grayLight }]} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.recognisedItems}</Text>
              <ScrollView style={styles.categoryGrid} contentContainerStyle={styles.categoryGridContent}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[styles.categoryOption, { backgroundColor: parsedItems[categoryPickerIndex]?.category === cat ? theme.orange : theme.offWhite }]}
                    onPress={() => {
                      updateCategory(categoryPickerIndex, cat);
                      setCategoryPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.categoryOptionText, { color: parsedItems[categoryPickerIndex]?.category === cat ? Colors.white : theme.text }]}>
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // MANUAL MODE — text input for items
  if (mode === 'manual') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground />
        <ScreenHeader
          title={t.manualEntryTitle}
          onBack={() => {
            setMode('idle');
            setManualText('');
            setManualPrice('');
            setImageUri(null);
            setParsedItems([]);
          }}
          bordered
        />

        <SiteSwipeView>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvWrapper}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
              <HintCard text={t.manualEntryHint} example="" />

              {renderStoreSelector()}

              <TextInput
                ref={manualInputRef}
                multiline
                numberOfLines={8}
                style={[styles.manualInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.white }]}
                placeholder={t.manualEntryPlaceholder}
                placeholderTextColor={theme.textLight}
                value={manualText}
                onChangeText={setManualText}
              />

              {manualLineCount === 1 && (
                <View>
                  <Text style={[styles.sheetLabel, { color: theme.textLight }]}>{t.estimertPrisLabel}</Text>
                  <TextInput
                    style={[styles.sheetInput, { color: theme.text, backgroundColor: theme.white, borderWidth: 1.5, borderColor: theme.border }]}
                    placeholder="0.00"
                    placeholderTextColor={theme.gray}
                    value={manualPrice}
                    onChangeText={setManualPrice}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                  />
                </View>
              )}

              <Pressable
                style={[styles.confirmButton, { backgroundColor: theme.orange }, manualLineCount === 0 && { opacity: 0.5 }]}
                onPress={addManualItems}
                disabled={manualLineCount === 0}
              >
                <Text style={styles.confirmButtonText}>
                  {t.addToListButton(manualLineCount)}
                </Text>
              </Pressable>

              <Pressable style={[styles.cancelButton, { borderColor: theme.border }]} onPress={() => {
                setMode('idle');
                setManualText('');
                setManualPrice('');
                setImageUri(null);
                setParsedItems([]);
              }}>
                <Text style={[styles.cancelButtonText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>

              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SiteSwipeView>

        <BottomNav />
      </SafeAreaView>
    );
  }

  return null;
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  kvWrapper: { flex: 1 },

  // IDLE MODE
  backLink: { fontSize: FontSize.sm, fontWeight: '700' },
  typeInsteadLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: Spacing.sm },
  typeInsteadText: { fontSize: FontSize.md, fontWeight: '600' },
  tipBox: { borderRadius: Radius.md, paddingVertical: 13, paddingHorizontal: 16 },
  tipText: { fontSize: FontSize.sm, lineHeight: 20 },

  storeSection: { gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.07 },
  storeScroll: {},
  storeRow: { flexDirection: 'row', gap: Spacing.sm },
  storeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full },
  storeChipText: { fontSize: FontSize.sm, fontWeight: '500' },

  primaryButton: {
    borderRadius: Radius.lg,
    paddingVertical: 30,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 11,
    elevation: 8,
  },
  primaryButtonText: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },

  gridRow: { flexDirection: 'row', gap: 10 },
  gridCard: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  gridCardText: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },

  qrButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
  },
  qrButtonText: { fontSize: FontSize.md, fontWeight: '700' },

  // SCANNING MODE
  scanningContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 32 },
  pulseCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningTitle: { fontSize: FontSize.lg, fontWeight: '600', textAlign: 'center' },
  scanningSubtitle: { fontSize: FontSize.sm, textAlign: 'center' },

  // RESULT MODE
  itemsCard: { borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  itemName: { flex: 1, fontSize: FontSize.md, fontWeight: '500' },
  itemQty: { fontSize: FontSize.sm, minWidth: 40 },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '600', minWidth: 44, textAlign: 'right' },
  totalRow: { paddingTop: Spacing.sm, paddingBottom: Spacing.sm, alignItems: 'flex-end' },
  totalText: { fontSize: FontSize.sm, fontWeight: '600' },

  categoryChip: {
    alignSelf: 'flex-start',
    marginLeft: 32,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  categoryChipText: { fontSize: FontSize.xs, fontWeight: '500' },
  categoryGrid: { maxHeight: 280 },
  categoryGridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingVertical: Spacing.sm },
  categoryOption: {
    width: '48%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  categoryOptionText: { fontSize: FontSize.sm, fontWeight: '500', textAlign: 'center' },

  // BUTTONS
  confirmButton: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmButtonText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
  cancelButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  cancelButtonText: { fontSize: FontSize.md, fontWeight: '600' },

  // MANUAL MODE
  manualInput: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: 14,
    fontSize: FontSize.md,
    lineHeight: 24,
    textAlignVertical: 'top',
  },

  // Custom store / category picker sheets
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetKvWrapper: { flex: 1, justifyContent: 'flex-end' },
  manualSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.fab,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: Radius.full },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  sheetLabel: { fontSize: FontSize.sm, fontWeight: '600', marginTop: Spacing.xs },
  sheetInput: { borderRadius: Radius.md, padding: Spacing.md, fontSize: FontSize.lg },
  sheetButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  sheetCancelBtn: {
    flex: 1, borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', borderWidth: 1,
  },
  sheetCancelText: { fontWeight: '600', fontSize: FontSize.md },
  sheetAddBtn: { flex: 2, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  sheetAddText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },

  // QR SCANNER
  qrModal: { flex: 1, backgroundColor: '#000' },
  qrSafeArea: { flex: 1 },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  qrTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  qrHint: { color: '#ccc', textAlign: 'center', fontSize: FontSize.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  qrCamera: { flex: 1 },
  qrOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  qrFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
});
