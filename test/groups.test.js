import { describe, it, expect } from 'vitest';
import { getStatus, formatTime } from '../src/prayer.js';
import { boardPrayer, prayerKey, groupStart, listGroups, timeChoices, nearbyGroup } from '../src/groups.js';

const tunis = (hms, date = '2026-11-17') => new Date(`${date}T${hms}+01:00`);
const dhuhr = { name: 'dhuhr', time: tunis('12:04:00') }; // window: 75 min, until 13:19

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
    expect(prayerKey(at('22:00:00'))).toBe('2026-11-18:fajr');
  });
});

describe('time choices', () => {
  const labels = (choices) => choices.map((c) => formatTime(c.start));

  it('before the adhan: the adhan, then every 5 minutes on the clock', () => {
    const c = timeChoices(dhuhr, tunis('11:30:00').getTime());
    expect(labels(c)).toEqual(['12:04', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40',
      '12:45', '12:50', '12:55', '13:00', '13:05', '13:10', '13:15']);
    expect(c[0].isNow).toBe(false);
    expect(c[0].id).toBe('2026-11-17:dhuhr:12:04');
  });

  it('after the adhan: "now" first, then at least 3 minutes later', () => {
    expect(labels(timeChoices(dhuhr, tunis('12:22:40').getTime())).slice(0, 3)).toEqual(['12:22', '12:25', '12:30']);
    const c = timeChoices(dhuhr, tunis('12:23:10').getTime());
    expect(labels(c).slice(0, 3)).toEqual(['12:23', '12:30', '12:35']);
    expect(c[0].isNow).toBe(true);
  });

  it('stops at the end of the window', () => {
    expect(labels(timeChoices(dhuhr, tunis('13:12:00').getTime()))).toEqual(['13:12', '13:15']);
    expect(timeChoices(dhuhr, tunis('13:19:00').getTime())).toEqual([]);
  });

  it('only offers times up to 2 hours ahead', () => {
    expect(timeChoices(dhuhr, tunis('10:00:00').getTime())).toEqual([]);
    expect(labels(timeChoices(dhuhr, tunis('10:12:00').getTime()))).toEqual(['12:04', '12:10']);
  });
});

describe('groups', () => {
  const data = {
    groups: {
      '2026-11-17:dhuhr:12:40': { boys: 1, here: 0, girls: false, wait: null },
      '2026-11-17:dhuhr:12:07': { boys: 2, here: 1, girls: true, wait: 3 },
      '2026-11-17:asr:14:48': { boys: 5, here: 0, girls: false, wait: null },
    },
  };

  it('reads the start time from the id', () => {
    expect(groupStart('2026-11-17:dhuhr:12:07')).toEqual(tunis('12:07:00'));
  });

  it('lists the groups of this prayer by time', () => {
    const g = listGroups(dhuhr, data, tunis('12:10:00').getTime());
    expect(g.map((x) => x.id)).toEqual(['2026-11-17:dhuhr:12:07', '2026-11-17:dhuhr:12:40']);
    expect(g[0]).toMatchObject({ boys: 2, girls: true, wait: 3, started: true });
    expect(g[1].started).toBe(false);
  });

  it('drops groups that are over', () => {
    const g = listGroups(dhuhr, data, tunis('12:22:00').getTime());
    expect(g.map((x) => x.id)).toEqual(['2026-11-17:dhuhr:12:40']);
  });

  it('suggests the closest group within 10 minutes', () => {
    const g = listGroups(dhuhr, data, tunis('12:00:00').getTime());
    expect(nearbyGroup(tunis('12:15:00'), g).id).toBe('2026-11-17:dhuhr:12:07');
    expect(nearbyGroup(tunis('12:35:00'), g).id).toBe('2026-11-17:dhuhr:12:40');
    expect(nearbyGroup(tunis('12:25:00'), g)).toBe(null);
  });
});
