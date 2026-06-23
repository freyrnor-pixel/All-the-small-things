/**
 * scan.tsx — receipt OCR scanner & QR import
 *
 * Captures or picks a receipt photo, runs ML Kit text recognition, and parses
 * lines into priced items (parseReceiptText lives here). The user picks a store,
 * edits/deselects rows, and confirms. Also hosts a QR scanner that imports
 * shared shopping/task payloads into the shared store.
 *
 * Connections:
 *   Imports → components/BottomNav, components/HintCard, components/PressableScale, components/ScreenBackground, components/ScreenHeader, components/SiteSwipeView, components/Surface, constants/theme, lib/date, lib/i18n, lib/receipt, lib/share, lib/siteNav, store/useCatalogStore, store/useReceiptStore, store/useSettingsStore, store/useSharedStore, store/useShoppingStore
 *   Used by → Expo Router route "/scan"
 *   Data    → confirmed items write to FOUR stores: useShoppingStore (shopping_items) + useReceiptStore.addReceipt (receipts) + useCatalogStore.recordPurchases (purchase_log, linked via receipt_id, + store_items); QR import writes useSharedStore (shared_shopping_items / shared_tasks); scaled fontSize via useScaledStyles()
 *
 * Edit notes:
 *   - OCR pipeline: takePhoto/pickImage → processImage → TextRecognition.recognize → parseReceiptText → reviewable checklist → confirm via addToList.
 *   - Recognised items are ALWAYS reviewed (checkbox list) before adding; never auto-added.
 *   - On OCR failure/empty result, a friendly message shows and the manual-entry sheet opens automatically.
 *   - parseReceiptText skips total/sum/MVA/etc. lines and only keeps lines matching a NN[.,]NN price; tune skipPatterns/pricePattern there.
 *   - All visible strings go through useT(); NORWEGIAN_STORES is a hardcoded store list. recordPurchases sets wasOnList by matching existing shopping names.
 *   - addToList() (AP-06B) creates a receipt (date/store/total of the selected items) via useReceiptStore BEFORE recordPurchases, then threads receipt.id into every recordPurchases entry so app/budget.tsx can total this month's spend; the manual-entry sheet's addManualItem() does NOT create a receipt (no price is parsed there worth tracking).
 *   - addToList() also fuzzy-matches each scanned name (lib/receipt.ts findFuzzyMatch) against Katalog shopping_items (status='catalog') and silently updates that item's price — separate from recordPurchases' exact-match price sync on store_items.
 *   - Both addToList() and addManualItem() create their shopping_items rows with status='inWeeklyList' (not the add() default of 'catalog') — scanned/manually-confirmed items represent things just bought or being bought, so they belong on the Ukeliste working list, not the permanent Katalog.
 *   - Header's right-side link (reusing t.budget.title) goes to /budget via goToSite() — a plain
 *     navigation shortcut, separate from /budget's own BottomNav entry.
 *   - The QR scanner modal and manual-entry sheet (both <Modal>) sit outside <SiteSwipeView> —
 *     they're full-screen overlays, not the scrollable screen body.
 */
import React, { useEffect, useRef, useState } from 'react';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import {
  Alert,
  Image,
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
import { useRouter, usePathname } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSharedStore } from '@/store/useSharedStore';
import { useCatalogStore } from '@/store/useCatalogStore';
import { useReceiptStore } from '@/store/useReceiptStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import { todayStr } from '@/lib/date';
import HintCard from '@/components/HintCard';
import PressableScale from '@/components/PressableScale';
import Surface from '@/components/Surface';
import ScreenBackground from '@/components/ScreenBackground';
import ScreenHeader from '@/components/ScreenHeader';
import BottomNav from '@/components/BottomNav';
import SiteSwipeView from '@/components/SiteSwipeView';
import { goToSite } from '@/lib/siteNav';
import { decodeSharePayload } from '@/lib/share';
import { parseReceiptText, findFuzzyMatch, ParsedReceiptItem as ParsedItem } from '@/lib/receipt';
import { Colors, Fonts, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAppTheme, useScaledStyles } from '@/lib/useAppTheme';

const NORWEGIAN_STORES = [
  'REMA 1000', 'Kiwi', 'Coop Extra', 'Coop Mega', 'Meny', 'Spar', 'Bunnpris', 'Joker', 'Prix',
];

export default function ScanScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const addShopping = useShoppingStore((s) => s.add);
  const updateShoppingItem = useShoppingStore((s) => s.update);
  const shoppingItems = useShoppingStore((s) => s.items);
  const recordPurchases = useCatalogStore((s) => s.recordPurchases);
  const addReceipt = useReceiptStore((s) => s.addReceipt);
  const addSharedShopping = useSharedStore((s) => s.addSharedShopping);
  const addSharedTasks = useSharedStore((s) => s.addSharedTasks);
  const settings = useSettingsStore();
  const t = useT();
  const theme = useAppTheme();
  const styles = useScaledStyles(baseStyles);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrEmpty, setOcrEmpty] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [qrScanVisible, setQrScanVisible] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const manualInputRef = useRef<TextInput>(null);
  const cameraLaunched = useRef(false);

  // Open camera automatically on first load
  useEffect(() => {
    if (!cameraLaunched.current) {
      cameraLaunched.current = true;
      // Small delay so screen transition completes first
      setTimeout(() => takePhoto(), 400);
    }
  }, []);

  useEffect(() => {
    if (manualVisible) {
      setManualName('');
      setTimeout(() => manualInputRef.current?.focus(), 80);
    }
  }, [manualVisible]);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionTitle, t.permissionBody);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      processImage(uri);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      processImage(uri);
    }
  }

  async function processImage(uri: string) {
    setLoading(true);
    setOcrEmpty(false);
    setParsedItems([]);
    try {
      const result = await TextRecognition.recognize(uri);
      const items = parseReceiptText(result.text);
      if (items.length > 0) {
        setParsedItems(items);
      } else {
        handleOcrFailure();
      }
    } catch {
      handleOcrFailure();
    } finally {
      setLoading(false);
    }
  }

  // OCR found nothing — never a bare error: show a friendly note and open the
  // manual-entry sheet right away so the user can just type it in.
  function handleOcrFailure() {
    setOcrEmpty(true);
    setManualVisible(true);
  }

  function toggleItem(i: number) {
    setParsedItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, selected: !item.selected } : item)));
  }

  function updateName(i: number, name: string) {
    setParsedItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, name } : item)));
  }

  function addManualItem() {
    const trimmed = manualName.trim();
    if (!trimmed) return;
    addShopping({ name: trimmed, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: 0, inventoryQty: 0, status: 'inWeeklyList' });
    setManualName('');
    setManualVisible(false);
    Alert.alert(t.addedTitle, t.addedBody(1), [{ text: t.ok }]);
  }

  function addToList() {
    const selected = parsedItems.filter((i) => i.selected);
    const existingNames = new Set(shoppingItems.map((i) => i.name.toLowerCase()));
    // Catalog items (status='catalog') that fuzzy-match a scanned name get their
    // price silently updated, even when the scanned item itself isn't on the list
    // (recordPurchases below already does this for store_items; this covers the
    // separate Katalog shopping_items rows the redesign introduced).
    const catalogItems = shoppingItems.filter((i) => i.status === 'catalog');
    const catalogNames = catalogItems.map((i) => i.name);
    selected.forEach((item) => {
      const match = findFuzzyMatch(item.name, catalogNames);
      if (match) {
        const catalogItem = catalogItems.find((i) => i.name === match);
        if (catalogItem && item.price > 0 && item.price !== catalogItem.price) {
          updateShoppingItem(catalogItem.id, { price: item.price });
        }
      }
      addShopping({ name: item.name, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: item.price, inventoryQty: 0, status: 'inWeeklyList' });
    });
    // Record this trip as a receipt (AP-06B) before logging purchases, so each
    // purchase_log row can link back to it for app/budget.tsx's monthly total.
    // Skipped when nothing is selected — never log an empty $0 receipt.
    const receiptId = selected.length
      ? addReceipt({
          date: todayStr(),
          store: selectedStore,
          total: selected.reduce((sum, item) => sum + item.price, 0),
          category: 'groceries',
        }).id
      : undefined;
    // Log the receipt as purchases and keep the catalog's prices current.
    recordPurchases(
      selected.map((item) => ({
        name: item.name,
        store: selectedStore,
        price: item.price,
        wasOnList: existingNames.has(item.name.toLowerCase()),
      })),
      receiptId
    );
    Alert.alert(t.addedTitle, t.addedBody(selected.length), [{ text: t.ok, onPress: () => router.back() }]);
  }

  async function openQrScanner() {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert(t.permissionTitle, t.permissionBody);
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
      Alert.alert('', t.qrInvalid, [{ text: t.ok, onPress: () => setQrScanned(false) }]);
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
      Alert.alert(t.qrScanSuccess, t.qrScanSuccessBody(payload.i.length, 'shopping'), [
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
      Alert.alert(t.qrScanSuccess, t.qrScanSuccessBody(payload.i.length, 'tasks'), [
        { text: t.ok, onPress: () => { setQrScanVisible(false); goToSite(router, pathname, '/shared'); } },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenBackground />
      <ScreenHeader
        title={t.scanReceipt}
        onBack={() => router.back()}
        bordered
        right={
          <Pressable onPress={() => goToSite(router, pathname, '/budget')} hitSlop={6}>
            <Text style={[styles.back, { color: theme.orange, textAlign: 'right' }]}>{t.budget.title}</Text>
          </Pressable>
        }
      />

      <SiteSwipeView>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.scan.text} example={t.hints.scan.example} />

        {/* Manual-entry fallback — offered up front, before the camera */}
        {!imageUri && parsedItems.length === 0 && (
          <Pressable style={styles.topManualLink} onPress={() => setManualVisible(true)} hitSlop={6}>
            <Text style={[styles.topManualLinkText, { color: theme.orange }]}>✏️  {t.typeItInInstead}</Text>
          </Pressable>
        )}

        {/* Camera hint banner */}
        {!imageUri && !loading && (
          <View style={[styles.hintBanner, { backgroundColor: theme.greenLight }]}>
            <Text style={[styles.hintBannerText, { color: theme.text }]}>{t.scanHintBanner}</Text>
          </View>
        )}

        {/* Store selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.store}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.storeRow}>
              {NORWEGIAN_STORES.map((store) => (
                <Pressable
                  key={store}
                  style={[styles.storeChip, { backgroundColor: theme.grayLight }, selectedStore === store && { backgroundColor: theme.orange }]}
                  onPress={() => setSelectedStore(selectedStore === store ? '' : store)}
                >
                  <Text style={[styles.storeText, { color: theme.text }, selectedStore === store && { color: Colors.white }]}>
                    {store}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action buttons */}
        {!imageUri && (
          <View style={styles.actionButtons}>
            <Pressable style={[styles.primaryBtn, { backgroundColor: theme.orange }]} onPress={takePhoto}>
              <Text style={styles.primaryBtnIcon}>📷</Text>
              <Text style={styles.primaryBtnText}>{t.takePhoto}</Text>
            </Pressable>
            <View style={styles.secondaryButtons}>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: theme.white }]} onPress={pickImage}>
                <Text style={styles.secondaryBtnIcon}>🖼</Text>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t.chooseFromLibrary}</Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { backgroundColor: theme.white }]} onPress={() => setManualVisible(true)}>
                <Text style={styles.secondaryBtnIcon}>✏️</Text>
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t.addManually}</Text>
              </Pressable>
            </View>
            <Pressable style={[styles.qrScanBtn, { backgroundColor: theme.greenLight }]} onPress={openQrScanner}>
              <Text style={styles.secondaryBtnIcon}>🔲</Text>
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t.scanQrCode}</Text>
            </Pressable>
          </View>
        )}

        {/* Preview — rounded framing guide overlays the captured receipt */}
        {imageUri && (
          <View style={[styles.previewCard, { overflow: 'hidden' }]}>
            <View>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <View style={styles.guideOverlay} pointerEvents="none">
                <View style={[styles.guideFrame, { borderColor: theme.white }]} />
                <View style={styles.guideHintWrap}>
                  <Text style={styles.guideHintText}>{t.scanGuideHint}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.previewActions, { backgroundColor: theme.white }]}>
              <Pressable onPress={() => { setImageUri(null); setParsedItems([]); setOcrEmpty(false); }}>
                <Text style={[styles.retakeBtnText, { color: theme.orange }]}>{t.retakePhoto}</Text>
              </Pressable>
              <Pressable onPress={() => setManualVisible(true)}>
                <Text style={[styles.retakeBtnText, { color: theme.textLight }]}>{t.addManually}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {loading && (
          <Surface tint={theme.offWhite} style={styles.loadingCard}>
            <Text style={[styles.loadingText, { color: theme.textLight }]}>{t.analysingReceipt}</Text>
          </Surface>
        )}

        {ocrEmpty && !loading && (
          <Surface tint={theme.offWhite} style={styles.emptyOcr}>
            <Text style={[styles.emptyOcrText, { color: theme.textLight }]}>{t.ocrNoItemsFriendly}</Text>
            <PressableScale
              style={[styles.emptyManualBtn, { backgroundColor: theme.orange }]}
              onPress={() => setManualVisible(true)}
            >
              <Text style={styles.emptyManualText}>{t.typeItInInstead}</Text>
            </PressableScale>
          </Surface>
        )}

        {/* Parsed items */}
        {parsedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textLight }]}>{t.recognisedItems}</Text>
            {parsedItems.map((item, i) => (
              <View key={i} style={[styles.parsedRow, { backgroundColor: theme.white }]}>
                <Pressable
                  style={[styles.checkBox, { borderColor: theme.orange }, item.selected && { backgroundColor: theme.orange }]}
                  onPress={() => toggleItem(i)}
                >
                  {item.selected && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
                <TextInput
                  style={[styles.parsedName, { color: theme.text }, !item.selected && { color: theme.gray, textDecorationLine: 'line-through' }]}
                  value={item.name}
                  onChangeText={(v) => updateName(i, v)}
                />
                <Text style={[styles.parsedPrice, { color: theme.textLight }]}>{item.price.toFixed(2)} kr</Text>
              </View>
            ))}
            <Pressable style={[styles.addBtn, { backgroundColor: theme.orange }]} onPress={addToList}>
              <Text style={styles.addBtnText}>
                {t.addToList(parsedItems.filter((i) => i.selected).length)}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      </SiteSwipeView>

      <BottomNav />

      {/* QR scanner */}
      <Modal visible={qrScanVisible} animationType="slide" onRequestClose={() => setQrScanVisible(false)}>
        <View style={styles.qrModal}>
          <SafeAreaView style={styles.qrSafeArea}>
            <View style={styles.qrHeader}>
              <Pressable onPress={() => setQrScanVisible(false)}>
                <Text style={[styles.back, { color: theme.orange }]}>{t.cancel}</Text>
              </Pressable>
              <Text style={[styles.title, { color: Colors.white }]}>{t.qrScanMode}</Text>
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

      {/* Manual add sheet */}
      <Modal visible={manualVisible} transparent animationType="slide" onRequestClose={() => setManualVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setManualVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kvWrapper}>
          <View style={[styles.manualSheet, { backgroundColor: theme.white }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.grayLight }]} />
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{t.addManually}</Text>
            <Text style={[styles.sheetLabel, { color: theme.textLight }]}>{t.manualItemLabel}</Text>
            <TextInput
              ref={manualInputRef}
              style={[styles.sheetInput, { color: theme.text, backgroundColor: theme.offWhite }]}
              placeholder={t.manualItemPlaceholder}
              placeholderTextColor={theme.gray}
              value={manualName}
              onChangeText={setManualName}
              returnKeyType="done"
              onSubmitEditing={addManualItem}
            />
            <View style={styles.sheetButtons}>
              <Pressable style={[styles.sheetCancelBtn, { borderColor: theme.grayLight }]} onPress={() => setManualVisible(false)}>
                <Text style={[styles.sheetCancelText, { color: theme.textLight }]}>{t.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.sheetAddBtn, { backgroundColor: theme.orange }, !manualName.trim() && { opacity: 0.4 }]}
                onPress={addManualItem}
                disabled={!manualName.trim()}
              >
                <Text style={styles.sheetAddText}>{t.addItemBtn}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  back: { fontSize: FontSize.md, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },
  hintBanner: { borderRadius: Radius.md, padding: Spacing.md },
  hintBannerText: { fontSize: FontSize.sm, lineHeight: 20 },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  storeRow: { flexDirection: 'row', gap: Spacing.sm },
  storeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  storeText: { fontSize: FontSize.sm, fontWeight: '500' },
  actionButtons: { gap: Spacing.sm },
  primaryBtn: {
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  primaryBtnIcon: { fontSize: 48 },
  primaryBtnText: { fontSize: FontSize.lg, color: Colors.white, fontWeight: '700' },
  secondaryButtons: { flexDirection: 'row', gap: Spacing.sm },
  secondaryBtn: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.card,
  },
  secondaryBtnIcon: { fontSize: 24 },
  secondaryBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  previewCard: { borderRadius: Radius.md, ...Shadow.card },
  preview: { width: '100%', height: 220 },
  guideOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  guideFrame: {
    width: '82%',
    height: 170,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    backgroundColor: 'transparent',
  },
  guideHintWrap: {
    position: 'absolute',
    bottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  guideHintText: { color: '#fff', fontSize: FontSize.xs, fontFamily: Fonts.semibold },
  topManualLink: { alignSelf: 'flex-start', paddingVertical: Spacing.xs },
  topManualLinkText: { fontSize: FontSize.md, fontFamily: Fonts.semibold },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.sm,
  },
  retakeBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  loadingCard: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center' },
  loadingText: { fontSize: FontSize.md },
  emptyOcr: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  emptyOcrText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptyManualBtn: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  emptyManualText: { color: '#fff', fontFamily: Fonts.bold, fontSize: FontSize.md },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    ...Shadow.card,
  },
  checkBox: {
    width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  parsedName: { flex: 1, fontSize: FontSize.sm },
  parsedPrice: { fontSize: FontSize.sm, fontWeight: '500' },
  addBtn: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  // Manual sheet
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  kvWrapper: { flex: 1, justifyContent: 'flex-end' },
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
  qrScanBtn: {
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  qrModal: { flex: 1, backgroundColor: '#000' },
  qrSafeArea: { flex: 1 },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
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
