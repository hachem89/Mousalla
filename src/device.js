// What this phone remembers. Only two things, both in localStorage:
// the section (boy/girl) and a random token. No names, nothing else.
const SECTION_KEY = 'mousalla.section';
const TOKEN_KEY = 'mousalla.token';

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep it for this visit only */ }
}

let memoryToken = null;

export function getSection() {
  const s = read(SECTION_KEY);
  return s === 'boy' || s === 'girl' ? s : null;
}

export function setSection(section) {
  write(SECTION_KEY, section);
}

export function getToken() {
  let token = read(TOKEN_KEY) || memoryToken;
  if (!/^[a-f0-9]{32}$/.test(token || '')) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    write(TOKEN_KEY, token);
  }
  memoryToken = token;
  return token;
}
