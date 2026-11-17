import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './style.css';
import t from './strings.js';
import config from './config.js';
import { getStatus } from './prayer.js';
import { boardPrayer } from './groups.js';
import { getSection, setSection } from './device.js';
import { renderHero } from './hero.js';
import { initBoard, updateBoard, setBoardSection, refresh } from './board.js';

// Small pixel gear for the settings button.
const GEAR = `<svg class="gear" viewBox="0 0 9 9" width="18" height="18" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">
  <path d="M4 0h1v1H4zM4 8h1v1H4zM0 4h1v1H0zM8 4h1v1H8zM2 1h5v1H2zM2 7h5v1H2zM1 2h1v5H1zM7 2h1v5H7zM2 2h5v1H2zM2 6h5v1H2zM2 3h1v3H2zM6 3h1v3H6z"/>
</svg>`;

document.getElementById('app').innerHTML = `
  <header class="top">
    <img class="logo" src="/icon.svg" alt="" width="40" height="40" />
    <div class="brand">
      <h1>${t.appName}</h1>
      <p class="place">${t.place}</p>
    </div>
    <button class="chip" id="open-settings" type="button" hidden>${GEAR}<span>${t.settings}</span></button>
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
          <input type="time" id="own-time" step="60" required aria-label="${t.ownLabel}" aria-describedby="own-error" />
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
let section = getSection();

// ---------- Boy / girl ----------

function showSection() {
  $('ask').hidden = Boolean(section);
  $('home').hidden = !section;
  $('open-settings').hidden = !section;
  if (!section) return;
  $('open-settings').setAttribute('aria-label', t.settingsLabel(t[section]));
  for (const b of $('settings').querySelectorAll('[data-section]')) {
    b.setAttribute('aria-pressed', String(b.dataset.section === section));
  }
}

function chooseSection(value) {
  section = value;
  setSection(value);
  showSection();
  setBoardSection(value);
  tick();
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

// ---------- Clock ----------

function tick() {
  if (!section) return;
  const now = Date.now();
  const s = getStatus(new Date(now));
  renderHero(s, now);
  updateBoard(boardPrayer(s, now), now);
}

initBoard();
showSection();
if (section) setBoardSection(section);
tick();
setInterval(tick, 1000);
setInterval(refresh, config.pollMs);
document.addEventListener('visibilitychange', refresh);
