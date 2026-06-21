import { parseReceiptText } from '@/lib/receipt';

describe('parseReceiptText', () => {
  it('extracts priced items and strips the price from the name', () => {
    const items = parseReceiptText('Melk 19,90\nBrød 25.50');
    expect(items).toEqual([
      { name: 'Melk', price: 19.9, selected: true },
      { name: 'Brød', price: 25.5, selected: true },
    ]);
  });

  it('skips totals/payment/metadata lines', () => {
    const items = parseReceiptText(
      ['Total 45,40', 'MVA 9,08', 'Visa 45,40', 'Bananer 12,00'].join('\n')
    );
    expect(items).toEqual([{ name: 'Bananer', price: 12, selected: true }]);
  });

  it('ignores lines with no price and too-short names', () => {
    expect(parseReceiptText('Just a header line')).toEqual([]);
    expect(parseReceiptText('X 5,00')).toEqual([]); // name "X" is shorter than 2 chars
  });

  it('collapses internal whitespace in the item name', () => {
    expect(parseReceiptText('Rømme   lett    34,90')).toEqual([
      { name: 'Rømme lett', price: 34.9, selected: true },
    ]);
  });
});
