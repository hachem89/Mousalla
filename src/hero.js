// The prayer card at the top: the current prayer big, the next one small.
import t from './strings.js';
import config from './config.js';
import { formatTime, formatCountdown } from './prayer.js';

const MINUTE = 60000;
const $ = (id) => document.getElementById(id);
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: config.timeZone,
});

let lastKey = '';

export function renderHero(s, now) {
  // Fajr's time ends at sunrise; after that, and before Fajr, there is no current
  // prayer, so the next prayer is shown big with a countdown.
  const current = s.current === 'fajr' && now >= s.times.sunrise ? null : s.current;
  const left = formatCountdown(s.next.time - now);
  const nextName = t.names[s.next.name];

  if (current) {
    const since = Math.floor((now - s.times[current]) / MINUTE);
    $('hero-sub').textContent = t.startedAgo(since);
    $('hero-sub').classList.remove('countdown');
    $('hero-sub').removeAttribute('role');
    $('next-line').hidden = false;
    $('next-line').textContent = t.nextLine(nextName, formatTime(s.next.time), left)
      + (s.next.tomorrow ? ` (${t.tomorrow})` : '');
  } else {
    $('hero-sub').textContent = `${t.in} ${left}`;
    $('hero-sub').classList.add('countdown');
    $('hero-sub').setAttribute('role', 'timer');
    $('hero-sub').setAttribute('aria-label', t.countdownLabel(nextName, left));
    $('next-line').hidden = true;
  }

  // The rest only changes when the prayer changes.
  const key = `${s.date}|${current}|${s.next.name}`;
  if (key === lastKey) return;
  lastKey = key;
  const name = current ?? s.next.name;
  $('hero-label').textContent = current ? t.nowLabel : t.nextLabel;
  $('hero-name').textContent = t.names[name];
  $('hero-time').textContent = formatTime(current ? s.times[current] : s.next.time);
  $('hero-day').textContent = !current && s.next.tomorrow ? t.tomorrow : '';
  $('date').textContent = dateFmt.format(now);
}
