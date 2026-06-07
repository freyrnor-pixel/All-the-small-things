import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useT } from '@/lib/i18n';
import HintCard from '@/components/HintCard';
import { Colors, FontSize, Radius, Shadow, Spacing, getTheme } from '@/constants/theme';

const NORWEGIAN_STORES = [
  'REMA 1000', 'Kiwi', 'Coop Extra', 'Coop Mega', 'Meny', 'Spar', 'Bunnpris', 'Joker', 'Prix',
];

type ParsedItem = { name: string; price: number; selected: boolean };

function parseReceiptText(text: string): ParsedItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];
  const pricePattern = /(\d+[.,]\d{2})/;
  const skipPatterns = /^(total|sum|mva|betalt|visa|mastercard|kvittering|dato|kl\.|kr|nok)/i;
  for (const line of lines) {
    if (skipPatterns.test(line)) continue;
    const priceMatch = line.match(pricePattern);
    if (!priceMatch) continue;
    const price = parseFloat(priceMatch[1].replace(',', '.'));
    const name = line.replace(pricePattern, '').replace(/\s+/g, ' ').trim();
    if (name.length < 2) continue;
    items.push({ name, price, selected: true });
  }
  return items;
}

export default function ScanScreen() {
  const router = useRouter();
  const addShopping = useShoppingStore((s) => s.add);
  const settings = useSettingsStore();
  const t = useT();
  const theme = getTheme(settings.colorTheme);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualName, setManualName] = useState('');
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
      Alert.alert(
        settings.language === 'en' ? 'Permission needed' : 'Tilgang nødvendig',
        settings.language === 'en'
          ? 'Camera access is required to scan receipts.'
          : 'Kameraet trenger tilgang for å skanne kvitteringer.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    }
  }

  function processImage() {
    setLoading(true);
    // Demo mode: real OCR requires a backend service (e.g. Google Vision, AWS Textract).
    // This simulates a parsed receipt result so the selection UI can be used.
    setTimeout(() => {
      setParsedItems([
        { name: 'Melk 1L', price: 19.9, selected: true },
        { name: 'Brød grovt', price: 34.9, selected: true },
        { name: 'Egg 12pk', price: 49.9, selected: true },
      ]);
      setLoading(false);
    }, 800);
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
    addShopping({ name: trimmed, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: 0 });
    setManualName('');
    setManualVisible(false);
    Alert.alert(t.addedTitle, t.addedBody(1), [{ text: t.ok }]);
  }

  function addToList() {
    const selected = parsedItems.filter((i) => i.selected);
    selected.forEach((item) => {
      addShopping({ name: item.name, amount: '1', unit: '', listType: 'weekly', store: selectedStore, price: item.price });
    });
    Alert.alert(t.addedTitle, t.addedBody(selected.length), [{ text: t.ok, onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.cream }]}>
      <View style={[styles.header, { backgroundColor: theme.white, borderBottomColor: theme.grayLight }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.back, { color: theme.orange }]}>{t.back}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t.scanReceipt}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <HintCard text={t.hints.scan.text} example={t.hints.scan.example} />

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
          </View>
        )}

        {/* Preview */}
        {imageUri && (
          <View style={[styles.previewCard, { overflow: 'hidden' }]}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <View style={[styles.previewActions, { backgroundColor: theme.white }]}>
              <Pressable onPress={() => { setImageUri(null); setParsedItems([]); }}>
                <Text style={[styles.retakeBtnText, { color: theme.orange }]}>{t.retakePhoto}</Text>
              </Pressable>
              <Pressable onPress={() => setManualVisible(true)}>
                <Text style={[styles.retakeBtnText, { color: theme.textLight }]}>{t.addManually}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {loading && (
          <View style={[styles.loadingCard, { backgroundColor: theme.offWhite }]}>
            <Text style={[styles.loadingText, { color: theme.textLight }]}>{t.analysingReceipt}</Text>
          </View>
        )}

        {/* Demo mode banner */}
        {parsedItems.length > 0 && (
          <View style={[styles.demoBanner, { backgroundColor: theme.orangeLight }]}>
            <Text style={[styles.demoBannerText, { color: theme.brown }]}>⚠️ {t.demoModeBanner}</Text>
          </View>
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

const styles = StyleSheet.create({
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
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.sm,
  },
  retakeBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  loadingCard: { borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center' },
  loadingText: { fontSize: FontSize.md },
  demoBanner: { borderRadius: Radius.md, padding: Spacing.sm },
  demoBannerText: { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
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
});
