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
    <div class="banner" id="imam" role="status" hidden>
      <p class="banner-title">${t.imamTitle}</p>
      <p>${t.imamText}</p>
    </div>

    <section class="card next" aria-labelledby="next-title">
      <p class="label" id="next-title">${t.nextPrayer}</p>
      <p class="next-name"><span id="next-name"></span> <span class="next-time" id="next-time"></span></p>
      <p class="countdown" id="countdown" role="timer"></p>
      <p class="current" id="current"></p>
    </section>

    <section class="card" aria-labelledby="board-title">
      <h2 class="label" id="board-title"></h2>
      <p class="hint" id="hint" role="status" aria-live="polite"></p>
      <div id="board"></div>
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
    <button class="btn" type="button" id="install" hidden>${t.install}</button>
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
  board: null, // { slots: { [slotId]: { boys, here, girls, wait } }, mine: { slotId, state } | null }
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
  const mine = state.board?.mine;
  if (changed && mine) apply(await joinSlot(section, mine.slotId, mine.state === 'going' ? 'joined' : mine.state));
  tick();
  refresh();
}

for (const id of ['ask', 'settings']) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('[data-section]');
    if (b) chooseSection(b.dataset.section);
  });
}
$('open-settings').addEventListener('click', () => $('settings').showModal());
$('close-settings').addEventListener('click', () => $('settings').close());

// ---------- Install (when the browser offers it) ----------

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('install').hidden = false;
});
$('install').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('install').hidden = true;
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

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

$('board').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const { act, slot, eta } = b.dataset;
  if (act === 'join' && slot !== state.board?.mine?.slotId) apply(await joinSlot(state.section, slot));
  else if (act === 'here') apply(await joinSlot(state.section, slot, 'here'));
  else if (act === 'going') apply(await joinSlot(state.section, slot, 'going', Number(eta)));
  else if (act === 'cancel') apply(await cancelSpot(state.key));
});

const EMPTY = { boys: 0, here: 0, girls: false, wait: null };

function nowSlotHtml(s) {
  const data = state.board?.slots[s.id] ?? EMPTY;
  const mine = state.board?.mine?.slotId === s.id ? state.board.mine.state : null;
  const range = `${formatTime(s.start)}–${formatTime(s.end)}`;

  const counts = state.board ? `${t.boys(data.boys)} (${t.hereCount(data.here)}) · ${t.girls(data.girls)}` : t.loading;
  const wait = data.wait === null ? '' : `<p class="now-wait">${t.wait(data.wait)}</p>`;
  const me = mine ? `<p class="now-me">${t.myState[mine]}</p>` : '';

  const hereBtn = mine === 'here'
    ? ''
    : `<button class="btn btn-primary btn-big" type="button" data-act="here" data-slot="${s.id}">${t.imHere}</button>`;
  const going = mine === 'here' ? '' : `
    <div class="going" role="group" aria-labelledby="going-label">
      <span id="going-label">${t.goingNow}</span>
      ${config.arrivalOptions.map((m) => `<button class="btn btn-small" type="button" data-act="going" data-slot="${s.id}" data-eta="${m}" aria-label="${t.goingLabel(m)}">${t.minutes(m)}</button>`).join('')}
    </div>`;
  const cancel = mine
    ? `<button class="btn btn-small btn-quiet" type="button" data-act="cancel" aria-label="${t.cancelLabel(formatTime(s.start))}">${t.cancel}</button>`
    : '';

  return `<div class="now-slot${mine ? ' is-mine' : ''}">
    <p class="now-head"><span class="tag">${t.nowTag}</span> ${range}</p>
    <p class="now-counts">${counts}</p>
    ${wait}${me}${hereBtn}${going}${cancel}
  </div>`;
}

function laterSlotHtml(s) {
  const data = state.board?.slots[s.id] ?? EMPTY;
  const mine = state.board?.mine?.slotId ?? null;
  const isMine = s.id === mine;
  const time = formatTime(s.start);
  const action = isMine ? t.yourSpot
    : !s.canJoin ? t.opensAt(formatTime(new Date(s.start - JOIN_AHEAD_MS)))
    : mine ? t.move : t.join;
  const counts = state.board ? `${t.boys(data.boys)} · ${t.girls(data.girls)}` : t.loading;
  return `<li class="slot${isMine ? ' is-mine' : ''}">
    <button class="slot-btn" type="button" data-act="join" data-slot="${s.id}" aria-pressed="${isMine}"${s.canJoin ? '' : ' disabled'}>
      <span class="slot-time">${time}</span>
      <span class="slot-counts">${counts}</span>
      <span class="slot-action">${action}</span>
    </button>
    ${isMine ? `<button class="btn btn-small btn-quiet" type="button" data-act="cancel" aria-label="${t.cancelLabel(time)}">${t.cancel}</button>` : ''}
  </li>`;
}

function renderBoard(prayer, slots) {
  const current = slots.find((s) => s.isNow);
  const later = slots.filter((s) => !s.isNow);
  const mine = state.board?.mine;
  const mySlot = slots.find((s) => s.id === mine?.slotId);

  // Imam banner: only on the boys' view, when at least one girl is in the current slot.
  const girlsNow = Boolean(current && state.board?.slots[current.id]?.girls);
  $('imam').hidden = !(state.section === 'boy' && girlsNow);

  const hint = state.error ? t.errors[state.error] || t.errors.default
    : mySlot ? (mySlot.isNow ? t.hintNow : t.hintJoined(formatTime(mySlot.start)))
    : current ? t.hintNow : t.hintJoin;

  const html = (current ? nowSlotHtml(current) : '')
    + (later.length ? `${current ? `<p class="label later">${t.later}</p>` : ''}<ul class="slots">${later.map(laterSlotHtml).join('')}</ul>` : '');

  const all = `${prayer.name}|${hint}|${html}`;
  if (all === lastBoardHtml) return; // don't redraw (keeps keyboard focus) when nothing changed
  lastBoardHtml = all;
  $('board-title').textContent = t.boardTitle(t.names[prayer.name]);
  $('hint').textContent = hint;
  $('hint').classList.toggle('is-error', Boolean(state.error));

  // Keep focus on the same button after redrawing.
  const focused = document.activeElement?.closest?.('#board [data-act]');
  const focusKey = focused && `[data-act="${focused.dataset.act}"]${focused.dataset.slot ? `[data-slot="${focused.dataset.slot}"]` : ''}${focused.dataset.eta ? `[data-eta="${focused.dataset.eta}"]` : ''}`;
  $('board').innerHTML = html;
  if (focusKey) $('board').querySelector(focusKey)?.focus();
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
