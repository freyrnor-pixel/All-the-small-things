import db from './db';

// Common Norwegian grocery/household items
const SEED_ITEMS: { name: string; category: string }[] = [
  // Grønnsaker (Vegetables)
  { name: 'Gulrot', category: 'vegetables' },
  { name: 'Løk', category: 'vegetables' },
  { name: 'Hvitløk', category: 'vegetables' },
  { name: 'Poteter', category: 'vegetables' },
  { name: 'Tomat', category: 'vegetables' },
  { name: 'Agurk', category: 'vegetables' },
  { name: 'Paprika', category: 'vegetables' },
  { name: 'Brokkoli', category: 'vegetables' },
  { name: 'Blomkål', category: 'vegetables' },
  { name: 'Spinat', category: 'vegetables' },
  { name: 'Salat', category: 'vegetables' },
  { name: 'Mais', category: 'vegetables' },
  { name: 'Erter', category: 'vegetables' },
  { name: 'Søtpotet', category: 'vegetables' },
  { name: 'Sopp', category: 'vegetables' },
  { name: 'Zucchini', category: 'vegetables' },
  { name: 'Aubergine', category: 'vegetables' },
  // Frukt (Fruit)
  { name: 'Eple', category: 'fruit' },
  { name: 'Banan', category: 'fruit' },
  { name: 'Appelsin', category: 'fruit' },
  { name: 'Sitron', category: 'fruit' },
  { name: 'Pære', category: 'fruit' },
  { name: 'Drue', category: 'fruit' },
  { name: 'Jordbær', category: 'fruit' },
  { name: 'Blåbær', category: 'fruit' },
  { name: 'Bringebær', category: 'fruit' },
  { name: 'Mango', category: 'fruit' },
  { name: 'Avokado', category: 'fruit' },
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
  { name: 'Brød', category: 'bakery' },
  { name: 'Kneippbrød', category: 'bakery' },
  { name: 'Loff', category: 'bakery' },
  { name: 'Knekkebrød', category: 'bakery' },
  { name: 'Rundstykker', category: 'bakery' },
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
  { name: 'Ketchup', category: 'condiments' },
  { name: 'Sennep', category: 'condiments' },
  { name: 'Majones', category: 'condiments' },
  { name: 'Soyasaus', category: 'condiments' },
  { name: 'Olivenolje', category: 'condiments' },
  { name: 'Rapsolje', category: 'condiments' },
  { name: 'Eddik', category: 'condiments' },
  { name: 'Buljong', category: 'condiments' },
  // Drikke (Drinks)
  { name: 'Juice', category: 'drinks' },
  { name: 'Kaffe', category: 'drinks' },
  { name: 'Te', category: 'drinks' },
  { name: 'Vann på flaske', category: 'drinks' },
  { name: 'Brus', category: 'drinks' },
  // Husholdning (Household)
  { name: 'Toalettpapir', category: 'household' },
  { name: 'Kjøkkenpapir', category: 'household' },
  { name: 'Såpe', category: 'household' },
  { name: 'Oppvaskmiddel', category: 'household' },
  { name: 'Tøymykner', category: 'household' },
  { name: 'Vaskemiddel', category: 'household' },
  { name: 'Søppelposer', category: 'household' },
  { name: 'Aluminiumsfolie', category: 'household' },
  { name: 'Plastfolie', category: 'household' },
  { name: 'Stearinlys', category: 'household' },
  { name: 'Batterier', category: 'household' },
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
  for (const item of SEED_ITEMS) {
    insert.executeSync([`seed_${item.name}`, item.name, item.category]);
  }
  insert.finalizeSync();
}
