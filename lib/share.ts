export type QRShoppingItem = { n: string; a: string; u: string };
export type QRTaskItem = { n: string; d: string };

export type QRPayload =
  | { v: 1; k: 's'; b: string; i: QRShoppingItem[] }
  | { v: 1; k: 't'; b: string; i: QRTaskItem[] };

const PREFIX = 'UNFOCUS:';

export function encodeSharePayload(payload: QRPayload): string {
  return PREFIX + JSON.stringify(payload);
}

export function decodeSharePayload(data: string): QRPayload | null {
  if (!data.startsWith(PREFIX)) return null;
  try {
    const parsed = JSON.parse(data.slice(PREFIX.length));
    if (parsed?.v === 1 && (parsed.k === 's' || parsed.k === 't') && Array.isArray(parsed.i)) {
      return parsed as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}
