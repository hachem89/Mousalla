import { describe, it, expect, afterEach } from 'vitest';
import { computeTimes, getStatus, localDate, formatTime, formatCountdown, addDays } from '../src/prayer.js';

// Reference values (computed independently), Tunis local time.
const REFERENCE = {
  '2026-11-17': { fajr: '05:29:39', sunrise: '06:59:32', dhuhr: '12:04:08', asr: '14:48:31', maghrib: '17:08:44', isha: '18:38:37' },
  '2026-11-18': { fajr: '05:30:32', sunrise: '07:00:34', dhuhr: '12:04:21', asr: '14:48:03', maghrib: '17:08:07', isha: '18:38:09' },
};

// Tunis is UTC+1 all year.
const tunis = (date, hms) => new Date(`${date}T${hms}+01:00`);

describe('prayer times', () => {
  const originalTZ = process.env.TZ;
  afterEach(() => { process.env.TZ = originalTZ; });

  for (const [date, ref] of Object.entries(REFERENCE)) {
    it(`match the reference on ${date} within 1 minute`, () => {
      const times = computeTimes(date);
      for (const [name, hms] of Object.entries(ref)) {
        const diff = Math.abs(times[name] - tunis(date, hms)) / 60000;
        expect(diff, name).toBeLessThanOrEqual(1);
      }
    });
  }

  it('are rounded to the minute', () => {
    for (const t of Object.values(computeTimes('2026-11-17'))) expect(t.getTime() % 60000).toBe(0);
  });

  it('do not depend on the phone timezone', () => {
    const base = computeTimes('2026-11-17');
    for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      expect(computeTimes('2026-11-17')).toEqual(base);
    }
  });

  it('apply per-prayer offsets', () => {
    const cfg = { latitude: 36.843, longitude: 10.196, fajrAngle: 18, ishaAngle: 18,
      offsets: { fajr: 2, sunrise: 0, dhuhr: -1, asr: 0, maghrib: 0, isha: 0 } };
    const base = computeTimes('2026-11-17');
    const tuned = computeTimes('2026-11-17', cfg);
    expect(tuned.fajr - base.fajr).toBe(2 * 60000);
    expect(tuned.dhuhr - base.dhuhr).toBe(-60000);
    expect(tuned.asr - base.asr).toBe(0);
  });
});

describe('status', () => {
  it('uses the Tunis date, not UTC', () => {
    // 23:30 UTC on the 17th is already 00:30 on the 18th in Tunis
    expect(localDate(new Date('2026-11-17T23:30:00Z'))).toBe('2026-11-18');
    expect(formatTime(new Date('2026-11-17T23:30:00Z'))).toBe('00:30');
  });

  it('finds current and next prayer', () => {
    const s = getStatus(tunis('2026-11-17', '13:00:00'));
    expect(s.current).toBe('dhuhr');
    expect(s.next.name).toBe('asr');
    expect(formatTime(s.next.time)).toMatch(/^14:4[89]$/);
  });

  it('before Fajr there is no current prayer', () => {
    const s = getStatus(tunis('2026-11-17', '03:00:00'));
    expect(s.current).toBe(null);
    expect(s.next.name).toBe('fajr');
    expect(s.next.tomorrow).toBe(false);
  });

  it("after Isha the next prayer is tomorrow's Fajr", () => {
    const s = getStatus(tunis('2026-11-17', '22:00:00'));
    expect(s.current).toBe('isha');
    expect(s.next.name).toBe('fajr');
    expect(s.next.tomorrow).toBe(true);
    expect(localDate(s.next.time)).toBe('2026-11-18');
  });

  it('rolls over at midnight', () => {
    const before = getStatus(tunis('2026-11-17', '23:59:59'));
    const after = getStatus(tunis('2026-11-18', '00:00:01'));
    expect(after.date).toBe('2026-11-18');
    expect(after.next.time).toEqual(before.next.time);
  });
});

describe('helpers', () => {
  it('formatCountdown', () => {
    expect(formatCountdown(3725000)).toBe('1:02:05');
    expect(formatCountdown(65000)).toBe('1:05');
    expect(formatCountdown(-5)).toBe('0:00');
  });

  it('addDays crosses months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
