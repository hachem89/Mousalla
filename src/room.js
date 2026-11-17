// A small pixel drawing of the prayer room for one group: the imam's place,
// then the rows (5, then 7, 7, 7). Boys fill it in prayer order. Girls are
// never drawn one by one: only a curtain at the back that says Yes or No.
import t from './strings.js';

const ROWS = [5, 7, 7, 7];
const CELL = 22; // distance between places
const SIZE = 16; // size of one place
const WIDTH = 7 * CELL + 24;

// Places in a row fill from the middle outwards: for 7, columns 3, 2, 4, 1, 5, 0, 6.
function middleOut(n) {
  const mid = (n - 1) / 2;
  return [...Array(n).keys()].sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b);
}

// Every place, in the order people take them: the imam first, then row by row.
const PLACES = (() => {
  const places = [{ x: (WIDTH - SIZE) / 2, y: 30 }];
  let y = 30 + CELL + 8;
  for (const n of ROWS) {
    const left = (WIDTH - n * CELL) / 2 + (CELL - SIZE) / 2;
    for (const i of middleOut(n)) places.push({ x: left + i * CELL, y });
    y += CELL;
  }
  return places;
})();

const CURTAIN_Y = PLACES.at(-1).y + CELL + 6;
const HEIGHT = CURTAIN_Y + 30;

export function roomHtml({ boys, boysComing, girls }) {
  const here = boys - boysComing;
  const spots = PLACES.map((p, i) => {
    const kind = i < here ? 'here' : i < boys ? 'coming' : 'empty';
    return `<rect class="spot spot-${kind}" x="${p.x}" y="${p.y}" width="${SIZE}" height="${SIZE}" rx="3"/>`;
  }).join('');
  const extra = boys - PLACES.length;
  const more = extra > 0
    ? `<text class="room-more" x="${WIDTH - 10}" y="${CURTAIN_Y - 8}" text-anchor="end">+${extra}</text>`
    : '';
  const cx = WIDTH / 2;

  return `<figure class="room">
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${t.roomLabel(boys, boysComing, girls)}" shape-rendering="crispEdges">
      <rect class="room-floor" x="2" y="2" width="${WIDTH - 4}" height="${HEIGHT - 4}" rx="4"/>
      <path class="room-mihrab" d="M${cx - 14} 26V14h4v-4h4v-4h12v4h4v4h4v12z"/>
      ${spots}${more}
      <rect class="room-curtain" x="8" y="${CURTAIN_Y}" width="${WIDTH - 16}" height="22" rx="2"/>
      <text class="room-girls" x="${cx}" y="${CURTAIN_Y + 16}" text-anchor="middle">${t.girls(girls)}</text>
    </svg>
  </figure>`;
}

// What the squares mean, shown once above the groups.
export function legendHtml() {
  return `<p class="room-legend" aria-hidden="true">
    <span><i class="key key-here"></i>${t.legendHere}</span>
    <span><i class="key key-coming"></i>${t.legendComing}</span>
  </p>`;
}
