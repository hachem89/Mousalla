import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './style.css';
import t from './strings.js';
import config from './config.js';
import { TIMES, getStatus, formatTime, formatCountdown } from './prayer.js';

const app = document.getElementById('app');

app.innerHTML = `
  <header class="top">
    <img class="logo" src="/icon.svg" alt="" width="40" height="40" />
    <div>
      <h1>${t.appName}</h1>
      <p class="place">${t.place}</p>
    </div>
  </header>

  <main>
    <section class="card next" aria-labelledby="next-title">
      <p class="label" id="next-title">${t.nextPrayer}</p>
      <p class="next-name"><span id="next-name"></span> <span class="next-time" id="next-time"></span></p>
      <p class="countdown" id="countdown" role="timer"></p>
      <p class="current" id="current"></p>
    </section>

    <section class="card" aria-labelledby="times-title">
      <h2 class="label" id="times-title">${t.todayTimes}</h2>
      <ul class="times" id="times"></ul>
    </section>
  </main>

  <footer class="foot">
    <span id="date"></span><br />${t.footer}
  </footer>
`;

const $ = (id) => document.getElementById(id);
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: config.timeZone,
});

let lastKey = '';

function render() {
  const now = new Date();
  const s = getStatus(now);
  const left = formatCountdown(s.next.time - now);
  const nextName = t.names[s.next.name];

  $('countdown').textContent = `${t.in} ${left}`;
  $('countdown').setAttribute('aria-label', t.countdownLabel(nextName, left));

  // The rest only changes when the prayer changes.
  const key = `${s.date}|${s.current}|${s.next.name}`;
  if (key === lastKey) return;
  lastKey = key;

  $('next-name').textContent = nextName;
  $('next-time').textContent = formatTime(s.next.time) + (s.next.tomorrow ? ` (${t.tomorrow})` : '');
  $('current').textContent = `${t.now}: ${s.current ? t.names[s.current] : t.noCurrent}`;
  $('date').textContent = dateFmt.format(now);

  $('times').innerHTML = TIMES.map((name) => {
    const isNow = name === s.current;
    return `<li class="${isNow ? 'is-now' : ''}${name === 'sunrise' ? ' is-minor' : ''}"${isNow ? ' aria-current="time"' : ''}>
      <span class="t-name">${t.names[name]}${isNow ? ` <span class="tag">${t.nowTag}</span>` : ''}</span>
      <span class="t-time">${formatTime(s.times[name])}</span>
    </li>`;
  }).join('');
}

render();
setInterval(render, 1000);
