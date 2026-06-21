/**
 * receipt.ts — parse OCR'd receipt text into priced line items.
 *
 * Pure text→items parser extracted from app/scan.tsx so it can be unit tested
 * and reused. Skips totals/payment/metadata lines and keeps lines containing a
 * NN[.,]NN price; the item name is whatever remains once the price is stripped.
 * Items default to `selected: true` because the user always reviews them before
 * anything is added.
 *
 * Connections:
 *   Imports → —
 *   Used by → app/scan.tsx
 *   Data    → none (pure function)
 *
 * Edit notes:
 *   - Tune skipPatterns/pricePattern if OCR accuracy drops for new store formats.
 */
export type ParsedReceiptItem = { name: string; price: number; selected: boolean };

export function parseReceiptText(text: string): ParsedReceiptItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedReceiptItem[] = [];
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
