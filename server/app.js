import crypto from 'node:crypto';
import fs from 'node:fs';
import express from 'express';
import serverConfig from './config.js';
import appConfig from '../src/config.js';
import { createBoard, parseGroup, isPrayerKey, SECTIONS, STATES } from './board.js';

const TOKEN_RE = /^[a-f0-9]{32}$/;
const MINUTE = 60000;

// Fixed-window counters, in memory.
function createLimiter() {
  const buckets = new Map();
  return {
    allow(key, max, now) {
      let b = buckets.get(key);
      if (!b || b.reset <= now) {
        if (buckets.size > 100000) buckets.clear();
        b = { count: 0, reset: now + MINUTE };
        buckets.set(key, b);
      }
      b.count += 1;
      return b.count <= max;
    },
    sweep(now) {
      for (const [key, b] of buckets) if (b.reset <= now) buckets.delete(key);
    },
  };
}

export function createApp({ now = () => Date.now(), staticDir, config = serverConfig } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  const board = createBoard({ maxEntries: config.maxEntries });
  const limiter = createLimiter();

  // Tokens and IPs are only kept as salted hashes. The salt changes on every restart.
  const salt = crypto.randomBytes(32);
  const hash = (value) => crypto.createHmac('sha256', salt).update(value).digest('base64url');

  const fail = (res, status, error) => res.status(status).json({ error });

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const token = req.get('x-device-token') || '';
    if (!TOKEN_RE.test(token)) return fail(res, 400, 'bad_token');

    const t = now();
    const write = req.method !== 'GET';
    const tokenHash = hash(token);
    const ipHash = hash(req.ip || '');
    const { limits } = config;
    const ok = write
      ? limiter.allow(`wt|${tokenHash}`, limits.writePerToken, t) && limiter.allow(`wi|${ipHash}`, limits.writePerIp, t)
      : limiter.allow(`rt|${tokenHash}`, limits.readPerToken, t) && limiter.allow(`ri|${ipHash}`, limits.readPerIp, t);
    if (!ok) return fail(res, 429, 'too_many_requests');

    req.tokenHash = tokenHash;
    next();
  });

  app.use('/api', express.json({ limit: '1kb' }));

  app.get('/api/board', (req, res) => {
    const { prayer } = req.query;
    if (!isPrayerKey(prayer)) return fail(res, 400, 'bad_prayer');
    res.json(board.view(req.tokenHash, prayer, now()));
  });

  app.post('/api/join', (req, res) => {
    const { section, groupId, state = 'joined', eta = 0 } = req.body ?? {};
    const t = now();
    if (!SECTIONS.includes(section)) return fail(res, 400, 'bad_section');
    if (!STATES.includes(state)) return fail(res, 400, 'bad_state');
    if (state === 'going' && !appConfig.arrivalOptions.includes(eta)) return fail(res, 400, 'bad_eta');
    const group = parseGroup(groupId, t);
    if (!group) return fail(res, 400, 'bad_group');
    // "On my way" and "I'm here" only make sense once the group's time has come.
    if (state !== 'joined' && group.start > t) return fail(res, 400, 'not_started');
    if (!board.join(req.tokenHash, section, group, t, state, eta)) return fail(res, 503, 'board_full');
    res.json(board.view(req.tokenHash, group.prayer, t));
  });

  app.post('/api/cancel', (req, res) => {
    const { prayer } = req.body ?? {};
    if (!isPrayerKey(prayer)) return fail(res, 400, 'bad_prayer');
    const t = now();
    board.cancel(req.tokenHash, prayer, t);
    res.json(board.view(req.tokenHash, prayer, t));
  });

  app.use('/api', (req, res) => fail(res, 404, 'not_found'));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, {
      setHeaders(res, file) {
        // Built files have a hash in their name, so they never change. Everything else is rechecked.
        const cache = /[\\/]assets[\\/]/.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache';
        res.set('Cache-Control', cache);
      },
    }));
  }

  // Bad JSON, oversized bodies, etc. Nothing is logged.
  app.use((err, req, res, next) => {
    fail(res, err.status && err.status < 500 ? err.status : 500, 'bad_request');
  });

  app.cleanup = () => {
    board.sweep(now());
    limiter.sweep(now());
  };
  app.board = board;
  return app;
}
