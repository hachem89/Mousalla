import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../server/app.js';
import serverConfig from '../server/config.js';

const tunis = (hms, date = '2026-11-17') => Date.parse(`${date}T${hms}+01:00`);
const PRAYER = '2026-11-17:dhuhr';
const SLOT_A = '2026-11-17:dhuhr:12:04';
const SLOT_B = '2026-11-17:dhuhr:12:19';

let clock;
let server;
let base;
let n = 0;

const newToken = () => (++n).toString(16).padStart(32, 'a');

async function start(config = serverConfig) {
  const app = createApp({ now: () => clock, config });
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  return app;
}

async function api(token, path, body) {
  const res = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'x-device-token': token, 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const board = (token, prayer = PRAYER) => api(token, `/api/board?prayer=${prayer}`);
const join = (token, section, slotId) => api(token, '/api/join', { section, slotId });
const cancel = (token, prayer = PRAYER) => api(token, '/api/cancel', { prayer });

beforeEach(async () => {
  clock = tunis('12:00:00');
  await start();
});

afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('join, move, cancel', () => {
  it('joins a slot and shows it as mine', async () => {
    const me = newToken();
    const r = await join(me, 'boy', SLOT_A);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ slots: { [SLOT_A]: { boys: 1, girls: false } }, mine: SLOT_A });

    const other = await board(newToken());
    expect(other.body).toEqual({ slots: { [SLOT_A]: { boys: 1, girls: false } }, mine: null });
  });

  it('a device has one spot per prayer: joining again moves it', async () => {
    const me = newToken();
    await join(me, 'boy', SLOT_A);
    await join(me, 'boy', SLOT_A);
    const r = await join(me, 'boy', SLOT_B);
    expect(r.body).toEqual({ slots: { [SLOT_B]: { boys: 1, girls: false } }, mine: SLOT_B });
  });

  it('cancels', async () => {
    const me = newToken();
    await join(me, 'boy', SLOT_A);
    const r = await cancel(me);
    expect(r.body).toEqual({ slots: {}, mine: null });
  });

  it('one device cannot cancel another one', async () => {
    const me = newToken();
    await join(me, 'boy', SLOT_A);
    await cancel(newToken());
    expect((await board(me)).body.slots[SLOT_A].boys).toBe(1);
  });

  it('keeps prayers apart', async () => {
    const me = newToken();
    clock = tunis('13:30:00');
    await join(me, 'boy', '2026-11-17:asr:14:48');
    await join(me, 'boy', '2026-11-17:dhuhr:13:04');
    expect(Object.keys((await board(me, '2026-11-17:asr')).body.slots)).toEqual(['2026-11-17:asr:14:48']);
  });
});

describe('girls are never counted', () => {
  it('returns only yes/no for girls, the same for 1 or 3 girls', async () => {
    const viewer = newToken();
    await join(newToken(), 'girl', SLOT_A);
    const one = await board(viewer);

    await join(newToken(), 'girl', SLOT_A);
    await join(newToken(), 'girl', SLOT_A);
    const three = await board(viewer);

    expect(one.body).toEqual({ slots: { [SLOT_A]: { boys: 0, girls: true } }, mine: null });
    expect(three.body).toEqual(one.body);
  });

  it('girls do not change the boys count, and every response has the same shape', async () => {
    await join(newToken(), 'boy', SLOT_A);
    await join(newToken(), 'boy', SLOT_A);
    const girl = newToken();
    const joined = await join(girl, 'girl', SLOT_A);
    await join(newToken(), 'girl', SLOT_A);

    for (const r of [joined, await board(girl), await board(newToken()), await cancel(newToken())]) {
      expect(r.body.slots[SLOT_A]).toEqual({ boys: 2, girls: true });
      for (const s of Object.values(r.body.slots)) {
        expect(Object.keys(s).sort()).toEqual(['boys', 'girls']);
        expect(typeof s.girls).toBe('boolean');
      }
    }
  });

  it('girls: no once the last girl leaves', async () => {
    const girl = newToken();
    await join(girl, 'girl', SLOT_A);
    await cancel(girl);
    expect((await board(newToken())).body.slots).toEqual({});
  });
});

describe('expiry', () => {
  it('a spot disappears when its slot ends', async () => {
    await join(newToken(), 'boy', SLOT_A);
    clock = tunis('12:18:59');
    expect((await board(newToken())).body.slots[SLOT_A].boys).toBe(1);
    clock = tunis('12:19:00');
    expect((await board(newToken())).body.slots).toEqual({});
  });

  it('cleanup frees memory', async () => {
    server.close();
    const app = await start();
    await join(newToken(), 'boy', SLOT_A);
    expect(app.board.size).toBe(1);
    clock = tunis('13:00:00');
    app.cleanup();
    expect(app.board.size).toBe(0);
  });
});

describe('invalid input', () => {
  it('rejects missing or malformed tokens', async () => {
    for (const token of ['', 'abc', 'g'.repeat(32), 'A'.repeat(32), 'a'.repeat(33)]) {
      expect((await board(token)).status).toBe(400);
    }
  });

  it('rejects bad sections', async () => {
    for (const section of [undefined, '', 'Boy', 'other', 1, ['boy']]) {
      const r = await join(newToken(), section, SLOT_A);
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('bad_section');
    }
  });

  it('rejects bad slot ids', async () => {
    const bad = [
      undefined, 42, '', 'hello', '2026-11-17:dhuhr', '2026-11-17:lunch:12:04',
      '2026-11-17:dhuhr:24:00', '2026-11-17:dhuhr:12:60', '2026-02-30:dhuhr:12:04',
      '2026-11-17:dhuhr:12:04:extra', ' 2026-11-17:dhuhr:12:04',
      '2026-11-17:dhuhr:14:05', // more than 2 hours ahead
      '2026-11-17:fajr:09:30', // more than 2 hours ago
      '2026-11-17:fajr:11:30', // already over
      '2026-11-18:dhuhr:12:04', // tomorrow
    ];
    for (const slotId of bad) {
      const r = await join(newToken(), 'boy', slotId);
      expect(r.status, String(slotId)).toBe(400);
    }
    expect((await board(newToken())).body.slots).toEqual({});
  });

  it('accepts slots up to 2 hours ahead', async () => {
    expect((await join(newToken(), 'boy', '2026-11-17:asr:14:00')).status).toBe(200);
  });

  it('rejects bad prayer keys', async () => {
    for (const p of ['', 'x', '2026-11-17', '2026-11-17:dhuhr:12:04', '2026-13-01:dhuhr']) {
      expect((await board(newToken(), encodeURIComponent(p))).status).toBe(400);
      expect((await cancel(newToken(), p)).status).toBe(400);
    }
  });

  it('rejects broken and oversized JSON', async () => {
    expect((await api(newToken(), '/api/join', '{not json')).status).toBe(400);
    const big = JSON.stringify({ section: 'boy', slotId: SLOT_A, pad: 'x'.repeat(5000) });
    expect((await api(newToken(), '/api/join', big)).status).toBe(413);
  });

  it('unknown api routes are 404', async () => {
    expect((await api(newToken(), '/api/nope')).status).toBe(404);
  });
});

describe('abuse protection', () => {
  it('rate limits writes per device', async () => {
    const me = newToken();
    const statuses = [];
    for (let i = 0; i < serverConfig.limits.writePerToken + 1; i++) {
      statuses.push((await join(me, 'boy', SLOT_A)).status);
    }
    expect(statuses.at(-2)).toBe(200);
    expect(statuses.at(-1)).toBe(429);

    clock += 60000;
    expect((await join(me, 'boy', SLOT_A)).status).toBe(200);
  });

  it('rate limits per IP across devices', async () => {
    server.close();
    await start({ ...serverConfig, limits: { ...serverConfig.limits, writePerIp: 3 } });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await join(newToken(), 'boy', SLOT_A)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('caps the number of entries', async () => {
    server.close();
    await start({ ...serverConfig, maxEntries: 2 });
    const a = newToken();
    expect((await join(a, 'boy', SLOT_A)).status).toBe(200);
    expect((await join(newToken(), 'boy', SLOT_A)).status).toBe(200);
    expect((await join(newToken(), 'boy', SLOT_A)).status).toBe(503);
    // moving an existing spot still works when full
    expect((await join(a, 'boy', SLOT_B)).status).toBe(200);
  });
});
