// In-memory board. Nothing here is ever written to disk.
import appConfig from '../src/config.js';

const PRAYER = '(\\d{4}-\\d{2}-\\d{2}):(fajr|dhuhr|asr|maghrib|isha)';
const PRAYER_RE = new RegExp(`^${PRAYER}$`);
const SLOT_RE = new RegExp(`^${PRAYER}:([01]\\d|2[0-3]):([0-5]\\d)$`);

// Tunis is UTC+1 all year (no daylight saving).
const TUNIS_OFFSET = '+01:00';
const MAX_DISTANCE = 2 * 3600 * 1000;

const MINUTE = 60000;

export const SECTIONS = ['boy', 'girl'];
export const STATES = ['joined', 'going', 'here'];

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
// further than 2 hours from now, or already over.
export function parseSlot(id, now, slotMinutes = appConfig.slotMinutes) {
  if (typeof id !== 'string') return null;
  const m = SLOT_RE.exec(id);
  if (!m || !validDate(m[1])) return null;
  const start = Date.parse(`${m[1]}T${m[3]}:${m[4]}:00${TUNIS_OFFSET}`);
  const end = start + slotMinutes * MINUTE;
  if (Math.abs(start - now) > MAX_DISTANCE || end <= now) return null;
  return { id, prayer: `${m[1]}:${m[2]}`, start, end };
}

export function createBoard({ maxEntries, cfg = appConfig }) {
  // key "tokenHash|prayer" -> { section, slotId, state, arriveAt, expiresAt }
  // One key per device and prayer, so a device has at most one spot per prayer.
  const entries = new Map();
  const keyOf = (tokenHash, prayer) => `${tokenHash}|${prayer}`;

  function sweep(now) {
    for (const [key, e] of entries) if (e.expiresAt <= now) entries.delete(key);
  }

  // Join a slot, or move to it if already in another slot of the same prayer.
  // state: "joined" (coming later), "going" (on the way, with eta minutes) or "here".
  // Every spot expires when its slot ends, or earlier for "going" and "here".
  function join(tokenHash, section, slot, now, state = 'joined', eta = 0) {
    sweep(now);
    const key = keyOf(tokenHash, slot.prayer);
    if (!entries.has(key) && entries.size >= maxEntries) return false;
    let expiresAt = slot.end;
    let arriveAt = null;
    if (state === 'going') {
      arriveAt = now + eta * MINUTE;
      expiresAt = Math.min(slot.end, arriveAt + cfg.goingGraceMinutes * MINUTE);
    } else if (state === 'here') {
      expiresAt = Math.min(slot.end, now + cfg.hereMinutes * MINUTE);
    }
    entries.set(key, { section, slotId: slot.id, state, arriveAt, expiresAt });
    return true;
  }

  function cancel(tokenHash, prayer, now) {
    sweep(now);
    entries.delete(keyOf(tokenHash, prayer));
  }

  // What anyone may see for one prayer, per slot:
  //   boys:  number of boys (joined, going or here)
  //   here:  number of boys who said "I'm here"
  //   girls: true/false only. Girls are never counted.
  //   wait:  minutes until the last person on the way arrives, or null if nobody is on the way
  function view(tokenHash, prayer, now) {
    sweep(now);
    const slots = {};
    for (const [key, e] of entries) {
      if (!key.endsWith(`|${prayer}`)) continue;
      const s = (slots[e.slotId] ??= { boys: 0, here: 0, girls: false, wait: null });
      if (e.section === 'boy') {
        s.boys += 1;
        if (e.state === 'here') s.here += 1;
      } else {
        s.girls = true;
      }
      if (e.state === 'going') {
        s.wait = Math.max(s.wait ?? 0, Math.ceil(Math.max(0, e.arriveAt - now) / MINUTE));
      }
    }
    const e = entries.get(keyOf(tokenHash, prayer));
    const mine = e ? { slotId: e.slotId, state: e.state } : null;
    return { slots, mine };
  }

  return { join, cancel, view, sweep, get size() { return entries.size; } };
}
