import { LocalDay } from '../models/state';

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` for the given instant in the *local* time zone. */
export function toLocalDay(date: Date): LocalDay {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight at the start of `day`. */
export function parseLocalDay(day: LocalDay): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar arithmetic on local days (DST-safe: uses Y/M/D, not milliseconds). */
export function addDays(day: LocalDay, n: number): LocalDay {
  const d = parseLocalDay(day);
  return toLocalDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole calendar days from `a` to `b` (negative if b is earlier). */
export function daysBetween(a: LocalDay, b: LocalDay): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isLocalDay(value: unknown): value is LocalDay {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toLocalDay(parseLocalDay(value)) === value;
}
