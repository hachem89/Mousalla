// Printable A4 poster with a QR code to the app.
// The QR code points to this site's address, or to ?url=... if given.
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import './poster.css';
import qrcode from 'qrcode-generator';
import strings from './strings.js';

const t = strings.poster;
const url = new URLSearchParams(location.search).get('url') || `${location.origin}/`;

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const margin = 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + margin} ${r + margin}h1v1h-1z`;
  }
  const size = n + margin * 2;
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="${t.qrLabel(url)}">
    <rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#1b1b1b"/></svg>`;
}

const escape = (s) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

document.getElementById('poster').innerHTML = `
  <button class="print" type="button" id="print">${t.print}</button>
  <article class="sheet">
    <header>
      <img src="/icon.svg" alt="" width="96" height="96" />
      <h1>${strings.appName}</h1>
      <p class="sub">${strings.place}</p>
    </header>
    <p class="lead">${t.lead}</p>
    ${qrSvg(url)}
    <p class="url">${escape(url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</p>
    <ol class="steps">
      ${t.steps.map((s) => `<li>${s}</li>`).join('')}
    </ol>
    <p class="privacy">${t.privacy}</p>
  </article>
`;

document.getElementById('print').addEventListener('click', () => window.print());
