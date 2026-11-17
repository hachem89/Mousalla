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
    const tokenHash = hash(token);
    const ipHash = hash(req.ip || '');
    const { limits } = config;
    const ok = limiter.allow(`t|${tokenHash}`, limits.perToken, t) && limiter.allow(`i|${ipHash}`, limits.perIp, t);
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
    const { section, groupId, state = 'joined', friends = 0 } = req.body ?? {};
    const t = now();
    if (!SECTIONS.includes(section)) return fail(res, 400, 'bad_section');
    if (!STATES.includes(state)) return fail(res, 400, 'bad_state');
    if (!Number.isInteger(friends) || friends < 0 || friends > appConfig.maxFriends) return fail(res, 400, 'bad_friends');
    const group = parseGroup(groupId, t);
    if (!group) return fail(res, 400, 'bad_group');
    // "I'm coming" means arriving in about 2 minutes: only for a group that is still on by then.
    if (state === 'going' && group.end - t < appConfig.comingMinutes * 60000) return fail(res, 400, 'too_late');
    if (!board.join(req.tokenHash, section, group, t, state, friends)) return fail(res, 503, 'board_full');
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
