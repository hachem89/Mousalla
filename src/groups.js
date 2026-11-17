import config from './config.js';
import { localDate, formatTime } from './prayer.js';

const MINUTE = 60000;
export const JOIN_AHEAD_MS = 2 * 3600 * 1000; // the server accepts times up to 2 hours ahead

// The prayer the board is about: the current one while people can still come,
// otherwise the next one.
export function boardPrayer(status, now, cfg = config) {
  if (status.current) {
    const time = status.times[status.current];
    if (now < time.getTime() + cfg.windows[status.current] * MINUTE) return { name: status.current, time };
  }
  return { name: status.next.name, time: status.next.time };
}

// From the adhan to the end of the time people can still come and pray together.
export function prayerWindow(prayer, cfg = config) {
  const start = prayer.time.getTime();
  return { start, end: start + cfg.windows[prayer.name] * MINUTE };
}

// "2026-11-17:dhuhr"
export function prayerKey(prayer) {
  return `${localDate(prayer.time)}:${prayer.name}`;
}

// "2026-11-17:dhuhr:12:07"
export function groupId(prayer, start) {
  return `${prayerKey(prayer)}:${formatTime(start)}`;
}

// Start of a group from its id. Tunis is UTC+1 all year.
export function groupStart(id) {
  const [date, , hh, mm] = id.split(':');
  return new Date(`${date}T${hh}:${mm}:00+01:00`);
}

// Groups of this prayer, by time, without the ones already over.
// The main group (at the adhan) is always there, even when nobody joined it yet.
// Groups outside the prayer's time (before the adhan or after its window) are ignored.
export function listGroups(prayer, data, now, cfg = config) {
  const prefix = `${prayerKey(prayer)}:`;
  const mainId = groupId(prayer, prayer.time);
  const { start, end } = prayerWindow(prayer, cfg);
  const groups = { [mainId]: { boys: 0, girls: false, wait: null }, ...data?.groups };
  return Object.entries(groups)
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, counts]) => ({ ...counts, id, start: groupStart(id) }))
    .filter((g) => g.start.getTime() >= start && g.start.getTime() < end)
    .filter((g) => g.start.getTime() + cfg.groupMinutes * MINUTE > now)
    .map((g) => ({ ...g, started: g.start.getTime() <= now }))
    .sort((a, b) => a.start - b.start);
}

// Where "I'm coming in N min" goes: the group that started most recently,
// or, when nobody is praying now, a new group starting in N minutes.
// null when the prayer has not started yet or its window is over.
export function comingGroupId(prayer, groups, eta, now, cfg = config) {
  const { start, end } = prayerWindow(prayer, cfg);
  if (now < start || now >= end) return null;
  const active = groups.filter((g) => g.started).at(-1);
  if (active) return active.id;
  const at = Math.floor(now / MINUTE) * MINUTE + eta * MINUTE;
  return at < end ? groupId(prayer, new Date(at)) : null;
}

// A time typed by the user ("12:40") -> { start } or { error }.
// It must be inside the prayer's window, not in the past, and at most 2 hours ahead.
export function checkOwnTime(value, prayer, now, cfg = config) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return { error: 'empty' };
  const start = new Date(`${localDate(prayer.time)}T${value}:00+01:00`);
  const { start: from, end } = prayerWindow(prayer, cfg);
  if (start < from || start >= end) return { error: 'outside' };
  if (start.getTime() < Math.floor(now / MINUTE) * MINUTE) return { error: 'past' };
  if (start - now > JOIN_AHEAD_MS) return { error: 'too_early' };
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
