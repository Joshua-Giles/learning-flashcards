import { addDays, daysBetween, isLocalDay, parseLocalDay, toLocalDay } from './local-day';

describe('local-day', () => {
  it('formats a Date using local (not UTC) components', () => {
    // 23:30 local on 24 Nov — would be 25 Nov in UTC for zones west of UTC−0:30.
    expect(toLocalDay(new Date(2026, 10, 24, 23, 30))).toBe('2026-11-24');
    expect(toLocalDay(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  it('parses back to local midnight', () => {
    const d = parseLocalDay('2026-03-08');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 8, 0]);
  });

  it('adds days across month/year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('counts whole days between two local days, DST-safe', () => {
    expect(daysBetween('2026-11-24', '2026-11-24')).toBe(0);
    expect(daysBetween('2026-11-24', '2026-11-25')).toBe(1);
    expect(daysBetween('2026-11-25', '2026-11-24')).toBe(-1);
    // US/EU DST transitions in March and November 2026.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-11-02')).toBe(9);
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('validates the YYYY-MM-DD shape', () => {
    expect(isLocalDay('2026-11-24')).toBe(true);
    expect(isLocalDay('2026-1-24')).toBe(false);
    expect(isLocalDay('2026-13-01')).toBe(false);
    expect(isLocalDay(20261124)).toBe(false);
  });
});
