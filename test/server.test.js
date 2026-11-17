import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../server/app.js';
import serverConfig from '../server/config.js';

const tunis = (hms, date = '2026-11-17') => Date.parse(`${date}T${hms}+01:00`);
const PRAYER = '2026-11-17:dhuhr';
const GROUP_A = '2026-11-17:dhuhr:12:04';
const GROUP_B = '2026-11-17:dhuhr:12:19';

let clock;
let server;
let base;
let n = 0;

const group = (boys, extra = {}) => ({ boys, girls: false, coming: false, ...extra });
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
const join = (token, section, groupId) => api(token, '/api/join', { section, groupId });
const cancel = (token, prayer = PRAYER) => api(token, '/api/cancel', { prayer });

beforeEach(async () => {
  clock = tunis('12:00:00');
  await start();
});

afterEach(() => new Promise((resolve) => server.close(resolve)));

describe('join, move, cancel', () => {
  it('joins a group and shows it as mine', async () => {
    const me = newToken();
    const r = await join(me, 'boy', GROUP_A);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ groups: { [GROUP_A]: group(1) }, mine: { groupId: GROUP_A, state: 'joined' } });

    const other = await board(newToken());
    expect(other.body).toEqual({ groups: { [GROUP_A]: group(1) }, mine: null });
  });

  it('a device has one spot per prayer: joining again moves it', async () => {
    const me = newToken();
    await join(me, 'boy', GROUP_A);
    await join(me, 'boy', GROUP_A);
    const r = await join(me, 'boy', GROUP_B);
    expect(r.body).toEqual({ groups: { [GROUP_B]: group(1) }, mine: { groupId: GROUP_B, state: 'joined' } });
  });

  it('cancels', async () => {
    const me = newToken();
    await join(me, 'boy', GROUP_A);
    const r = await cancel(me);
    expect(r.body).toEqual({ groups: {}, mine: null });
  });

  it('one device cannot cancel another one', async () => {
    const me = newToken();
    await join(me, 'boy', GROUP_A);
    await cancel(newToken());
    expect((await board(me)).body.groups[GROUP_A].boys).toBe(1);
  });

  it('keeps prayers apart', async () => {
    const me = newToken();
    clock = tunis('13:30:00');
    await join(me, 'boy', '2026-11-17:asr:14:48');
    await join(me, 'boy', '2026-11-17:dhuhr:13:04');
    expect(Object.keys((await board(me, '2026-11-17:asr')).body.groups)).toEqual(['2026-11-17:asr:14:48']);
  });
});

describe('girls are never counted', () => {
  it('returns only yes/no for girls, the same for 1 or 3 girls', async () => {
    const viewer = newToken();
    await join(newToken(), 'girl', GROUP_A);
    const one = await board(viewer);

    await join(newToken(), 'girl', GROUP_A);
    await join(newToken(), 'girl', GROUP_A);
    const three = await board(viewer);

    expect(one.body).toEqual({ groups: { [GROUP_A]: group(0, { girls: true }) }, mine: null });
    expect(three.body).toEqual(one.body);
  });

  it('girls do not change the boys count, and every response has the same shape', async () => {
    await join(newToken(), 'boy', GROUP_A);
    await join(newToken(), 'boy', GROUP_A);
    const girl = newToken();
    const joined = await join(girl, 'girl', GROUP_A);
    await join(newToken(), 'girl', GROUP_A);

    for (const r of [joined, await board(girl), await board(newToken()), await cancel(newToken())]) {
      expect(r.body.groups[GROUP_A]).toEqual(group(2, { girls: true }));
      for (const s of Object.values(r.body.groups)) {
        expect(Object.keys(s).sort()).toEqual(['boys', 'coming', 'girls']);
        expect(typeof s.girls).toBe('boolean');
      }
    }
  });

  it('girls: no once the last girl leaves', async () => {
    const girl = newToken();
    await join(girl, 'girl', GROUP_A);
    await cancel(girl);
    expect((await board(newToken())).body.groups).toEqual({});
  });
});

describe('expiry', () => {
  it('a spot disappears when its group ends', async () => {
    await join(newToken(), 'boy', GROUP_A);
    clock = tunis('12:18:59');
    expect((await board(newToken())).body.groups[GROUP_A].boys).toBe(1);
    clock = tunis('12:19:00');
    expect((await board(newToken())).body.groups).toEqual({});
  });

  it('cleanup frees memory', async () => {
    server.close();
    const app = await start();
    await join(newToken(), 'boy', GROUP_A);
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
      const r = await join(newToken(), section, GROUP_A);
      expect(r.status).toBe(400);
      expect(r.body.error).toBe('bad_section');
    }
  });

  it('rejects bad group ids', async () => {
    const bad = [
      undefined, 42, '', 'hello', '2026-11-17:dhuhr', '2026-11-17:lunch:12:04',
      '2026-11-17:dhuhr:24:00', '2026-11-17:dhuhr:12:60', '2026-02-30:dhuhr:12:04',
      '2026-11-17:dhuhr:12:04:extra', ' 2026-11-17:dhuhr:12:04',
      '2026-11-17:dhuhr:14:05', // more than 2 hours ahead
      '2026-11-17:fajr:09:30', // more than 2 hours ago
      '2026-11-17:fajr:11:30', // already over
      '2026-11-18:dhuhr:12:04', // tomorrow
    ];
    for (const groupId of bad) {
      const r = await join(newToken(), 'boy', groupId);
      expect(r.status, String(groupId)).toBe(400);
    }
    expect((await board(newToken())).body.groups).toEqual({});
  });

  it('accepts groups up to 2 hours ahead', async () => {
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
    const big = JSON.stringify({ section: 'boy', groupId: GROUP_A, pad: 'x'.repeat(5000) });
    expect((await api(newToken(), '/api/join', big)).status).toBe(413);
  });

  it('unknown api routes are 404', async () => {
    expect((await api(newToken(), '/api/nope')).status).toBe(404);
  });
});

describe('abuse protection', () => {
  it('rate limits per device', async () => {
    const me = newToken();
    const statuses = [];
    for (let i = 0; i < serverConfig.limits.perToken + 1; i++) {
      statuses.push((await join(me, 'boy', GROUP_A)).status);
    }
    expect(statuses.at(-2)).toBe(200);
    expect(statuses.at(-1)).toBe(429);

    clock += 60000;
    expect((await join(me, 'boy', GROUP_A)).status).toBe(200);
  });

  it('rate limits per IP across devices', async () => {
    server.close();
    await start({ ...serverConfig, limits: { ...serverConfig.limits, perIp: 3 } });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await join(newToken(), 'boy', GROUP_A)).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('caps the number of entries', async () => {
    server.close();
    await start({ ...serverConfig, maxEntries: 2 });
    const a = newToken();
    expect((await join(a, 'boy', GROUP_A)).status).toBe(200);
    expect((await join(newToken(), 'boy', GROUP_A)).status).toBe(200);
    expect((await join(newToken(), 'boy', GROUP_A)).status).toBe(503);
    // moving an existing spot still works when full
    expect((await join(a, 'boy', GROUP_B)).status).toBe(200);
  });
});

describe("I'm coming", () => {
  const coming = (token, section, groupId) => api(token, '/api/join', { section, groupId, state: 'going' });

  beforeEach(() => { clock = tunis('12:06:00'); });

  it('shows that someone is coming, and counts boys who are coming', async () => {
    await join(newToken(), 'boy', GROUP_A);
    const me = newToken();
    const r = await coming(me, 'boy', GROUP_A);
    expect(r.body.groups[GROUP_A]).toEqual({ boys: 2, girls: false, coming: true });
    expect(r.body.mine).toEqual({ groupId: GROUP_A, state: 'going' });
  });

  it('girls who are coming are still only yes/no', async () => {
    await coming(newToken(), 'girl', GROUP_A);
    const a = await board(newToken());
    await coming(newToken(), 'girl', GROUP_A);
    await coming(newToken(), 'girl', GROUP_A);
    const b = await board(newToken());
    expect(a.body.groups[GROUP_A]).toEqual({ boys: 0, girls: true, coming: true });
    expect(b.body.groups[GROUP_A]).toEqual(a.body.groups[GROUP_A]);
  });

  it('"coming" expires 7 minutes after the tap', async () => {
    await coming(newToken(), 'boy', GROUP_A);
    clock = tunis('12:12:59');
    expect((await board(newToken())).body.groups[GROUP_A]).toEqual({ boys: 1, girls: false, coming: true });
    clock = tunis('12:13:00');
    expect((await board(newToken())).body.groups).toEqual({});
  });

  it('"coming" ends with its group if that is sooner', async () => {
    clock = tunis('12:16:00');
    await coming(newToken(), 'boy', GROUP_A); // group 12:04 ends 12:19
    clock = tunis('12:19:00');
    expect((await board(newToken())).body.groups).toEqual({});
  });

  it('is refused for a group that ends before you can arrive (less than 2 minutes left)', async () => {
    clock = tunis('12:17:01'); // group 12:04 ends 12:19
    const r = await coming(newToken(), 'boy', GROUP_A);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('too_late');
    clock = tunis('12:17:00');
    expect((await coming(newToken(), 'boy', GROUP_A)).status).toBe(200);
  });

  it('can start a new group a few minutes from now', async () => {
    const r = await coming(newToken(), 'boy', '2026-11-17:dhuhr:12:08');
    expect(r.status).toBe(200);
    expect(r.body.groups['2026-11-17:dhuhr:12:08']).toEqual({ boys: 1, girls: false, coming: true });
  });

  it('rejects bad states', async () => {
    for (const state of ['here', 'praying', 1, '']) {
      const r = await api(newToken(), '/api/join', { section: 'boy', groupId: GROUP_A, state });
      expect(r.status, String(state)).toBe(400);
    }
  });
});

describe('Isha after midnight', () => {
  it('an Isha time before noon is on the night after the adhan', async () => {
    clock = tunis('23:50:00');
    const r = await join(newToken(), 'boy', '2026-11-17:isha:00:20');
    expect(r.status).toBe(200);
    clock = tunis('00:34:59', '2026-11-18');
    expect((await board(newToken(), '2026-11-17:isha')).body.groups['2026-11-17:isha:00:20'].boys).toBe(1);
    clock = tunis('00:35:00', '2026-11-18');
    expect((await board(newToken(), '2026-11-17:isha')).body.groups).toEqual({});
  });
});

describe('free times', () => {
  it('any minute is a valid group, and people who pick the same time are one group', async () => {
    const a = await join(newToken(), 'boy', '2026-11-17:dhuhr:12:07');
    expect(a.status).toBe(200);
    await join(newToken(), 'girl', '2026-11-17:dhuhr:12:07');
    const r = await join(newToken(), 'boy', '2026-11-17:dhuhr:12:41');
    expect(r.body.groups).toEqual({
      '2026-11-17:dhuhr:12:07': group(1, { girls: true }),
      '2026-11-17:dhuhr:12:41': group(1),
    });
  });
});
