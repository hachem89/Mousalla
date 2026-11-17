import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './style.css';
import t from './strings.js';
import config from './config.js';
import { getStatus, formatTime, formatCountdown } from './prayer.js';
import { boardPrayer, prayerKey, listGroups, timeChoices, nearbyGroup, JOIN_AHEAD_MS } from './groups.js';
import { getSection, setSection } from './device.js';
import { fetchBoard, joinGroup, leaveGroup } from './api.js';

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
      <p class="next-name"><span id="next-name"></span> <span class="next-time" id="next-time"></span> <span class="next-day" id="next-day"></span></p>
      <p class="countdown" id="countdown" role="timer"></p>
      <p class="current" id="current"></p>
    </section>

    <section class="card" aria-labelledby="board-title">
      <h2 class="label" id="board-title"></h2>
      <p class="hint" id="hint" role="status" aria-live="polite"></p>
      <div id="board"></div>
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
  board: null, // { groups: { [groupId]: { boys, here, girls, wait } }, mine: { groupId, state } | null }
  error: null,
  suggest: null, // { pick, group }: "a group already prays at ..., join it?"
  picking: false, // time picker opened while already in a group
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
  // Keep my group, but under the new section.
  const mine = state.board?.mine;
  if (changed && mine) apply(await joinGroup(section, mine.groupId, mine.state === 'going' ? 'joined' : mine.state));
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

async function join(groupId, joinState, eta) {
  state.suggest = null;
  state.picking = false;
  apply(await joinGroup(state.section, groupId, joinState, eta));
}

$('board').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const { act, group, eta } = b.dataset;
  const now = Date.now();
  const groups = listGroups(currentPrayer, state.board, now);

  if (act === 'join') await join(group);
  else if (act === 'here') await join(group, 'here');
  else if (act === 'going') await join(group, 'going', Number(eta));
  else if (act === 'leave') { state.suggest = null; apply(await leaveGroup(state.key)); }
  else if (act === 'open-picker') { state.picking = true; tick(); }
  else if (act === 'no-suggest') await join(state.suggest.pick.id);
  else if (act === 'pick') {
    const pick = timeChoices(currentPrayer, now).find((c) => c.id === group);
    if (!pick) return;
    // Picking a time close to an existing group: suggest praying with them instead.
    const near = nearbyGroup(pick.start, groups.filter((g) => g.id !== state.board?.mine?.groupId));
    if (near && near.id !== pick.id) {
      state.suggest = { pick, group: near };
      tick();
    } else {
      await join(pick.id);
    }
  }
});

const minutesUntil = (date, now) => Math.ceil((date - now) / 60000);

function countsHtml(g) {
  return `<p class="g-counts">${t.boysHere(g.boys, g.here)} · ${t.girls(g.girls)}</p>`
    + (g.wait === null ? '' : `<p class="g-wait">${t.wait(g.wait)}</p>`);
}

function whenText(g, now) {
  return g.started ? t.prayingNow : t.startsIn(minutesUntil(g.start, now));
}

function myGroupHtml(g, mine, now) {
  const time = formatTime(g.start);
  const canAct = g.started && mine.state !== 'here';
  return `<section class="group is-mine" aria-label="${t.myGroupTitle(time)}">
    <p class="g-head"><span class="g-time">${time}</span> <span class="g-when">${whenText(g, now)}</span></p>
    <p class="g-me">${t.myState[mine.state]}</p>
    ${countsHtml(g)}
    ${canAct ? `
      <button class="btn btn-primary btn-big" type="button" data-act="here" data-group="${g.id}">${t.imHere}</button>
      <div class="going" role="group" aria-labelledby="going-label">
        <span id="going-label">${t.onMyWay}</span>
        ${config.arrivalOptions.map((m) => `<button class="btn btn-small" type="button" data-act="going" data-group="${g.id}" data-eta="${m}" aria-label="${t.onMyWayLabel(m)}">${t.minutes(m)}</button>`).join('')}
      </div>` : ''}
    <button class="btn btn-small btn-quiet" type="button" data-act="leave" aria-label="${t.leaveLabel(time)}">${t.leave}</button>
  </section>`;
}

function otherGroupHtml(g, hasMine, now) {
  const time = formatTime(g.start);
  return `<li class="group">
    <p class="g-head"><span class="g-time">${time}</span> <span class="g-when">${whenText(g, now)}</span></p>
    ${countsHtml(g)}
    <button class="btn btn-small" type="button" data-act="join" data-group="${g.id}" aria-label="${t.groupLabel(time)}: ${hasMine ? t.switchGroup : t.joinGroup}">${hasMine ? t.switchGroup : t.joinGroup}</button>
  </li>`;
}

function pickerHtml(choices) {
  const s = state.suggest;
  const suggestion = s ? `
    <div class="suggest" role="alert">
      <p>${t.suggest(formatTime(s.group.start))}</p>
      <div class="suggest-buttons">
        <button class="btn btn-primary" type="button" data-act="join" data-group="${s.group.id}">${t.suggestYes(formatTime(s.group.start))}</button>
        <button class="btn" type="button" data-act="no-suggest">${t.suggestNo(formatTime(s.pick.start))}</button>
      </div>
    </div>` : '';
  return `<h3 class="label sub-title">${t.pickTitle}</h3>${suggestion}
    <div class="times-grid">
      ${choices.map((c) => {
        const label = c.isNow ? t.pickNow : formatTime(c.start);
        const picked = s?.pick.id === c.id;
        return `<button class="btn btn-time" type="button" data-act="pick" data-group="${c.id}" aria-pressed="${picked}" aria-label="${t.pickLabel(c.isNow ? `${t.pickNow} (${formatTime(c.start)})` : label)}">${label}</button>`;
      }).join('')}
    </div>`;
}

function renderBoard(prayer, now) {
  const groups = listGroups(prayer, state.board, now);
  const mineId = state.board?.mine?.groupId;
  const myGroup = groups.find((g) => g.id === mineId);
  const others = groups.filter((g) => g !== myGroup);
  // Times that already have a group are joined from the group list instead.
  const choices = timeChoices(prayer, now).filter((c) => !groups.some((g) => g.id === c.id));

  // Imam banner: only on the boys' view, when a girl is in a group that is praying now.
  $('imam').hidden = !(state.section === 'boy' && groups.some((g) => g.started && g.girls));

  let hint;
  if (state.error) hint = t.errors[state.error] || t.errors.default;
  else if (!state.board) hint = t.loading;
  else if (myGroup) hint = myGroup.started ? t.hintMineNow : t.hintMineLater(formatTime(myGroup.start));
  else if (!choices.length && !groups.length) hint = t.hintOpens(formatTime(new Date(prayer.time - JOIN_AHEAD_MS)));
  else hint = groups.length ? t.hintChoose : t.hintEmpty;

  let html = '';
  if (myGroup) html += myGroupHtml(myGroup, state.board.mine, now);
  if (others.length) {
    html += `<h3 class="label sub-title">${myGroup ? t.otherGroupsTitle : t.groupsTitle}</h3>
      <ul class="groups">${others.map((g) => otherGroupHtml(g, Boolean(myGroup), now)).join('')}</ul>`;
  }
  if (choices.length && state.board) {
    html += myGroup && !state.picking
      ? `<button class="btn btn-small btn-quiet" type="button" data-act="open-picker">${t.pickOther}</button>`
      : pickerHtml(choices);
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

// ---------- Clock ----------

let currentPrayer = null;

function tick() {
  if (!state.section) return;
  const now = new Date();
  const s = getStatus(now);
  const left = formatCountdown(s.next.time - now);
  const nextName = t.names[s.next.name];

  $('countdown').textContent = `${t.in} ${left}`;
  $('countdown').setAttribute('aria-label', t.countdownLabel(nextName, left));

  currentPrayer = boardPrayer(s, now.getTime());
  const key = prayerKey(currentPrayer);
  if (key !== state.key) {
    // A new prayer: the board starts fresh.
    state.key = key;
    state.board = null;
    state.error = null;
    state.suggest = null;
    state.picking = false;
    refresh();
  }
  renderBoard(currentPrayer, now.getTime());

  // The rest only changes when the prayer changes.
  const prayerState = `${s.date}|${s.current}|${s.next.name}`;
  if (prayerState === lastPrayerKey) return;
  lastPrayerKey = prayerState;

  $('next-name').textContent = nextName;
  $('next-time').textContent = formatTime(s.next.time);
  $('next-day').textContent = s.next.tomorrow ? t.tomorrow : '';
  $('current').textContent = `${t.now}: ${s.current ? t.names[s.current] : t.noCurrent}`;
  $('date').textContent = dateFmt.format(now);
}

showSection();
tick();
setInterval(tick, 1000);
setInterval(refresh, config.pollMs);
document.addEventListener('visibilitychange', refresh);
