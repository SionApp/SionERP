/**
 * ISO-8601 week utilities.
 *
 * All functions are Monday-anchored (weekStartsOn: 1) and produce labels
 * identical to Go's time.ISOWeek() formatted as "%04d-W%02d".
 *
 * Key rule: Sunday belongs to the SAME week as the preceding Monday,
 * not the next week. date-fns startOfISOWeek enforces this automatically.
 */
import { addDays, getISOWeek, getISOWeekYear, startOfISOWeek } from 'date-fns';

export interface IsoWeekBounds {
  monday: Date;
  saturday: Date;
  isoWeek: string;
}

/**
 * Returns the ISO week label for a given date in the format "YYYY-Www".
 * Matches Go's `fmt.Sprintf("%04d-W%02d", y, w)` where y, w = time.ISOWeek().
 *
 * Examples:
 *   2020-12-28 → "2020-W53"
 *   2021-01-04 → "2021-W01"
 *   2025-12-29 → "2026-W01"
 *   2026-01-01 → "2026-W01"
 *   2026-01-04 (Sunday) → "2025-W53"  (same as 2025-12-29, the preceding Monday)
 */
export function getIsoWeek(date: Date): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Returns Monday and Saturday (end-of-meeting-week) for the ISO week
 * containing the given date.
 *
 * saturday = monday + 5 days (the cell-group meeting day).
 */
export function isoWeekBounds(date: Date): IsoWeekBounds {
  const monday = startOfISOWeek(date);
  const saturday = addDays(monday, 5);
  const isoWeek = getIsoWeek(monday);
  return { monday, saturday, isoWeek };
}

/**
 * Returns the most recently COMPLETED Mon..Sat week relative to `now`.
 *
 * Logic:
 * - A week is "complete" once Saturday has passed (i.e. now > saturday of that week).
 * - If today is Sunday or any day of the current in-progress week, we return
 *   the PREVIOUS completed Mon..Sat.
 * - If today IS Saturday (the last day of the current week), the current week
 *   is still considered the most recently ended one (it just closed).
 *
 * This mirrors Go's justEndedWeekBounds fired at Saturday 23:00: at that point
 * the current ISO week is the just-closed week.
 */
export function justEndedWeek(now: Date): IsoWeekBounds {
  const currentMonday = startOfISOWeek(now);
  const currentSaturday = addDays(currentMonday, 5);

  // If today is strictly before Saturday of the current week, the current week
  // is still open → return the previous completed week.
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const satMidnight = new Date(
    currentSaturday.getFullYear(),
    currentSaturday.getMonth(),
    currentSaturday.getDate()
  );

  if (todayMidnight < satMidnight) {
    // Current week not yet closed — go back 7 days to the previous week.
    const prevMonday = addDays(currentMonday, -7);
    const prevSaturday = addDays(prevMonday, 5);
    return {
      monday: prevMonday,
      saturday: prevSaturday,
      isoWeek: getIsoWeek(prevMonday),
    };
  }

  // Today is Saturday or later (Sunday is handled above because for ISO weeks,
  // Sunday belongs to the CURRENT week which started on its own Monday —
  // but wait: Sunday is BEFORE Monday of the next week, so it is still in the
  // same ISO week as the preceding Saturday). Actually Sunday's ISO week ==
  // the week that started the preceding Monday, same as Saturday. Let's be
  // explicit: if today is Sunday, startOfISOWeek(now) is the Monday 6 days ago,
  // and currentSaturday is yesterday — so todayMidnight > satMidnight → we
  // return the just-closed current week. That's correct: Sunday is AFTER Saturday
  // meaning the previous Mon..Sat has fully closed.
  return {
    monday: currentMonday,
    saturday: currentSaturday,
    isoWeek: getIsoWeek(currentMonday),
  };
}
