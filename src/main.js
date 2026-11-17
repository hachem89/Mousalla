import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './style.css';
import t from './strings.js';
import config from './config.js';
import { getStatus, formatTime, formatCountdown } from './prayer.js';
import {
  boardPrayer, prayerWindow, prayerKey, groupId, listGroups, comingGroupId, checkOwnTime, nearbyGroup, JOIN_AHEAD_MS,
} from './groups.js';
import { getSection, setSection } from './device.js';
import { fetchBoard, joinGroup, leaveGroup } from './api.js';

const MINUTE = 60000;
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

    <section class="card hero" aria-labelledby="hero-label">
      <p class="label" id="hero-label"></p>
      <p class="hero-name"><span id="hero-name"></span> <span class="hero-time" id="hero-time"></span> <span class="hero-day" id="hero-day"></span></p>
      <p class="hero-sub" id="hero-sub"></p>
    </section>
    <p class="next-line" id="next-line"></p>

    <section class="card" aria-labelledby="board-title">
      <h2 class="label" id="board-title"></h2>
      <p class="hint" id="hint" role="status" aria-live="polite"></p>
      <div id="board"></div>

      <div id="own" hidden>
        <h3 class="label sub-title">${t.ownTitle}</h3>
        <div class="suggest" id="suggest" role="alert" hidden></div>
        <form class="own-form" id="own-form" novalidate>
          <label for="own-time">${t.ownLabel}</label>
          <input type="time" id="own-time" step="60" required aria-describedby="own-error" />
          <button class="btn" type="submit">${t.ownCreate}</button>
        </form>
        <p class="own-error" id="own-error" role="alert"></p>
      </div>
    </section>
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
  prayer: null, // { name, time }
  board: null, // { groups: { [groupId]: { boys, girls, wait } }, mine: { groupId, state } | null }
  error: null,
  suggest: null, // { start, group }: "a group already prays at ..., join it?"
};

let lastBoardHtml = '';
let lastSuggest = null;

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
  // Keep my group, but under the new section.
  const mine = state.board?.mine;
  if (changed && mine) apply(await joinGroup(section, mine.groupId));
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

let refreshing = false;

async function refresh() {
  if (!state.section || !state.key || document.hidden || refreshing) return;
  refreshing = true;
  const key = state.key;
  const result = await fetchBoard(key);
  refreshing = false;
  if (key === state.key) apply(result);
}

async function join(id, joinState, eta) {
  state.suggest = null;
  $('own-error').textContent = '';
  apply(await joinGroup(state.section, id, joinState, eta));
}

async function onAction(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const { act, group, eta } = b.dataset;
  if (act === 'join') await join(group);
  else if (act === 'coming') await join(group, 'going', Number(eta));
  else if (act === 'leave') apply(await leaveGroup(state.key));
  else if (act === 'create') await join(groupId(state.prayer, state.suggest.start));
}
$('board').addEventListener('click', onAction);
$('own').addEventListener('click', onAction);

// "Pick your own time": check it is inside the prayer's time, then create the group,
// or suggest a group that already prays a few minutes from it.
$('own-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const now = Date.now();
  const prayer = state.prayer;
  const result = checkOwnTime($('own-time').value, prayer, now);
  if (result.error) {
    const { start, end } = prayerWindow(prayer);
    const err = t.ownErrors[result.error];
    $('own-error').textContent = result.error === 'outside'
      ? err(t.names[prayer.name], formatTime(new Date(start)), formatTime(new Date(end - MINUTE)))
      : err;
    state.suggest = null;
    tick();
    return;
  }
  $('own-error').textContent = '';
  const groups = listGroups(prayer, state.board, now).filter((g) => g.id !== state.board?.mine?.groupId);
  const near = nearbyGroup(result.start, groups);
  if (near && near.id !== groupId(prayer, result.start)) {
    state.suggest = { start: result.start, group: near };
    tick();
  } else {
    await join(groupId(prayer, result.start));
  }
});

const minutesUntil = (date, now) => Math.ceil((date - now) / MINUTE);

function groupHtml(g, mine, now) {
  const time = formatTime(g.start);
  const isMine = mine?.groupId === g.id;
  const empty = g.boys === 0 && !g.girls;
  const when = g.started ? (empty ? t.openNow : t.prayingNow) : t.startsIn(minutesUntil(g.start, now));
  const button = isMine
    ? `<button class="btn btn-small btn-quiet" type="button" data-act="leave" aria-label="${t.leaveLabel(time)}">${t.leave}</button>`
    : `<button class="btn btn-small" type="button" data-act="join" data-group="${g.id}" aria-label="${t.groupLabel(time)}: ${mine ? t.joinInstead : t.join}">${mine ? t.joinInstead : t.join}</button>`;
  return `<li class="group${isMine ? ' is-mine' : ''}">
    <div class="g-main">
      <p class="g-head"><span class="g-time">${time}</span>${g.isMain ? ` <span class="tag">${t.mainGroup}</span>` : ''}</p>
      <p class="g-info"><span class="g-when">${when}</span> · ${t.boys(g.boys)} · ${t.girls(g.girls)}</p>
      ${isMine ? `<p class="g-me">${t.myState[mine.state]}</p>` : ''}
      ${g.wait === null ? '' : `<p class="g-wait">${t.wait(g.wait)}</p>`}
    </div>
    ${button}
  </li>`;
}

function renderBoard(prayer, now) {
  const groups = listGroups(prayer, state.board, now);
  const mine = state.board?.mine ?? null;
  const myGroup = groups.find((g) => g.id === mine?.groupId);
  const praying = groups.filter((g) => g.started);
  const { start, end } = prayerWindow(prayer);
  const opensAt = start - JOIN_AHEAD_MS;
  const canJoin = now >= opensAt && now < end;

  // "I'm coming": to my group if it has started, otherwise to the group praying now
  // (or a new group in N minutes when nobody is).
  const coming = config.arrivalOptions
    .map((m) => ({ m, id: myGroup?.started ? myGroup.id : comingGroupId(prayer, groups, m, now) }))
    .filter((o) => o.id);

  // Imam banner: only on the boys' view, when a girl is in a group that is praying now.
  $('imam').hidden = !(state.section === 'boy' && praying.some((g) => g.girls));

  let hint;
  if (state.error) hint = t.errors[state.error] || t.errors.default;
  else if (!state.board) hint = t.loading;
  else if (!canJoin) hint = t.hintOpens(formatTime(new Date(opensAt)));
  else if (mine?.state === 'going') hint = t.hintComing;
  else if (myGroup) hint = myGroup.started ? t.hintMineNow : t.hintMineLater(formatTime(myGroup.start));
  else if (now < start) hint = t.hintBefore(t.names[prayer.name], formatTime(prayer.time));
  else if (praying.some((g) => g.boys > 0 || g.girls)) hint = t.hintPraying;
  else hint = t.hintNobody;

  let html = '';
  if (canJoin && state.board) {
    // One list for all groups of this prayer; each row says "Praying now" or "Starts in N min".
    html += `<h3 class="label sub-title">${t.groupsTitle(t.names[prayer.name])}</h3>
      <ul class="groups">${groups.map((g) => groupHtml(g, mine, now)).join('')}</ul>`;
    if (coming.length) {
      html += `<div class="coming" role="group" aria-labelledby="coming-title">
        <h3 class="label sub-title" id="coming-title">${t.comingTitle}</h3>
        <div class="coming-buttons">
          ${coming.map(({ m, id }) => `<button class="btn btn-primary btn-big" type="button" data-act="coming" data-group="${id}" data-eta="${m}" aria-label="${t.comingLabel(m)}">${t.minutes(m)}</button>`).join('')}
        </div>
      </div>`;
    }
  }

  // The "pick your own time" form is not redrawn, so typing in it is never interrupted.
  $('own').hidden = !(canJoin && state.board);

  const s = state.suggest;
  if (s !== lastSuggest) {
    lastSuggest = s;
    $('suggest').hidden = !s;
    $('suggest').innerHTML = s ? `
      <p>${t.suggest(formatTime(s.group.start))}</p>
      <div class="suggest-buttons">
        <button class="btn btn-primary" type="button" data-act="join" data-group="${s.group.id}">${t.suggestYes(formatTime(s.group.start))}</button>
        <button class="btn" type="button" data-act="create">${t.suggestNo(formatTime(s.start))}</button>
      </div>` : '';
  }

  const all = `${prayer.name}|${hint}|${html}`;
  if (all === lastBoardHtml) return; // don't redraw (keeps keyboard focus) when nothing changed
  lastBoardHtml = all;
  $('board-title').textContent = t.boardTitle(t.names[prayer.name]);
  $('hint').textContent = hint;
  $('hint').classList.toggle('is-error', Boolean(state.error));

  // Keep focus on the same button after redrawing.
  const focused = document.activeElement?.closest?.('#board [data-act]');
  const focusKey = focused && ['act', 'group', 'eta']
    .filter((k) => focused.dataset[k]).map((k) => `[data-${k}="${focused.dataset[k]}"]`).join('');
  $('board').innerHTML = html;
  if (focusKey) $('board').querySelector(focusKey)?.focus();
}

// A sensible time to suggest in the "my time" field: about 15 minutes from now,
// on a 5-minute mark, inside the prayer's time.
function defaultOwnTime(prayer, now) {
  const { start, end } = prayerWindow(prayer);
  const step = 5 * MINUTE;
  let at = Math.max(start, Math.ceil((now + 15 * MINUTE) / step) * step);
  if (at >= end) at = Math.max(start, Math.floor(now / MINUTE) * MINUTE);
  return formatTime(new Date(Math.min(at, end - MINUTE)));
}

// ---------- Clock ----------

let lastHeroKey = '';

function renderHero(s, now) {
  // The current prayer is shown big. Fajr's time ends at sunrise; after that,
  // and before Fajr, the next prayer is shown big with a countdown.
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

  const key = `${s.date}|${current}|${s.next.name}`;
  if (key === lastHeroKey) return;
  lastHeroKey = key;
  const name = current ?? s.next.name;
  $('hero-label').textContent = current ? t.nowLabel : t.nextLabel;
  $('hero-name').textContent = t.names[name];
  $('hero-time').textContent = formatTime(current ? s.times[current] : s.next.time);
  $('hero-day').textContent = !current && s.next.tomorrow ? t.tomorrow : '';
  $('date').textContent = dateFmt.format(now);
}

function tick() {
  if (!state.section) return;
  const now = new Date();
  const s = getStatus(now);
  renderHero(s, now);

  const prayer = boardPrayer(s, now.getTime());
  const key = prayerKey(prayer);
  state.prayer = prayer;
  if (key !== state.key) {
    // A new prayer: the board starts fresh.
    state.key = key;
    state.board = null;
    state.error = null;
    state.suggest = null;
    $('own-error').textContent = '';
    const { start, end } = prayerWindow(prayer);
    $('own-time').min = formatTime(new Date(start));
    $('own-time').max = formatTime(new Date(end - MINUTE));
    $('own-time').value = defaultOwnTime(prayer, now.getTime());
    refresh();
  }
  renderBoard(prayer, now.getTime());
}

showSection();
tick();
setInterval(tick, 1000);
setInterval(refresh, config.pollMs);
document.addEventListener('visibilitychange', refresh);
