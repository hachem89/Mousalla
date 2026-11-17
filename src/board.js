// The board: groups of the prayer, "I'm coming", and "Other time".
import t from './strings.js';
import { formatTime } from './prayer.js';
import {
  prayerWindow, prayerKey, groupId, listGroups, comingGroupId, checkOwnTime, nearbyGroup, JOIN_AHEAD_MS,
} from './groups.js';
import { fetchBoard, joinGroup, leaveGroup } from './api.js';
import { roomHtml, legendHtml } from './room.js';

const MINUTE = 60000;
const $ = (id) => document.getElementById(id);

const state = {
  section: null, // "boy" | "girl"
  key: null, // prayer the board is about, e.g. "2026-11-17:dhuhr"
  prayer: null, // { name, time }
  board: null, // { groups: { [groupId]: { boys, girls, coming } }, mine: { groupId, state } | null }
  error: null,
  suggest: null, // { start, group }: "a group already prays at ..., join it?"
  friends: 0, // friends coming with me
  pending: null, // what to do once "How many are you?" is answered
};

let lastHtml = '';
let lastSuggest = null;
let refreshing = false;

function apply(result) {
  if (result.ok) {
    state.board = result.data;
    state.error = null;
    if (result.data.mine) state.friends = result.data.mine.friends;
  } else {
    state.error = result.error;
  }
  if (state.prayer) render(state.prayer, Date.now());
}

export async function refresh() {
  if (!state.section || !state.key || document.hidden || refreshing) return;
  refreshing = true;
  const key = state.key;
  const result = await fetchBoard(key);
  refreshing = false;
  if (key === state.key) apply(result);
}

// Boy/girl chosen or changed. A spot I already have is kept, under the new section.
export async function setBoardSection(section) {
  const changed = state.section && state.section !== section;
  state.section = section;
  const mine = state.board?.mine;
  if (changed && mine) apply(await joinGroup(section, mine.groupId, 'joined', state.friends));
  refresh();
}

// Called every second with the prayer the board is about.
export function updateBoard(prayer, now) {
  state.prayer = prayer;
  const key = prayerKey(prayer);
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
    $('own-time').value = defaultOwnTime(prayer, now);
    refresh();
  }
  render(prayer, now);
}

async function join(id, joinState = 'joined', friends = state.friends) {
  state.suggest = null;
  state.friends = friends;
  $('own-error').textContent = '';
  apply(await joinGroup(state.section, id, joinState, friends));
}

// Boys are asked "How many are you?" before joining, so their friends are counted.
// Girls are not asked: girls are only ever Yes/No.
function askHowMany(run) {
  if (state.section !== 'boy') return run(0);
  state.pending = run;
  $('howmany').showModal();
}

async function onAction(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const { act, group } = b.dataset;
  const mine = state.board?.mine;
  if (act === 'join') askHowMany((f) => join(group, 'joined', f));
  else if (act === 'coming') askHowMany((f) => join(group, 'going', f));
  else if (act === 'create') {
    const id = groupId(state.prayer, state.suggest.start);
    askHowMany((f) => join(id, 'joined', f));
  } else if (act === 'change-count' && mine) askHowMany((f) => join(mine.groupId, mine.state, f));
  else if (act === 'leave') apply(await leaveGroup(state.key));
}

function onHowMany(e) {
  const b = e.target.closest('button[data-count]');
  if (!b) return;
  $('howmany').close();
  const run = state.pending;
  state.pending = null;
  run?.(Number(b.dataset.count) - 1);
}

// "Other time": check it is inside the prayer's time, then create the group,
// or suggest a group that already prays a few minutes from it.
async function onOwnTime(e) {
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
    render(prayer, now);
    return;
  }
  $('own-error').textContent = '';
  const groups = listGroups(prayer, state.board, now).filter((g) => g.id !== state.board?.mine?.groupId);
  const near = nearbyGroup(result.start, groups);
  if (near && near.id !== groupId(prayer, result.start)) {
    state.suggest = { start: result.start, group: near };
    render(prayer, now);
  } else {
    const id = groupId(prayer, result.start);
    askHowMany((f) => join(id, 'joined', f));
  }
}

export function initBoard() {
  $('board').addEventListener('click', onAction);
  $('own').addEventListener('click', onAction);
  $('own-form').addEventListener('submit', onOwnTime);
  $('howmany').addEventListener('click', onHowMany);
  $('howmany-cancel').addEventListener('click', () => {
    state.pending = null;
    $('howmany').close();
  });
}

const minutesUntil = (date, now) => Math.ceil((date - now) / MINUTE);

function groupHtml(g, mine, now) {
  const time = formatTime(g.start);
  const isMine = mine?.groupId === g.id;
  const empty = g.boys === 0 && !g.girls;
  const when = g.started ? (empty ? t.now : t.prayingNow) : t.startsIn(minutesUntil(g.start, now));
  const who = empty ? t.nobodyYet : `${t.boys(g.boys)} · ${t.girls(g.girls)}`;
  const button = isMine
    ? `<button class="btn btn-small btn-quiet" type="button" data-act="leave" aria-label="${t.leaveLabel(time)}">${t.leave}</button>`
    : `<button class="btn btn-small" type="button" data-act="join" data-group="${g.id}" aria-label="${t.groupLabel(time)}: ${mine ? t.joinInstead : t.join}">${mine ? t.joinInstead : t.join}</button>`;
  const me = isMine
    ? `<p class="g-me">${t.myState[mine.state]}${mine.friends ? ` · ${t.withFriends(mine.friends)}` : ''}</p>
      ${state.section === 'boy' ? `<button class="btn btn-small btn-quiet" type="button" data-act="change-count">${t.changeCount}</button>` : ''}`
    : '';
  return `<li class="group${isMine ? ' is-mine' : ''}">
    <div class="g-top">
      <div class="g-main">
        <p class="g-time">${time}</p>
        <p class="g-info"><span class="g-when">${when}</span> · ${who}</p>
        ${me}
        ${g.coming ? `<p class="g-wait">${t.onTheWay}</p>` : ''}
      </div>
      ${button}
    </div>
    ${roomHtml(g)}
  </li>`;
}

function render(prayer, now) {
  const groups = listGroups(prayer, state.board, now);
  const mine = state.board?.mine ?? null;
  const myGroup = groups.find((g) => g.id === mine?.groupId);
  const praying = groups.filter((g) => g.started);
  const { start, end } = prayerWindow(prayer);
  const opensAt = start - JOIN_AHEAD_MS;
  const canJoin = now >= opensAt && now < end;

  // "I'm coming": to my group or the group praying now if it is still on in 2 minutes,
  // otherwise a new group in 2 minutes.
  const comingId = comingGroupId(prayer, groups, now, mine?.groupId);

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
    // Every group of this prayer, each with its room drawing.
    if (groups.length) {
      html += `<h3 class="label sub-title">${t.groupsTitle(t.names[prayer.name])}</h3>${legendHtml()}
        <ul class="groups">${groups.map((g) => groupHtml(g, mine, now)).join('')}</ul>`;
    }
    if (comingId && mine?.state !== 'going') {
      html += `<button class="btn btn-primary btn-big btn-coming" type="button" data-act="coming" data-group="${comingId}">${t.comingButton}</button>`;
    }
  }

  // The "Other time" form is not redrawn, so typing in it is never interrupted.
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
  if (all === lastHtml) return; // don't redraw (keeps keyboard focus) when nothing changed
  lastHtml = all;
  $('board-title').textContent = t.boardTitle(t.names[prayer.name]);
  $('hint').textContent = hint;
  $('hint').classList.toggle('is-error', Boolean(state.error));

  // Keep focus on the same button after redrawing.
  const focused = document.activeElement?.closest?.('#board [data-act]');
  const focusKey = focused && ['act', 'group']
    .filter((k) => focused.dataset[k]).map((k) => `[data-${k}="${focused.dataset[k]}"]`).join('');
  $('board').innerHTML = html;
  if (focusKey) $('board').querySelector(focusKey)?.focus();
}

// A sensible time to put in the "Other time" field: about 15 minutes from now,
// on a 5-minute mark, inside the prayer's time.
function defaultOwnTime(prayer, now) {
  const { start, end } = prayerWindow(prayer);
  const step = 5 * MINUTE;
  let at = Math.max(start, Math.ceil((now + 15 * MINUTE) / step) * step);
  if (at >= end) at = Math.max(start, Math.floor(now / MINUTE) * MINUTE);
  return formatTime(new Date(Math.min(at, end - MINUTE)));
}
