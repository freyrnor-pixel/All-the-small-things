import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

const NORWEGIAN_STORES = [
  'REMA 1000', 'Kiwi', 'Coop Extra', 'Coop Mega', 'Meny', 'Spar', 'Bunnpris', 'Joker', 'Prix',
];

type ParsedItem = {
  name: string;
  price: number;
  selected: boolean;
};

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

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tilgang nødvendig', 'Kameraet trenger tilgang for å skanne kvitteringer.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    }
  }

  function processImage() {
    setLoading(true);
    // OCR would happen here via a native module.
    // Simulating a parsed result for now so the UI flow is complete.
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
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, selected: !item.selected } : item))
    );
  }

  function updateName(i: number, name: string) {
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, name } : item))
    );
  }

  function addToList() {
    const selected = parsedItems.filter((i) => i.selected);
    selected.forEach((item) => {
      addShopping({
        name: item.name,
        amount: '1',
        unit: '',
        listType: 'weekly',
        store: selectedStore,
        price: item.price,
      });
    });
    Alert.alert(
      'Lagt til!',
      `${selected.length} varer ble lagt til i handlelisten.`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Hjem</Text>
        </Pressable>
        <Text style={styles.title}>Skann kvittering</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Store selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Butikk</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.storeRow}>
              {NORWEGIAN_STORES.map((store) => (
                <Pressable
                  key={store}
                  style={[styles.storeChip, selectedStore === store && styles.storeChipActive]}
                  onPress={() => setSelectedStore(selectedStore === store ? '' : store)}
                >
                  <Text style={[styles.storeText, selectedStore === store && styles.storeTextActive]}>
                    {store}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Scan buttons */}
        {!imageUri && (
          <View style={styles.scanButtons}>
            <Pressable style={styles.scanBtn} onPress={takePhoto}>
              <Text style={styles.scanBtnIcon}>📷</Text>
              <Text style={styles.scanBtnText}>Ta bilde</Text>
            </Pressable>
            <Pressable style={styles.scanBtn} onPress={pickImage}>
              <Text style={styles.scanBtnIcon}>🖼</Text>
              <Text style={styles.scanBtnText}>Velg fra bibliotek</Text>
            </Pressable>
          </View>
        )}

        {/* Preview */}
        {imageUri && (
          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
            <Pressable style={styles.retakeBtn} onPress={() => { setImageUri(null); setParsedItems([]); }}>
              <Text style={styles.retakeBtnText}>Ta nytt bilde</Text>
            </Pressable>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Analyserer kvittering…</Text>
          </View>
        )}

        {/* Parsed items */}
        {parsedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Gjenkjente varer – velg hvilke som skal legges til</Text>
            {parsedItems.map((item, i) => (
              <View key={i} style={styles.parsedRow}>
                <Pressable
                  style={[styles.checkBox, item.selected && styles.checkBoxActive]}
                  onPress={() => toggleItem(i)}
                >
                  {item.selected && <Text style={styles.checkMark}>✓</Text>}
                </Pressable>
                <TextInput
                  style={[styles.parsedName, !item.selected && styles.parsedNameDone]}
                  value={item.name}
                  onChangeText={(v) => updateName(i, v)}
                />
                <Text style={styles.parsedPrice}>{item.price.toFixed(2)} kr</Text>
              </View>
            ))}
            <Pressable style={styles.addBtn} onPress={addToList}>
              <Text style={styles.addBtnText}>
                Legg til {parsedItems.filter((i) => i.selected).length} varer i handlelisten
              </Text>
            </Pressable>
          </View>
        )}

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
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '600' },
  storeRow: { flexDirection: 'row', gap: Spacing.sm },
  storeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.grayLight,
  },
  storeChipActive: { backgroundColor: Colors.orange },
  storeText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  storeTextActive: { color: Colors.white },
  scanButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  scanBtnIcon: { fontSize: 36 },
  scanBtnText: { fontSize: FontSize.md, color: Colors.text, fontWeight: '600' },
  previewCard: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.card,
  },
  preview: { width: '100%', height: 220 },
  retakeBtn: {
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: FontSize.sm, color: Colors.orange, fontWeight: '600' },
  loadingCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: { fontSize: FontSize.md, color: Colors.textLight },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    ...Shadow.card,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  checkMark: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  parsedName: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  parsedNameDone: { color: Colors.gray, textDecorationLine: 'line-through' },
  parsedPrice: { fontSize: FontSize.sm, color: Colors.textLight, fontWeight: '500' },
  addBtn: {
    backgroundColor: Colors.orange,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
});
