/**
 * seedTestData.ts — inserts realistic sample data for manual testing.
 *
 * Call seedTestData() once from settings to populate tasks, shopping lists,
 * and habits with plausible Norwegian-language content so the app can be
 * explored without typing everything from scratch.
 *
 * Connections:
 *   Imports → lib/date, store/useHabitStore, store/useShoppingStore, store/useTaskStore
 *   Used by → app/settings.tsx (Load test data button)
 *   Data    → inserts into tasks, shopping_items, habits SQLite tables via stores
 *
 * Edit notes:
 *   - Dates are computed relative to today so data stays current.
 *   - Does NOT clear existing data first — safe to call on a fresh install.
 */

import { todayStr, dateStr } from '@/lib/date';
import { useTaskStore } from '@/store/useTaskStore';
import { useShoppingStore } from '@/store/useShoppingStore';
import { useHabitStore } from '@/store/useHabitStore';

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

export function seedTestData(): void {
  const today = todayStr();
  const tasks = useTaskStore.getState();
  const shopping = useShoppingStore.getState();
  const habits = useHabitStore.getState();

  // ── One-time tasks ────────────────────────────────────────────────────────
  tasks.add({ title: 'Legebesøk', date: addDays(today, 1), time: '10:00', taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'essential', priority: 'medium' });
  tasks.add({ title: 'Betale regninger', date: addDays(today, 4), taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'essential', priority: 'medium' });
  tasks.add({ title: 'Rydde kjøkken', date: today, taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });
  tasks.add({ title: 'Ringe tannlegen', date: addDays(today, 3), taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });
  tasks.add({ title: 'Handle mat', date: today, time: '14:00', taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });
  tasks.add({ title: 'Ta ut søppel', date: today, taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'essential', priority: 'medium' });
  tasks.add({ title: 'Sende e-post til forsikring', date: addDays(today, 2), taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });
  tasks.add({ title: 'Timesboks: rapport', date: addDays(today, 1), time: '09:00', taskType: 'time-box', durationMinutes: 60, done: false, recurring: 'none', recurringDays: [], importance: 'essential', priority: 'medium' });
  tasks.add({ title: 'Kjøpe bursdag-gave', date: addDays(today, 6), taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });
  tasks.add({ title: 'Vaske bilen', date: addDays(today, 5), taskType: 'start-at', done: false, recurring: 'none', recurringDays: [], importance: 'regular', priority: 'medium' });

  // ── Recurring weekly tasks ────────────────────────────────────────────────
  // Mon–Fri morning routine time-box (days 0–4 = Mon–Fri)
  tasks.add({ title: 'Morgenrutine', date: today, time: '07:30', taskType: 'time-box', durationMinutes: 30, done: false, recurring: 'weekly', recurringDays: [0, 1, 2, 3, 4], importance: 'essential', priority: 'medium' });
  // Tue/Thu gym
  tasks.add({ title: 'Treningssenter', date: today, time: '18:00', taskType: 'start-at', done: false, recurring: 'weekly', recurringDays: [1, 3], importance: 'regular', priority: 'medium' });
  // Monday planning session
  tasks.add({ title: 'Planlegge uka', date: today, time: '20:00', taskType: 'start-at', done: false, recurring: 'weekly', recurringDays: [0], importance: 'essential', priority: 'medium' });
  // Wednesday focus block time-box
  tasks.add({ title: 'Fokusøkt: dyp jobb', date: today, time: '10:00', taskType: 'time-box', durationMinutes: 90, done: false, recurring: 'weekly', recurringDays: [2], importance: 'regular', priority: 'medium' });
  // Sunday meal prep
  tasks.add({ title: 'Matplanlegging', date: today, time: '11:00', taskType: 'start-at', done: false, recurring: 'weekly', recurringDays: [6], importance: 'regular', priority: 'medium' });

  // ── Monthly shopping (staples) ────────────────────────────────────────────
  shopping.add({ name: 'Toalettpapir', amount: '4', unit: 'pk', listType: 'monthly', store: '', price: 89.90, category: 'personal', inventoryQty: 0 });
  shopping.add({ name: 'Vaskemiddel', amount: '1', unit: 'pk', listType: 'monthly', store: '', price: 59.90, category: 'cleaning', inventoryQty: 0 });
  shopping.add({ name: 'Oppvaskmiddel', amount: '2', unit: 'fl', listType: 'monthly', store: '', price: 34.90, category: 'cleaning', inventoryQty: 0 });
  shopping.add({ name: 'Tannkrem', amount: '2', unit: 'tb', listType: 'monthly', store: '', price: 29.90, category: 'personal', inventoryQty: 0 });
  shopping.add({ name: 'Shampoo', amount: '1', unit: 'fl', listType: 'monthly', store: '', price: 49.90, category: 'personal', inventoryQty: 0 });
  shopping.add({ name: 'Kaffebønner', amount: '1', unit: 'kg', listType: 'monthly', store: 'Kaffebrenneriet', price: 129.90, category: 'drinks', inventoryQty: 0 });
  shopping.add({ name: 'Havregryn', amount: '3', unit: 'pk', listType: 'monthly', store: '', price: 24.90, category: 'dry', inventoryQty: 0 });
  shopping.add({ name: 'Ris', amount: '2', unit: 'kg', listType: 'monthly', store: '', price: 39.90, category: 'dry', inventoryQty: 0 });
  shopping.add({ name: 'Pasta', amount: '4', unit: 'pk', listType: 'monthly', store: '', price: 14.90, category: 'dry', inventoryQty: 0 });
  shopping.add({ name: 'Hermetiske tomater', amount: '6', unit: 'boks', listType: 'monthly', store: '', price: 12.90, category: 'canned', inventoryQty: 0 });
  shopping.add({ name: 'Kokosmelk', amount: '4', unit: 'boks', listType: 'monthly', store: '', price: 18.90, category: 'canned', inventoryQty: 0 });
  shopping.add({ name: 'Olivenolje', amount: '1', unit: 'fl', listType: 'monthly', store: '', price: 79.90, category: 'dry', inventoryQty: 0 });

  // ── Weekly shopping ───────────────────────────────────────────────────────
  shopping.add({ name: 'Melk', amount: '2', unit: 'l', listType: 'weekly', store: 'Rema 1000', price: 21.90, category: 'dairy', inventoryQty: 0 });
  shopping.add({ name: 'Brød', amount: '1', unit: 'stk', listType: 'weekly', store: '', price: 39.90, category: 'bread', inventoryQty: 0 });
  shopping.add({ name: 'Egg', amount: '12', unit: 'stk', listType: 'weekly', store: '', price: 44.90, category: 'dairy', inventoryQty: 0 });
  shopping.add({ name: 'Smør', amount: '1', unit: 'pk', listType: 'weekly', store: '', price: 49.90, category: 'dairy', inventoryQty: 0 });
  shopping.add({ name: 'Yoghurt', amount: '2', unit: 'stk', listType: 'weekly', store: '', price: 19.90, category: 'dairy', inventoryQty: 0 });
  shopping.add({ name: 'Ost', amount: '1', unit: 'blokk', listType: 'weekly', store: '', price: 59.90, category: 'dairy', inventoryQty: 0 });
  shopping.add({ name: 'Kyllingfilet', amount: '500', unit: 'g', listType: 'weekly', store: 'Meny', price: 89.90, category: 'meat', inventoryQty: 0 });
  shopping.add({ name: 'Laks', amount: '400', unit: 'g', listType: 'weekly', store: 'Meny', price: 99.90, category: 'fish', inventoryQty: 0 });
  shopping.add({ name: 'Bananer', amount: '1', unit: 'bunt', listType: 'weekly', store: '', price: 23.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Epler', amount: '6', unit: 'stk', listType: 'weekly', store: '', price: 32.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Tomater', amount: '6', unit: 'stk', listType: 'weekly', store: '', price: 29.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Agurk', amount: '1', unit: 'stk', listType: 'weekly', store: '', price: 14.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Gulrøtter', amount: '1', unit: 'pose', listType: 'weekly', store: '', price: 19.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Paprika', amount: '3', unit: 'stk', listType: 'weekly', store: '', price: 19.90, category: 'produce', inventoryQty: 0 });
  shopping.add({ name: 'Spinat', amount: '1', unit: 'pose', listType: 'weekly', store: '', price: 24.90, category: 'produce', inventoryQty: 0 });

  // ── Habits ────────────────────────────────────────────────────────────────
  habits.add({ title: 'Drikke vann', icon: '💧', kind: 'build', category: 'health', cue: 'Etter hvert måltid', craving: 'Føle meg hydrert', response: 'Drikk et glass vann', reward: 'Klar hjerne', dailyGoal: 8, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '08:00', routineOrder: 1, childName: '' });
  habits.add({ title: 'Morgentur', icon: '🚶', kind: 'build', category: 'physical', cue: 'Etter frokost', craving: 'Frisk luft', response: 'Gå 20 min', reward: 'God energi for dagen', dailyGoal: 1, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '07:30', routineOrder: 2, childName: '' });
  habits.add({ title: 'Lese', icon: '📚', kind: 'build', category: 'mental', cue: 'Etter kveldsmaten', craving: 'Lære noe nytt', response: 'Les 20 sider', reward: 'Ro og avslapning', dailyGoal: 1, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '21:00', routineOrder: 3, childName: '' });
  habits.add({ title: 'Meditasjon', icon: '🧘', kind: 'build', category: 'mental', cue: 'Etter morgenkaffe', craving: 'Indre ro', response: 'Sitt stille i 10 min', reward: 'Senket stressnivå', dailyGoal: 1, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '08:30', routineOrder: 4, childName: '' });
  habits.add({ title: 'Redusere koffein', icon: '☕', kind: 'break', category: 'health', cue: 'Etter lunsj', craving: 'Energi uten kaffe', response: 'Drikk te istedenfor', reward: 'Bedre søvn', dailyGoal: 2, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '13:00', routineOrder: 5, childName: '' });
  habits.add({ title: 'Kveldsøvelse', icon: '🤸', kind: 'build', category: 'physical', cue: 'Etter kveldsnyhetene', craving: 'Strekke ut', response: 'Strekk og bevegelse i 15 min', reward: 'Roligere søvn', dailyGoal: 1, recurrence: 'weekly', recurrenceDays: [0, 2, 4], notificationEnabled: false, notificationTimes: [], notificationTime: '20:00', routineOrder: 6, childName: '' });
  habits.add({ title: 'Journalskriving', icon: '✍️', kind: 'build', category: 'wellbeing', cue: 'Før leggetid', craving: 'Klargjøre tanker', response: 'Skriv 3 setninger', reward: 'Takknemlighet og ro', dailyGoal: 1, recurrence: 'daily', recurrenceDays: [], notificationEnabled: false, notificationTimes: [], notificationTime: '22:00', routineOrder: 7, childName: '' });
}
