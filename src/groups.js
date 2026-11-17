import config from './config.js';
import { localDate, formatTime, computeTimes, addDays } from './prayer.js';

const MINUTE = 60000;

// The prayer the board is about: the current one while people can still come,
// otherwise the next one.
export function boardPrayer(status, now, cfg = config) {
  // After midnight and before Fajr, the current prayer is yesterday's Isha.
  const current = status.current
    ? { name: status.current, time: status.times[status.current] }
    : { name: 'isha', time: computeTimes(addDays(status.date, -1), cfg).isha };
  if (now < prayerWindow(current, cfg).end) return current;
  return { name: status.next.name, time: status.next.time };
}

// What ends each prayer's time: the next prayer (Fajr ends at sunrise, Isha at the next Fajr).
const ENDS_AT = { fajr: 'sunrise', dhuhr: 'asr', asr: 'maghrib', maghrib: 'isha' };
const windowCache = new Map();

// From the adhan until 5 minutes before the next prayer: the time people can pray together.
export function prayerWindow(prayer, cfg = config) {
  const start = prayer.time.getTime();
  const cacheKey = `${start}|${prayer.name}|${cfg.endBeforeNextMinutes}`;
  if (!windowCache.has(cacheKey)) {
    const date = localDate(prayer.time);
    const next = prayer.name === 'isha'
      ? computeTimes(addDays(date, 1), cfg).fajr
      : computeTimes(date, cfg)[ENDS_AT[prayer.name]];
    if (windowCache.size > 50) windowCache.clear();
    windowCache.set(cacheKey, { start, end: next.getTime() - cfg.endBeforeNextMinutes * MINUTE });
  }
  return windowCache.get(cacheKey);
}

// "2026-11-17:dhuhr"
export function prayerKey(prayer) {
  return `${localDate(prayer.time)}:${prayer.name}`;
}

// "2026-11-17:dhuhr:12:07"
export function groupId(prayer, start) {
  return `${prayerKey(prayer)}:${formatTime(start)}`;
}

// Start of a group from its id ("2026-11-17:isha:01:00"). Tunis is UTC+1 all year.
// The date is the day of the adhan; Isha can go past midnight, so an Isha time
// before noon is on the next day.
export function groupStart(id) {
  const [date, name, hh, mm] = id.split(':');
  const day = name === 'isha' && Number(hh) < 12 ? addDays(date, 1) : date;
  return new Date(`${day}T${hh}:${mm}:00+01:00`);
}

// Groups of this prayer, by time, without the ones already over.
// The main group (at the adhan) is always there, even when nobody joined it yet.
// Groups outside the prayer's time (before the adhan or after its window) are ignored.
export function listGroups(prayer, data, now, cfg = config) {
  const prefix = `${prayerKey(prayer)}:`;
  const mainId = groupId(prayer, prayer.time);
  const { start, end } = prayerWindow(prayer, cfg);
  const groups = { [mainId]: { boys: 0, boysComing: 0, girls: false, coming: false }, ...data?.groups };
  return Object.entries(groups)
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, counts]) => ({ ...counts, id, start: groupStart(id) }))
    .filter((g) => g.start.getTime() >= start && g.start.getTime() < end)
    .filter((g) => g.start.getTime() + cfg.groupMinutes * MINUTE > now)
    .map((g) => ({ ...g, started: g.start.getTime() <= now }))
    .sort((a, b) => a.start - b.start);
}

// Where "I'm coming" goes. "I'm coming" means arriving in about 2 minutes, so it only
// joins a group that has started and is still on by then: my group if it is one of
// them, otherwise the one that started most recently. When there is none, it starts
// a new group in 2 minutes (like a second jama'ah), if that is still inside the
// prayer's window. null when the prayer has not started yet or it is too late.
export function comingGroupId(prayer, groups, now, mineId = null, cfg = config) {
  const { start, end } = prayerWindow(prayer, cfg);
  if (now < start || now >= end) return null;
  const arrival = now + cfg.comingMinutes * MINUTE;
  const open = groups.filter((g) => g.started && g.start.getTime() + cfg.groupMinutes * MINUTE >= arrival);
  const target = open.find((g) => g.id === mineId) ?? open.at(-1);
  if (target) return target.id;
  const at = Math.floor(now / MINUTE) * MINUTE + cfg.comingMinutes * MINUTE;
  return at < end ? groupId(prayer, new Date(at)) : null;
}

// A time typed by the user ("12:40") -> { start } or { error }.
// It must be inside the prayer's window and not in the past.
export function checkOwnTime(value, prayer, now, cfg = config) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return { error: 'empty' };
  const start = groupStart(`${prayerKey(prayer)}:${value}`);
  const { start: from, end } = prayerWindow(prayer, cfg);
  if (start < from || start >= end) return { error: 'outside' };
  if (start.getTime() < Math.floor(now / MINUTE) * MINUTE) return { error: 'past' };
  return { start };
}

// The existing group closest to a time, if it is within a few minutes of it.
export function nearbyGroup(start, groups, cfg = config) {
  let best = null;
  for (const g of groups) {
    const distance = Math.abs(g.start - start);
    if (distance <= cfg.suggestJoinMinutes * MINUTE && (!best || distance < Math.abs(best.start - start))) best = g;
  }
  return best;
}
