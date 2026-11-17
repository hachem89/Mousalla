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

// Groups of this prayer from the server data, by time, without the ones already over.
export function listGroups(prayer, data, now, cfg = config) {
  const prefix = `${prayerKey(prayer)}:`;
  return Object.entries(data?.groups ?? {})
    .filter(([id]) => id.startsWith(prefix))
    .map(([id, counts]) => ({ ...counts, id, start: groupStart(id) }))
    .filter((g) => g.start.getTime() + cfg.groupMinutes * MINUTE > now)
    .map((g) => ({ ...g, started: g.start.getTime() <= now }))
    .sort((a, b) => a.start - b.start);
}

// Times someone can pick: "now" once the prayer has started (or the adhan before),
// then every 5 minutes on the clock until the end of the prayer's window.
// Only times up to 2 hours ahead.
export function timeChoices(prayer, now, cfg = config) {
  const adhan = prayer.time.getTime();
  const end = adhan + cfg.windows[prayer.name] * MINUTE;
  const step = cfg.pickStepMinutes * MINUTE;
  const first = now >= adhan ? Math.floor(now / MINUTE) * MINUTE : adhan;
  if (first >= end || first - now > JOIN_AHEAD_MS) return [];

  const times = [first];
  // Leave at least 3 minutes between the first choice and the next one.
  for (let t = Math.ceil((first + 3 * MINUTE) / step) * step; t < end && t - now <= JOIN_AHEAD_MS; t += step) {
    times.push(t);
  }
  return times.map((t, i) => ({
    id: groupId(prayer, new Date(t)),
    start: new Date(t),
    isNow: i === 0 && now >= adhan,
  }));
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
