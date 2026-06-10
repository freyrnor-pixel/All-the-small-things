import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// No-op on iOS or when the native module isn't installed yet
const Mod = NativeModules.WearOSModule ?? null;
const emitter = Mod ? new NativeEventEmitter(Mod) : null;

export type WearMessage = {
  path: string;
  payload: string;
};

// Paths — must match WearPaths in the Kotlin watch app
export const WearPaths = {
  TASK_TOGGLE: '/unfocus/task/toggle',
  SHOP_TOGGLE: '/unfocus/shop/toggle',
  HABIT_INC:   '/unfocus/habit/inc',
  HABIT_DEC:   '/unfocus/habit/dec',
} as const;

/** Push a full data snapshot to the watch (call after loading stores). */
export async function sendWearSnapshot(payload: {
  tasks:    { id: string; title: string; time?: string; importance: string; done: boolean }[];
  shopping: { id: string; name: string; amount: string; unit: string; category: string; checked: boolean }[];
  habits:   { id: string; title: string; icon: string; kind: string; dailyGoal: number; todayCount: number }[];
}): Promise<void> {
  if (!Mod || Platform.OS !== 'android') return;
  await Mod.sendSnapshot(JSON.stringify(payload));
}

/**
 * Subscribe to mutation messages coming FROM the watch.
 * Call this once in your root layout (e.g. app/_layout.tsx).
 * Returns an unsubscribe function.
 */
export function subscribeWearMessages(
  handler: (msg: WearMessage) => void
): () => void {
  if (!emitter) return () => {};
  const sub = emitter.addListener('WearOSMessage', handler);
  return () => sub.remove();
}
