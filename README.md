# Mousalla

A live board for the prayer room at INSAT (Tunis).

It shows the prayer times and lets people say when they will come and pray, so
others can join them and wait for each other.

> Status: **Phase 2** – prayer times, live board with slots. Coming next:
> "I'm here" / "Going now", imam banner, offline install.

## How it works

- On first launch you answer one question: **Boy or Girl?** (changeable in
  settings, the button top right).
- Each prayer is split into 15-minute slots starting at the adhan. Tap a slot to
  say you will pray then. Tap another slot to move, or **Cancel**.
- Every slot shows **Boys: N** and **Girls: Yes/No**. The board refreshes every
  5 seconds.
- The board shows the current prayer while people can still come (its window),
  then the next prayer. Slots open 2 hours before they start.

## Privacy

These are promises, not goals:

- No accounts, no names, no location access (no GPS), no analytics, no cookies.
- No third-party requests. Fonts and icons are served by the app itself.
- Prayer times are computed on your phone.
- Your phone stores two things: your Boy/Girl choice and a random token. The
  token only lets you move or cancel your own spot, and stops one phone from
  joining twice.
- The server keeps, **in memory only** (never on disk): a salted hash of the
  token, boy/girl, the slot, a state and an expiry time. Every spot disappears
  when its slot ends. A restart wipes everything.
- **Girls are never counted.** The server itself only ever sends "girls: yes or
  no" per slot; the number of girls never leaves it. Boys' counts are public.
- The server does not log requests, IP addresses or tokens. IPs and tokens are
  only used, hashed, for rate limiting.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run build    # build the app into dist/
npm start        # serve it on http://localhost:3000
npm test         # run the tests
npm run times    # print today's and tomorrow's times
npm run times -- 2026-11-17   # times for a given day
```

While developing, run `npm run dev:server` and `npm run dev` side by side and
open http://localhost:5173 (it forwards `/api` to the server).

## Configuration

App settings are in [`src/config.js`](src/config.js):

| Option | Default | Meaning |
| --- | --- | --- |
| `latitude`, `longitude` | `36.843`, `10.196` | INSAT, Centre Urbain Nord |
| `timeZone` | `Africa/Tunis` | Used for "today" and for showing times |
| `fajrAngle`, `ishaAngle` | `18`, `18` | Sun angles below the horizon |
| `offsets` | all `0` | Minutes added to each time, to match the official timetable |
| `slotMinutes` | `15` | Length of a slot |
| `windows` | Fajr 45, Dhuhr 75, Asr 60, Maghrib 40, Isha 60 | Minutes after the adhan that slots cover |
| `pollMs` | `5000` | How often the board refreshes |

Server settings are in [`server/config.js`](server/config.js) and can be set with
environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `TRUST_PROXY` | `0` | Number of proxies in front of the app (set `1` on most hosts) |
| `MAX_ENTRIES` | `5000` | Maximum spots kept at once |

Rate limits (requests per minute) are in the same file: 30 reads and 20 writes
per phone, 3000 reads and 600 writes per IP address (a whole campus can share
one address).

All UI text is in [`src/strings.js`](src/strings.js).

## API

All requests send the phone's token in an `X-Device-Token` header (32 hex
characters).

| Request | Body | Answer |
| --- | --- | --- |
| `GET /api/board?prayer=2026-11-17:dhuhr` | – | `{ slots: { "<slot id>": { boys, girls } }, mine }` |
| `POST /api/join` | `{ section: "boy" \| "girl", slotId: "2026-11-17:dhuhr:12:04" }` | same as board |
| `POST /api/cancel` | `{ prayer: "2026-11-17:dhuhr" }` | same as board |

Slot ids are made by the phone: date, prayer and start time (Tunis). The server
does not compute prayer times; it only checks the id format and that the slot
starts within 2 hours of now, and forgets the spot when the slot is over
(start + `slotMinutes`).

## How prayer times are computed

The app uses the [adhan](https://github.com/batoulapps/adhan-js) library, on the
phone, with the settings of the Tunisian Ministry of Religious Affairs:

- **Fajr**: sun 18° below the horizon.
- **Sunrise**: sun's upper edge on the horizon (library default).
- **Dhuhr**: solar noon.
- **Asr**: standard shadow – an object's shadow equals its length plus its noon
  shadow (`Madhab.Shafi` in adhan).
- **Maghrib**: sunset (library default).
- **Isha**: sun 18° below the horizon.
- Times are rounded to the nearest minute, then the offsets from the config are
  added.

"Today" and all displayed times always use Tunis time (UTC+1, no daylight
saving), whatever the phone's own timezone is.

The tests compare the results with independently computed reference values for
17 and 18 November 2026 (they must agree within one minute).

## Deploy

Coming in Phase 4.
