import { describe, it, expect } from 'vitest';
import { getStatus } from '../src/prayer.js';
import { boardPrayer, buildSlots, prayerKey } from '../src/slots.js';

const tunis = (hms, date = '2026-11-17') => new Date(`${date}T${hms}+01:00`);

describe('board prayer', () => {
  const at = (hms, date) => {
    const now = tunis(hms, date);
    return boardPrayer(getStatus(now), now.getTime());
  };

  it('is the current prayer while its window is open', () => {
    expect(at('12:30:00').name).toBe('dhuhr');
  });

  it('is the next prayer once the window is over', () => {
    expect(at('13:30:00').name).toBe('asr');
  });

  it("is tomorrow's Fajr late at night", () => {
    const p = at('22:00:00');
    expect(prayerKey(p)).toBe('2026-11-18:fajr');
  });

  it('is Fajr before dawn', () => {
    expect(prayerKey(at('03:00:00', '2026-11-18'))).toBe('2026-11-18:fajr');
  });
});

describe('slots', () => {
  const dhuhr = { name: 'dhuhr', time: tunis('12:04:00') };

  it('splits the window into 15 minute slots from the adhan', () => {
    const slots = buildSlots(dhuhr, tunis('11:30:00').getTime());
    expect(slots.map((s) => s.id)).toEqual([
      '2026-11-17:dhuhr:12:04', '2026-11-17:dhuhr:12:19', '2026-11-17:dhuhr:12:34',
      '2026-11-17:dhuhr:12:49', '2026-11-17:dhuhr:13:04',
    ]);
    expect(slots.every((s) => s.canJoin && !s.isNow)).toBe(true);
  });

  it('cuts the last slot at the end of the window', () => {
    const maghrib = { name: 'maghrib', time: tunis('17:09:00') };
    const slots = buildSlots(maghrib, tunis('17:00:00').getTime());
    expect(slots).toHaveLength(3);
    expect(slots[2].end - slots[2].start).toBe(10 * 60000);
  });

  it('drops past slots and marks the current one', () => {
    const slots = buildSlots(dhuhr, tunis('12:25:00').getTime());
    expect(slots[0].id).toBe('2026-11-17:dhuhr:12:19');
    expect(slots[0].isNow).toBe(true);
    expect(slots[1].isNow).toBe(false);
  });

  it('slots more than 2 hours ahead cannot be joined yet', () => {
    const slots = buildSlots(dhuhr, tunis('10:00:00').getTime());
    expect(slots.map((s) => s.canJoin)).toEqual([false, false, false, false, false]);
  });
});
