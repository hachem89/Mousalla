// In-memory board. Nothing here is ever written to disk.
import appConfig from '../src/config.js';

const PRAYER = '(\\d{4}-\\d{2}-\\d{2}):(fajr|dhuhr|asr|maghrib|isha)';
const PRAYER_RE = new RegExp(`^${PRAYER}$`);
const GROUP_RE = new RegExp(`^${PRAYER}:([01]\\d|2[0-3]):([0-5]\\d)$`);

// Tunis is UTC+1 all year (no daylight saving).
const TUNIS_OFFSET = '+01:00';
const MAX_DISTANCE = 2 * 3600 * 1000;

const MINUTE = 60000;

export const SECTIONS = ['boy', 'girl'];
export const STATES = ['joined', 'going'];

function validDate(date) {
  const d = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function isPrayerKey(key) {
  if (typeof key !== 'string') return false;
  const m = PRAYER_RE.exec(key);
  return Boolean(m && validDate(m[1]));
}

// "2026-11-17:dhuhr:12:15" -> { id, prayer, start, end }, or null if invalid,
// further than 2 hours from now, or already over. Any minute is allowed.
export function parseGroup(id, now, groupMinutes = appConfig.groupMinutes) {
  if (typeof id !== 'string') return null;
  const m = GROUP_RE.exec(id);
  if (!m || !validDate(m[1])) return null;
  // The date is the day of the adhan; Isha can go past midnight, so an Isha
  // time before noon is on the next day.
  const nextDay = m[2] === 'isha' && Number(m[3]) < 12 ? 24 * 60 * MINUTE : 0;
  const start = Date.parse(`${m[1]}T${m[3]}:${m[4]}:00${TUNIS_OFFSET}`) + nextDay;
  const end = start + groupMinutes * MINUTE;
  if (Math.abs(start - now) > MAX_DISTANCE || end <= now) return null;
  return { id, prayer: `${m[1]}:${m[2]}`, start, end };
}

export function createBoard({ maxEntries, cfg = appConfig }) {
  // key "tokenHash|prayer" -> { section, groupId, state, friends, expiresAt }
  // One key per device and prayer, so a device has at most one spot per prayer.
  const entries = new Map();
  const keyOf = (tokenHash, prayer) => `${tokenHash}|${prayer}`;

  function sweep(now) {
    for (const [key, e] of entries) if (e.expiresAt <= now) entries.delete(key);
  }

  // Join a group (creating it if nobody picked that time yet), or move to it
  // if already in another group of the same prayer.
  // state: "joined" (will pray with this group) or "going" ("I'm coming, wait for me").
  // friends: how many friends come along (same section).
  // Every spot expires when its group ends, or earlier for "going".
  function join(tokenHash, section, group, now, state = 'joined', friends = 0) {
    sweep(now);
    const key = keyOf(tokenHash, group.prayer);
    if (!entries.has(key) && entries.size >= maxEntries) return false;
    const expiresAt = state === 'going'
      ? Math.min(group.end, now + cfg.comingExpiresMinutes * MINUTE)
      : group.end;
    entries.set(key, { section, groupId: group.id, state, friends, expiresAt });
    return true;
  }

  function cancel(tokenHash, prayer, now) {
    sweep(now);
    entries.delete(keyOf(tokenHash, prayer));
  }

  // What anyone may see for one prayer, per group:
  //   boys:  number of boys (joined or coming), friends included
  //   boysComing: how many of those boys are still on their way
  //   girls: true/false only. Girls are never counted, nor their friends.
  //   coming: true/false, someone said "I'm coming, wait for me"
  function view(tokenHash, prayer, now) {
    sweep(now);
    const groups = {};
    for (const [key, e] of entries) {
      if (!key.endsWith(`|${prayer}`)) continue;
      const s = (groups[e.groupId] ??= { boys: 0, boysComing: 0, girls: false, coming: false });
      if (e.section === 'boy') {
        s.boys += 1 + e.friends;
        if (e.state === 'going') s.boysComing += 1 + e.friends;
      } else {
        s.girls = true;
      }
      if (e.state === 'going') s.coming = true;
    }
    const e = entries.get(keyOf(tokenHash, prayer));
    const mine = e ? { groupId: e.groupId, state: e.state, friends: e.friends } : null;
    return { groups, mine };
  }

  return { join, cancel, view, sweep, get size() { return entries.size; } };
}
