import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './style.css';
import t from './strings.js';
import config from './config.js';
import { TIMES, getStatus, formatTime, formatCountdown } from './prayer.js';
import { boardPrayer, buildSlots, prayerKey, JOIN_AHEAD_MS } from './slots.js';
import { getSection, setSection } from './device.js';
import { fetchBoard, joinSlot, cancelSpot } from './api.js';

const app = document.getElementById('app');

app.innerHTML = `
  <header class="top">
    <img class="logo" src="/icon.svg" alt="" width="40" height="40" />
    <div class="brand">
      <h1>${t.appName}</h1>
      <p class="place">${t.place}</p>
    </div>
    <button class="chip" id="open-settings" type="button" hidden></button>
  </header>

  <section class="ask" id="ask" hidden aria-labelledby="ask-title">
    <h2 id="ask-title">${t.askTitle}</h2>
    <div class="ask-buttons">
      <button class="btn btn-primary" type="button" data-section="boy">${t.boy}</button>
      <button class="btn btn-primary" type="button" data-section="girl">${t.girl}</button>
    </div>
    <p class="small">${t.askWhy}</p>
    <p class="small">${t.privacyNote}</p>
  </section>

  <main id="home" hidden>
    <section class="card next" aria-labelledby="next-title">
      <p class="label" id="next-title">${t.nextPrayer}</p>
      <p class="next-name"><span id="next-name"></span> <span class="next-time" id="next-time"></span></p>
      <p class="countdown" id="countdown" role="timer"></p>
      <p class="current" id="current"></p>
    </section>

    <section class="card" aria-labelledby="board-title">
      <h2 class="label" id="board-title"></h2>
      <p class="hint" id="hint" role="status" aria-live="polite"></p>
      <ul class="slots" id="slots"></ul>
    </section>

    <details class="card">
      <summary class="label">${t.todayTimes}</summary>
      <ul class="times" id="times"></ul>
    </details>
  </main>

  <dialog class="card dialog" id="settings" aria-labelledby="settings-title">
    <h2 class="label" id="settings-title">${t.settings}</h2>
    <p>${t.iAm}</p>
    <div class="ask-buttons">
      <button class="btn" type="button" data-section="boy">${t.boy}</button>
      <button class="btn" type="button" data-section="girl">${t.girl}</button>
    </div>
    <p class="small">${t.privacyNote}</p>
    <button class="btn btn-primary" type="button" id="close-settings">${t.close}</button>
  </dialog>

  <footer class="foot">
    <span id="date"></span><br />${t.footer}
  </footer>
`;

const $ = (id) => document.getElementById(id);
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: config.timeZone,
});

const state = {
  section: getSection(),
  key: null, // prayer the board is about, e.g. "2026-11-17:dhuhr"
  board: null, // { slots: { [slotId]: { boys, girls } }, mine }
  error: null,
};

let lastPrayerKey = '';
let lastBoardHtml = '';

// ---------- Section (boy / girl) ----------

function showSection() {
  const has = Boolean(state.section);
  $('ask').hidden = has;
  $('home').hidden = !has;
  $('open-settings').hidden = !has;
  if (!has) return;
  const name = t[state.section];
  $('open-settings').textContent = name;
  $('open-settings').setAttribute('aria-label', t.settingsLabel(name));
  for (const b of $('settings').querySelectorAll('[data-section]')) {
    b.setAttribute('aria-pressed', String(b.dataset.section === state.section));
  }
}

async function chooseSection(section) {
  const changed = state.section && state.section !== section;
  state.section = section;
  setSection(section);
  showSection();
  // Keep my spot, but under the new section.
  if (changed && state.board?.mine) apply(await joinSlot(section, state.board.mine));
  tick();
  refresh();
}

$('ask').addEventListener('click', (e) => {
  const b = e.target.closest('[data-section]');
  if (b) chooseSection(b.dataset.section);
});
$('settings').addEventListener('click', (e) => {
  const b = e.target.closest('[data-section]');
  if (b) chooseSection(b.dataset.section);
});
$('open-settings').addEventListener('click', () => $('settings').showModal());
$('close-settings').addEventListener('click', () => $('settings').close());

// ---------- Board ----------

function apply(result) {
  if (result.ok) {
    state.board = result.data;
    state.error = null;
  } else {
    state.error = result.error;
  }
  tick();
}

async function refresh() {
  if (!state.section || !state.key || document.hidden) return;
  const key = state.key;
  const result = await fetchBoard(key);
  if (key === state.key) apply(result);
}

$('slots').addEventListener('click', async (e) => {
  const joinBtn = e.target.closest('[data-join]');
  const cancelBtn = e.target.closest('[data-cancel]');
  if (joinBtn && joinBtn.dataset.join !== state.board?.mine) {
    apply(await joinSlot(state.section, joinBtn.dataset.join));
  } else if (cancelBtn) {
    apply(await cancelSpot(state.key));
  }
});

function renderBoard(prayer, slots) {
  const mine = state.board?.mine ?? null;
  const mySlot = slots.find((s) => s.id === mine);

  const rows = slots.map((s) => {
    const data = state.board?.slots[s.id] ?? { boys: 0, girls: false };
    const isMine = s.id === mine;
    const time = formatTime(s.start);
    const action = isMine ? t.yourSpot : !s.canJoin ? t.opensAt(formatTime(new Date(s.start - JOIN_AHEAD_MS))) : mine ? t.move : t.join;
    const counts = state.board ? `${t.boys(data.boys)} · ${t.girls(data.girls)}` : t.loading;
    return `<li class="slot${isMine ? ' is-mine' : ''}${s.isNow ? ' is-now' : ''}">
      <button class="slot-btn" type="button" data-join="${s.id}" aria-pressed="${isMine}"${s.canJoin ? '' : ' disabled'}>
        <span class="slot-time">${time}${s.isNow ? ` <span class="tag">${t.nowTag}</span>` : ''}</span>
        <span class="slot-counts">${counts}</span>
        <span class="slot-action">${action}</span>
      </button>
      ${isMine ? `<button class="btn btn-small" type="button" data-cancel aria-label="${t.cancelLabel(time)}">${t.cancel}</button>` : ''}
    </li>`;
  }).join('');

  const hint = state.error
    ? t.errors[state.error] || t.errors.default
    : mySlot ? t.hintJoined(formatTime(mySlot.start)) : t.hintJoin;

  const html = `${t.boardTitle(t.names[prayer.name])}|${hint}|${rows}`;
  if (html === lastBoardHtml) return; // don't redraw (keeps keyboard focus) when nothing changed
  lastBoardHtml = html;
  $('board-title').textContent = t.boardTitle(t.names[prayer.name]);
  $('hint').textContent = hint;
  $('hint').classList.toggle('is-error', Boolean(state.error));
  $('slots').innerHTML = rows;
}

// ---------- Clock ----------

function tick() {
  if (!state.section) return;
  const now = new Date();
  const s = getStatus(now);
  const left = formatCountdown(s.next.time - now);
  const nextName = t.names[s.next.name];

  $('countdown').textContent = `${t.in} ${left}`;
  $('countdown').setAttribute('aria-label', t.countdownLabel(nextName, left));

  const prayer = boardPrayer(s, now.getTime());
  const key = prayerKey(prayer);
  if (key !== state.key) {
    // A new prayer: the board starts fresh.
    state.key = key;
    state.board = null;
    state.error = null;
    refresh();
  }
  renderBoard(prayer, buildSlots(prayer, now.getTime()));

  // The rest only changes when the prayer changes.
  const prayerState = `${s.date}|${s.current}|${s.next.name}`;
  if (prayerState === lastPrayerKey) return;
  lastPrayerKey = prayerState;

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

showSection();
tick();
setInterval(tick, 1000);
setInterval(refresh, config.pollMs);
document.addEventListener('visibilitychange', refresh);
