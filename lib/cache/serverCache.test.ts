import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getOrSet, invalidate, invalidatePrefix } from './serverCache';

// Unique keys per test keep the module-level Map isolated between tests.
let n = 0;
const key = (base: string) => `${base}-${++n}`;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-18T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('serverCache', () => {
  test('getOrSet calls fn once and caches the result within the TTL', async () => {
    const k = key('k');
    let calls = 0;
    const fn = async () => {
      calls++;
      return 'value';
    };
    expect(await getOrSet(k, 1000, fn)).toBe('value');
    expect(await getOrSet(k, 1000, fn)).toBe('value');
    expect(calls).toBe(1);
  });

  test('getOrSet re-calls fn after the TTL expires', async () => {
    const k = key('ttl');
    let calls = 0;
    const fn = async () => {
      calls++;
      return calls;
    };
    expect(await getOrSet(k, 1000, fn)).toBe(1);
    vi.advanceTimersByTime(999);
    expect(await getOrSet(k, 1000, fn)).toBe(1);
    vi.advanceTimersByTime(2);
    expect(await getOrSet(k, 1000, fn)).toBe(2);
    expect(calls).toBe(2);
  });

  test('invalidate forces the next getOrSet call to re-run fn', async () => {
    const k = key('inv');
    let calls = 0;
    const fn = async () => ++calls;
    await getOrSet(k, 60_000, fn);
    invalidate(k);
    expect(await getOrSet(k, 60_000, fn)).toBe(2);
    expect(calls).toBe(2);
  });

  test('invalidatePrefix clears every key starting with the given prefix', async () => {
    const p = key('sections');
    const a = `${p}:book1:a`;
    const b = `${p}:book1:b`;
    const other = key('books');
    let calls = 0;
    const fn = async () => ++calls;

    await getOrSet(a, 60_000, fn);
    await getOrSet(b, 60_000, fn);
    await getOrSet(other, 60_000, fn);
    expect(calls).toBe(3);

    invalidatePrefix(`${p}:`);

    await getOrSet(a, 60_000, fn);
    await getOrSet(b, 60_000, fn);
    expect(calls).toBe(5);
    // Unrelated key stays cached.
    await getOrSet(other, 60_000, fn);
    expect(calls).toBe(5);
  });
});
