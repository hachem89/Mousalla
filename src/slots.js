import config from './config.js';
import { localDate, formatTime } from './prayer.js';

const MINUTE = 60000;
export const JOIN_AHEAD_MS = 2 * 3600 * 1000; // the server accepts slots up to 2 hours ahead

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

// Slots from the adhan to the end of the window, without the ones already over.
export function buildSlots(prayer, now, cfg = config) {
  const key = prayerKey(prayer);
  const startAt = prayer.time.getTime();
  const windowEnd = startAt + cfg.windows[prayer.name] * MINUTE;
  const slots = [];
  for (let start = startAt; start < windowEnd; start += cfg.slotMinutes * MINUTE) {
    const end = Math.min(start + cfg.slotMinutes * MINUTE, windowEnd);
    if (end <= now) continue;
    slots.push({
      id: `${key}:${formatTime(new Date(start))}`,
      start: new Date(start),
      end: new Date(end),
      isNow: start <= now,
      canJoin: start - now <= JOIN_AHEAD_MS,
    });
  }
  return slots;
}
