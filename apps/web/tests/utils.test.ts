import { describe, expect, it } from 'vitest';
import { formatDuration, hashString, mulberry32, plural, shuffleWithSeed, todayKey } from '../src/lib/utils';

describe('utils', () => {
  it('hashes strings deterministically', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });

  it('shuffles deterministically and keeps every item', () => {
    const source = Array.from({ length: 30 }).map((_, index) => index);
    const a = shuffleWithSeed(source, 42);
    const b = shuffleWithSeed(source, 42);
    const c = shuffleWithSeed(source, 43);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort((x, y) => x - y)).toEqual(source);
    expect(source).toEqual(Array.from({ length: 30 }).map((_, index) => index));
  });

  it('mulberry32 stays inside [0, 1)', () => {
    const rnd = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const value = rnd();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('formats durations as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(61_000)).toBe('01:01');
    expect(formatDuration(600_000)).toBe('10:00');
    expect(formatDuration(-5_000)).toBe('00:00');
  });

  it('produces stable day keys', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('declines russian plurals', () => {
    const forms: [string, string, string] = ['вопрос', 'вопроса', 'вопросов'];
    expect(plural(1, forms)).toBe('вопрос');
    expect(plural(3, forms)).toBe('вопроса');
    expect(plural(11, forms)).toBe('вопросов');
    expect(plural(21, forms)).toBe('вопрос');
  });
});