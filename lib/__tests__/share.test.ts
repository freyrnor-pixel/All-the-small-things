import { encodeSharePayload, decodeSharePayload, QRPayload } from '@/lib/share';

describe('lib/share', () => {
  const shopping: QRPayload = {
    v: 1,
    k: 's',
    b: 'Alice',
    i: [{ n: 'Milk', a: '2', u: 'l' }],
  };
  const tasks: QRPayload = {
    v: 1,
    k: 't',
    b: 'Bob',
    i: [{ n: 'Call dentist', d: '2026-06-21' }],
  };

  it('round-trips a shopping payload', () => {
    expect(decodeSharePayload(encodeSharePayload(shopping))).toEqual(shopping);
  });

  it('round-trips a task payload', () => {
    expect(decodeSharePayload(encodeSharePayload(tasks))).toEqual(tasks);
  });

  it('prefixes the wire format with UNFOCUS:', () => {
    expect(encodeSharePayload(shopping).startsWith('UNFOCUS:')).toBe(true);
  });

  it('rejects input without the prefix', () => {
    expect(decodeSharePayload(JSON.stringify(shopping))).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(decodeSharePayload('UNFOCUS:{not json')).toBeNull();
  });

  it('rejects an unsupported version', () => {
    expect(decodeSharePayload('UNFOCUS:' + JSON.stringify({ ...shopping, v: 2 }))).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(decodeSharePayload('UNFOCUS:' + JSON.stringify({ ...shopping, k: 'x' }))).toBeNull();
  });

  it('rejects a non-array items field', () => {
    expect(decodeSharePayload('UNFOCUS:' + JSON.stringify({ v: 1, k: 's', b: '', i: 'nope' }))).toBeNull();
  });
});
