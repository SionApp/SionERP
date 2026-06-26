/**
 * ISO week parity tests — spec R6.
 *
 * These dates are the canonical boundary cases that must match Go's
 * time.ISOWeek() formatted as "%04d-W%02d".
 */
import { describe, expect, it } from 'vitest';
import { getIsoWeek, isoWeekBounds, justEndedWeek } from './iso-week';

// ---------------------------------------------------------------------------
// getIsoWeek — W52/W53/W01 boundary + Sunday regression
// ---------------------------------------------------------------------------
describe('getIsoWeek', () => {
  const cases: [string, string][] = [
    // date (YYYY-MM-DD)       expected ISO week
    ['2020-12-28', '2020-W53'], // last Monday of 2020 is in W53
    ['2021-01-04', '2021-W01'], // first Monday of 2021
    ['2025-12-29', '2026-W01'], // Monday that starts the first ISO week of 2026
    ['2026-01-01', '2026-W01'], // Thursday of the same week — still 2026-W01
  ];

  it.each(cases)('getIsoWeek(%s) === %s', (dateStr, expected) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Use UTC noon to avoid timezone shifts
    const date = new Date(y, m - 1, d, 12, 0, 0);
    expect(getIsoWeek(date)).toBe(expected);
  });

  // Sunday regression: Sunday must NOT advance the ISO week.
  // 2025-12-28 is a Sunday. Its ISO week is 2025-W52 (same as Mon 2025-12-22).
  // 2025-12-29 is the Monday that STARTS 2026-W01.
  // Verify: Sunday 2025-12-28 does NOT return 2026-W01.
  it('Sunday 2025-12-28 stays in 2025-W52, not 2026-W01', () => {
    const sunday = new Date(2025, 11, 28, 12, 0, 0); // Dec 28 2025 = Sunday
    expect(getIsoWeek(sunday)).toBe('2025-W52');
  });

  it('Monday 2025-12-29 is 2026-W01 (the NEXT week after Sunday)', () => {
    const monday = new Date(2025, 11, 29, 12, 0, 0); // Dec 29 2025 = Monday
    expect(getIsoWeek(monday)).toBe('2026-W01');
  });

  // Additional boundary: 2020-12-27 is a Sunday in 2020-W52,
  // and 2020-12-28 (Monday) starts 2020-W53.
  it('Sunday 2020-12-27 is 2020-W52, Monday 2020-12-28 is 2020-W53', () => {
    expect(getIsoWeek(new Date(2020, 11, 27, 12, 0, 0))).toBe('2020-W52');
    expect(getIsoWeek(new Date(2020, 11, 28, 12, 0, 0))).toBe('2020-W53');
  });
});

// ---------------------------------------------------------------------------
// isoWeekBounds
// ---------------------------------------------------------------------------
describe('isoWeekBounds', () => {
  it('returns the ISO Monday and Saturday for a given date', () => {
    // 2026-01-07 is a Wednesday in 2026-W02
    const { monday, saturday, isoWeek } = isoWeekBounds(new Date(2026, 0, 7, 12));
    expect(isoWeek).toBe('2026-W02');
    // Monday of 2026-W02 = 2026-01-05
    expect(monday.getFullYear()).toBe(2026);
    expect(monday.getMonth()).toBe(0);
    expect(monday.getDate()).toBe(5);
    // Saturday = Monday + 5
    expect(saturday.getDate()).toBe(10);
  });

  it('saturday is always exactly 5 days after monday', () => {
    const { monday, saturday } = isoWeekBounds(new Date(2025, 11, 29, 12));
    const diff = (saturday.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// justEndedWeek
// ---------------------------------------------------------------------------
describe('justEndedWeek', () => {
  it('on a Monday (week open), returns PREVIOUS completed week', () => {
    // 2026-01-05 = Monday of 2026-W02. The just-ended week is 2025-W53 / 2026-W01.
    // Actually the previous week is 2025-12-29..2026-01-03 = 2026-W01.
    const monday = new Date(2026, 0, 5, 9, 0, 0);
    const result = justEndedWeek(monday);
    expect(result.isoWeek).toBe('2026-W01');
    // monday of that week is 2025-12-29
    expect(result.monday.getFullYear()).toBe(2025);
    expect(result.monday.getMonth()).toBe(11); // December
    expect(result.monday.getDate()).toBe(29);
  });

  it('on a Saturday, returns the CURRENT (just-closed) week', () => {
    // 2026-01-03 = Saturday of 2026-W01
    const saturday = new Date(2026, 0, 3, 23, 0, 0);
    const result = justEndedWeek(saturday);
    expect(result.isoWeek).toBe('2026-W01');
    expect(result.saturday.getDate()).toBe(3);
  });

  it('on a Sunday, returns the CURRENT week (Saturday just passed)', () => {
    // 2026-01-04 = Sunday of 2026-W01 (ISO: Sunday is still in W01)
    // Saturday 2026-01-03 has passed, so the just-ended week is 2026-W01.
    const sunday = new Date(2026, 0, 4, 10, 0, 0);
    const result = justEndedWeek(sunday);
    expect(result.isoWeek).toBe('2026-W01');
  });

  it('on a Wednesday, returns PREVIOUS completed week', () => {
    // 2026-01-07 = Wednesday of 2026-W02. Previous = 2026-W01.
    const wednesday = new Date(2026, 0, 7, 12, 0, 0);
    const result = justEndedWeek(wednesday);
    expect(result.isoWeek).toBe('2026-W01');
  });
});
