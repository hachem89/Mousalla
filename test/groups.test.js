import { describe, it, expect } from 'vitest';
import { getStatus, formatTime } from '../src/prayer.js';
import {
  boardPrayer, prayerKey, groupStart, listGroups, comingGroupId, checkOwnTime, nearbyGroup,
} from '../src/groups.js';

const tunis = (hms, date = '2026-11-17') => new Date(`${date}T${hms}+01:00`);
const at = (hms) => tunis(hms).getTime();
const dhuhr = { name: 'dhuhr', time: tunis('12:04:00') }; // Asr is at 14:48, so Dhuhr's window ends at 14:43
const MAIN = '2026-11-17:dhuhr:12:04';

describe('board prayer', () => {
  const board = (hms, date) => {
    const now = tunis(hms, date);
    return boardPrayer(getStatus(now), now.getTime());
  };

  it('is the current prayer until 5 minutes before the next one', () => {
    expect(board('12:30:00').name).toBe('dhuhr');
    expect(board('14:42:59').name).toBe('dhuhr');
  });

  it('is the next prayer in the last 5 minutes before it', () => {
    expect(board('14:43:00').name).toBe('asr');
  });

  it('Fajr ends 5 minutes before sunrise (06:59), then the board shows Dhuhr', () => {
    expect(board('06:50:00').name).toBe('fajr');
    expect(board('06:55:00').name).toBe('dhuhr');
  });

  it('Isha lasts until 5 minutes before the next Fajr', () => {
    expect(prayerKey(board('22:00:00'))).toBe('2026-11-17:isha');
    expect(prayerKey(board('05:24:00', '2026-11-18'))).toBe('2026-11-17:isha');
    expect(prayerKey(board('05:26:00', '2026-11-18'))).toBe('2026-11-18:fajr');
  });
});

describe('groups', () => {
  const data = {
    groups: {
      '2026-11-17:dhuhr:12:40': { boys: 1, girls: false, coming: false },
      '2026-11-17:dhuhr:12:07': { boys: 2, girls: true, coming: true },
      '2026-11-17:asr:14:48': { boys: 5, girls: false, coming: false },
    },
  };

  it('reads the start time from the id', () => {
    expect(groupStart('2026-11-17:dhuhr:12:07')).toEqual(tunis('12:07:00'));
  });

  it('always has the main group at the adhan, even when empty', () => {
    const g = listGroups(dhuhr, null, at('11:50:00'));
    expect(g).toEqual([{ id: MAIN, start: tunis('12:04:00'), started: false, boys: 0, girls: false, coming: false }]);
  });

  it('lists the groups of this prayer by time', () => {
    const g = listGroups(dhuhr, data, at('12:10:00'));
    expect(g.map((x) => x.id)).toEqual([MAIN, '2026-11-17:dhuhr:12:07', '2026-11-17:dhuhr:12:40']);
    expect(g[1]).toMatchObject({ boys: 2, girls: true, coming: true, started: true });
    expect(g[2].started).toBe(false);
  });

  it('ignores groups outside the prayer time (before the adhan or after the window)', () => {
    const d = { groups: {
      '2026-11-17:dhuhr:11:50': { boys: 2, girls: true, coming: false },
      '2026-11-17:dhuhr:14:43': { boys: 1, girls: false, coming: false },
      '2026-11-17:dhuhr:14:42': { boys: 1, girls: false, coming: false },
    } };
    const g = listGroups(dhuhr, d, at('12:55:00'));
    expect(g.map((x) => x.id)).toEqual(['2026-11-17:dhuhr:14:42']);
  });

  it('drops groups that are over, the main group too', () => {
    const g = listGroups(dhuhr, data, at('12:22:00'));
    expect(g.map((x) => x.id)).toEqual(['2026-11-17:dhuhr:12:40']);
  });

  it('suggests the closest group within 10 minutes', () => {
    const g = listGroups(dhuhr, data, at('12:00:00'));
    expect(nearbyGroup(tunis('12:15:00'), g).id).toBe('2026-11-17:dhuhr:12:07');
    expect(nearbyGroup(tunis('12:35:00'), g).id).toBe('2026-11-17:dhuhr:12:40');
    expect(nearbyGroup(tunis('12:25:00'), g)).toBe(null);
  });
});

describe("I'm coming", () => {
  const groupsAt = (hms, d = null) => listGroups(dhuhr, d, at(hms));

  it('joins the group praying now', () => {
    expect(comingGroupId(dhuhr, groupsAt('12:06:00'), at('12:06:00'))).toBe(MAIN);
  });

  it('joins the group that started most recently', () => {
    const d = { groups: { '2026-11-17:dhuhr:12:10': { boys: 1, girls: false, coming: false } } };
    expect(comingGroupId(dhuhr, groupsAt('12:12:00', d), at('12:12:00'))).toBe('2026-11-17:dhuhr:12:10');
  });

  it('starts a new group when the group praying now ends before you can arrive', () => {
    // main group 12:04 ends 12:19; at 12:17:30 you would arrive after it ended
    expect(comingGroupId(dhuhr, groupsAt('12:17:00'), at('12:17:00'))).toBe(MAIN);
    expect(comingGroupId(dhuhr, groupsAt('12:17:30'), at('12:17:30'))).toBe('2026-11-17:dhuhr:12:19');
  });

  it('prefers my own group when it is still on', () => {
    const d = { groups: { '2026-11-17:dhuhr:12:10': { boys: 1, girls: false, coming: false } } };
    expect(comingGroupId(dhuhr, groupsAt('12:12:00', d), at('12:12:00'), MAIN)).toBe(MAIN);
    expect(comingGroupId(dhuhr, groupsAt('12:12:00', d), at('12:12:00'))).toBe('2026-11-17:dhuhr:12:10');
  });

  it('starts a new group in 2 minutes when nobody is praying now', () => {
    expect(comingGroupId(dhuhr, groupsAt('12:40:30'), at('12:40:30'))).toBe('2026-11-17:dhuhr:12:42');
  });

  it('is not possible before the adhan or after the window', () => {
    expect(comingGroupId(dhuhr, groupsAt('12:00:00'), at('12:00:00'))).toBe(null);
    expect(comingGroupId(dhuhr, groupsAt('14:43:00'), at('14:43:00'))).toBe(null);
    expect(comingGroupId(dhuhr, groupsAt('14:41:00'), at('14:41:00'))).toBe(null);
    expect(comingGroupId(dhuhr, groupsAt('14:40:00'), at('14:40:00'))).toBe('2026-11-17:dhuhr:14:42');
  });
});

describe('own time', () => {
  const check = (value, hms) => checkOwnTime(value, dhuhr, at(hms));

  it('accepts a time inside the prayer window, up to 5 minutes before Asr', () => {
    expect(formatTime(check('12:40', '12:10:00').start)).toBe('12:40');
    expect(formatTime(check('12:10', '12:10:30').start)).toBe('12:10');
  });

  it('refuses times outside the window, so Dhuhr cannot be announced at Asr time', () => {
    expect(check('12:00', '11:30:00').error).toBe('outside');
    expect(check('14:43', '13:10:00').error).toBe('outside');
    expect(check('14:50', '13:10:00').error).toBe('outside');
    expect(formatTime(check('14:42', '13:10:00').start)).toBe('14:42');
  });

  it('accepts Isha times after midnight, on the next day', () => {
    const isha = { name: 'isha', time: tunis('18:38:00') };
    const r = checkOwnTime('00:30', isha, at('23:00:00'));
    expect(r.start).toEqual(tunis('00:30:00', '2026-11-18'));
    expect(groupStart('2026-11-17:isha:00:30')).toEqual(tunis('00:30:00', '2026-11-18'));
    expect(checkOwnTime('05:25', isha, at('23:00:00')).error).toBe('outside'); // Fajr is 05:30
  });

  it('refuses past times, empty input and times too far ahead', () => {
    expect(check('12:20', '12:30:00').error).toBe('past');
    expect(check('', '12:30:00').error).toBe('empty');
    expect(check('25:00', '12:30:00').error).toBe('empty');
    expect(check('13:15', '11:00:00').error).toBe('too_early');
  });
});
