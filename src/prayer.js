import { Coordinates, CalculationMethod, PrayerTimes, Madhab, Rounding } from 'adhan';
import config from './config.js';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const TIMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function parts(fmt, date) {
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

// "YYYY-MM-DD" of the given instant, in Tunis.
export function localDate(now = new Date()) {
  const p = parts(dateFmt, now);
  return `${p.year}-${p.month}-${p.day}`;
}

// "HH:MM" of the given instant, in Tunis.
export function formatTime(date) {
  const p = parts(timeFmt, date);
  return `${p.hour}:${p.minute}`;
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Prayer times for a Tunis calendar day ("YYYY-MM-DD"), as Date objects.
export function computeTimes(dateStr, cfg = config) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const params = CalculationMethod.Other();
  params.fajrAngle = cfg.fajrAngle;
  params.ishaAngle = cfg.ishaAngle;
  params.madhab = Madhab.Shafi;
  params.rounding = Rounding.Nearest;

  // adhan reads the local year/month/day of this date, so build it locally (at noon)
  // to get the right day whatever the phone's timezone is.
  const pt = new PrayerTimes(new Coordinates(cfg.latitude, cfg.longitude), new Date(y, m - 1, d, 12), params);

  const out = {};
  for (const k of TIMES) out[k] = new Date(pt[k].getTime() + (cfg.offsets[k] || 0) * 60000);
  return out;
}

// What is happening right now: today's times, the current prayer (or null before Fajr)
// and the next prayer (tomorrow's Fajr after Isha).
export function getStatus(now = new Date(), cfg = config) {
  const date = localDate(now);
  const times = computeTimes(date, cfg);
  let current = null;
  let next = null;
  for (const name of PRAYERS) {
    if (times[name] <= now) current = name;
    else if (!next) next = { name, time: times[name], tomorrow: false };
  }
  if (!next) next = { name: 'fajr', time: computeTimes(addDays(date, 1), cfg).fajr, tomorrow: true };
  return { date, times, current, next };
}

// 3725000 ms -> "1:02:05"
export function formatCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
