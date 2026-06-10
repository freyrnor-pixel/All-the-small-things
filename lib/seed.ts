/**
 * seed.ts — UNUSED/LEGACY — not imported anywhere; lib/catalogSeed.ts is the live catalog seed.
 *
 * Older shopping-catalog seeder: SEED_ITEMS + seedStoreItems() insert directly
 * into store_items. Superseded by lib/catalogSeed.ts (CATALOG_SEED), which
 * useCatalogStore actually consumes. Kept only for reference; safe to delete.
 *
 * Connections:
 *   Imports → lib/db (relative ./db)
 *   Used by → nothing (verified: seedStoreItems has no importers)
 *   Data    → would seed the `store_items` SQLite table — but is never called
 *
 * Edit notes:
 *   - Dead code: changes here have no effect. Edit lib/catalogSeed.ts instead.
 *   - If reviving, note categories here use 'other' for spices/sauces, unlike catalogSeed.
 */
import db from './db';

// Common Norwegian grocery/household items used to seed the shopping catalog
// (autocomplete + auto-categorisation). Categories use the same keys as the
// shopping screen (see CATEGORY_ORDER in app/shopping.tsx) so a chosen
// suggestion pre-fills a valid category. Item names are real-world data and are
// intentionally not translated — only the app's UI follows the user's language.
const SEED_ITEMS: { name: string; category: string }[] = [
  // Frukt og grønt (Produce)
  { name: 'Gulrot', category: 'produce' },
  { name: 'Løk', category: 'produce' },
  { name: 'Hvitløk', category: 'produce' },
  { name: 'Poteter', category: 'produce' },
  { name: 'Tomat', category: 'produce' },
  { name: 'Agurk', category: 'produce' },
  { name: 'Paprika', category: 'produce' },
  { name: 'Brokkoli', category: 'produce' },
  { name: 'Blomkål', category: 'produce' },
  { name: 'Spinat', category: 'produce' },
  { name: 'Salat', category: 'produce' },
  { name: 'Mais', category: 'produce' },
  { name: 'Erter', category: 'produce' },
  { name: 'Søtpotet', category: 'produce' },
  { name: 'Sopp', category: 'produce' },
  { name: 'Zucchini', category: 'produce' },
  { name: 'Aubergine', category: 'produce' },
  { name: 'Eple', category: 'produce' },
  { name: 'Banan', category: 'produce' },
  { name: 'Appelsin', category: 'produce' },
  { name: 'Sitron', category: 'produce' },
  { name: 'Pære', category: 'produce' },
  { name: 'Drue', category: 'produce' },
  { name: 'Jordbær', category: 'produce' },
  { name: 'Blåbær', category: 'produce' },
  { name: 'Bringebær', category: 'produce' },
  { name: 'Mango', category: 'produce' },
  { name: 'Avokado', category: 'produce' },
  // Kjøtt og fisk (Meat & Fish)
  { name: 'Kyllingbryst', category: 'meat' },
  { name: 'Kjøttdeig', category: 'meat' },
  { name: 'Laks', category: 'fish' },
  { name: 'Torsk', category: 'fish' },
  { name: 'Rekekjøtt', category: 'fish' },
  { name: 'Svinekjøtt', category: 'meat' },
  { name: 'Bacon', category: 'meat' },
  { name: 'Pølser', category: 'meat' },
  { name: 'Karbonadedeig', category: 'meat' },
  // Meieri (Dairy)
  { name: 'Melk', category: 'dairy' },
  { name: 'Smør', category: 'dairy' },
  { name: 'Rømme', category: 'dairy' },
  { name: 'Fløte', category: 'dairy' },
  { name: 'Ost', category: 'dairy' },
  { name: 'Brunost', category: 'dairy' },
  { name: 'Yoghurt', category: 'dairy' },
  { name: 'Egg', category: 'dairy' },
  { name: 'Cottage cheese', category: 'dairy' },
  // Brød og bakst (Bread & Bakery)
  { name: 'Brød', category: 'bread' },
  { name: 'Kneippbrød', category: 'bread' },
  { name: 'Loff', category: 'bread' },
  { name: 'Knekkebrød', category: 'bread' },
  { name: 'Rundstykker', category: 'bread' },
  // Tørrvarer (Dry goods)
  { name: 'Pasta', category: 'dry' },
  { name: 'Ris', category: 'dry' },
  { name: 'Spaghetti', category: 'dry' },
  { name: 'Mel', category: 'dry' },
  { name: 'Sukker', category: 'dry' },
  { name: 'Salt', category: 'dry' },
  { name: 'Pepper', category: 'dry' },
  { name: 'Havregryn', category: 'dry' },
  { name: 'Müsli', category: 'dry' },
  { name: 'Cornflakes', category: 'dry' },
  { name: 'Linser', category: 'dry' },
  { name: 'Kikærter', category: 'dry' },
  { name: 'Bønner', category: 'dry' },
  // Hermetikk og glass (Canned)
  { name: 'Hermetiske tomater', category: 'canned' },
  { name: 'Kokosmelk', category: 'canned' },
  { name: 'Tunfisk på boks', category: 'canned' },
  { name: 'Mais på boks', category: 'canned' },
  { name: 'Tomatsaus', category: 'canned' },
  // Krydder og saus (Spices & sauces)
  { name: 'Ketchup', category: 'other' },
  { name: 'Sennep', category: 'other' },
  { name: 'Majones', category: 'other' },
  { name: 'Soyasaus', category: 'other' },
  { name: 'Olivenolje', category: 'other' },
  { name: 'Rapsolje', category: 'other' },
  { name: 'Eddik', category: 'other' },
  { name: 'Buljong', category: 'other' },
  // Drikke (Drinks)
  { name: 'Juice', category: 'drinks' },
  { name: 'Kaffe', category: 'drinks' },
  { name: 'Te', category: 'drinks' },
  { name: 'Vann på flaske', category: 'drinks' },
  { name: 'Brus', category: 'drinks' },
  // Husholdning (Household / Cleaning)
  { name: 'Toalettpapir', category: 'cleaning' },
  { name: 'Kjøkkenpapir', category: 'cleaning' },
  { name: 'Såpe', category: 'cleaning' },
  { name: 'Oppvaskmiddel', category: 'cleaning' },
  { name: 'Tøymykner', category: 'cleaning' },
  { name: 'Vaskemiddel', category: 'cleaning' },
  { name: 'Søppelposer', category: 'cleaning' },
  { name: 'Aluminiumsfolie', category: 'cleaning' },
  { name: 'Plastfolie', category: 'cleaning' },
  { name: 'Stearinlys', category: 'cleaning' },
  { name: 'Batterier', category: 'cleaning' },
  // Personlig pleie (Personal care)
  { name: 'Sjampo', category: 'personal' },
  { name: 'Balsam', category: 'personal' },
  { name: 'Tannkrem', category: 'personal' },
  { name: 'Tannbørste', category: 'personal' },
  { name: 'Deodorant', category: 'personal' },
  { name: 'Barberskum', category: 'personal' },
  { name: 'Fuktighetskrem', category: 'personal' },
  { name: 'Bind', category: 'personal' },
  { name: 'Tamponger', category: 'personal' },
];

export function seedStoreItems() {
  const existing = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM store_items'
  );
  if (existing && existing.count > 0) return;

  const insert = db.prepareSync(
    'INSERT OR IGNORE INTO store_items (id, name, category) VALUES (?, ?, ?)'
  );
  try {
    for (const item of SEED_ITEMS) {
      insert.executeSync([`seed_${item.name}`, item.name, item.category]);
    }
  } finally {
    insert.finalizeSync();
  }
}
