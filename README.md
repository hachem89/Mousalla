# Mousalla

A live board for the prayer room at INSAT (Tunis).

It shows the prayer times and lets people say when they will come and pray, so
others can join them and wait for each other.

Contents: [How it works](#how-it-works) · [Privacy](#privacy) ·
[Run it](#run-it) · [Configuration](#configuration) ·
[Prayer times](#how-prayer-times-are-computed) · [Deploy](#deploy) ·
[Poster](#poster-for-the-room) · [Project layout](#project-layout)

## How it works

- On first launch you answer one question: **Boy or Girl?** (changeable in
  settings, the button top right).
- The top card shows the **current prayer** in big (with "Started 26 min
  ago"), and the next prayer in small below it with a countdown. Before Fajr
  and between sunrise and Dhuhr, the next prayer is shown big with a countdown.
- **Main group**: when a prayer enters, a group at the adhan time is on the
  board automatically, even before anyone joins it.
- **I'm coming, wait for me: 1 / 2 / 5 min.** One tap tells everyone to wait.
  It joins the group praying now (the one that started most recently), or, if
  nobody is praying right now, starts a new group in that many minutes that
  others can join. Everyone sees "Someone is coming. Wait about N min."
- **Join** any group on the board, or **I can't come** to leave yours.
- **Can't make it? Pick your own time.** Type a time; it becomes a group that
  others can join. It must be inside the prayer's time (for example Dhuhr
  12:04–13:18), so nobody can announce Dhuhr during Asr. If the time is within
  10 minutes of an existing group, the app asks "A group already prays at
  12:40. Pray with them?" so people end up together.
- Every group shows **Praying now** or **Starts in N min**, **Boys: N** and
  **Girls: Yes/No**. The board refreshes every 5 seconds.
- The board shows the current prayer while people can still come (its window),
  then the next prayer. Groups can be joined up to 2 hours ahead.
- **Imam banner**: on the Boys' view, when a group praying now has at least
  one girl (joined or coming), a big banner says "Girls are praying behind you
  today. Please pray aloud."
- **Expiry**: a group leaves the board 15 minutes after its time. "Coming"
  ends 5 minutes after the announced arrival (at the latest when the group
  ends). A new prayer starts with an empty board.

## Install and offline

Mousalla is an installable web app (PWA). On Android Chrome use the browser's
"Install app" / "Add to Home screen" (or **Install app** in the app's settings
when shown). On iPhone use Share → "Add to Home Screen".

After the first visit the app opens without a connection: the prayer times and
countdown work offline; the board says it is offline and retries every 5
seconds. A new version is picked up on the next launch after it is deployed.

## Privacy

These are promises, not goals:

- No accounts, no names, no location access (no GPS), no analytics, no cookies.
- No third-party requests. Fonts and icons are served by the app itself.
- Prayer times are computed on your phone.
- Your phone stores two things: your Boy/Girl choice and a random token. The
  token only lets you move or cancel your own spot, and stops one phone from
  joining twice.
- The server keeps, **in memory only** (never on disk): a salted hash of the
  token, boy/girl, the group (its time), a state (joined, or coming with the
  announced arrival) and an expiry time. Every spot disappears when its group
  ends. A restart wipes everything.
- **Girls are never counted.** The server itself only ever sends "girls: yes or
  no" per group; the number of girls never leaves it. Boys' counts are public.
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
node scripts/icons.js         # redraw the PNG icons from public/icon.svg
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
| `windows` | Fajr 45, Dhuhr 75, Asr 60, Maghrib 40, Isha 60 | Minutes after the adhan in which people can pray together; your own time must be inside it |
| `groupMinutes` | `15` | How long a group stays on the board after its time |
| `suggestJoinMinutes` | `10` | Picking a time this close to a group suggests joining it |
| `arrivalOptions` | `[1, 2, 5]` | "I'm coming in … min" buttons |
| `goingGraceMinutes` | `5` | A "coming" spot ends this long after the announced arrival |
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
| `GET /api/board?prayer=2026-11-17:dhuhr` | – | `{ groups: { "<group id>": { boys, girls, wait } }, mine: { groupId, state } \| null }` |
| `POST /api/join` | `{ section: "boy" \| "girl", groupId: "2026-11-17:dhuhr:12:10", state?: "joined" \| "going", eta?: 1 \| 2 \| 5 }` | same as board |
| `POST /api/cancel` | `{ prayer: "2026-11-17:dhuhr" }` | same as board |

Per group: `boys` = number of boys, `girls` = true/false only, `wait` = minutes
until the last person who is coming arrives (or `null`). `"going"` is "I'm
coming" and needs `eta`.

Group ids are made by the phone: date, prayer and time (Tunis), any minute. The
first person to choose a time creates the group; there is nothing else to
create. The server does not compute prayer times; it only checks the id format
and that the time is within 2 hours of now, and forgets the spot when the group
is over (time + `groupMinutes`).

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

The app is one small Node server with everything in memory, so it must run as
**a single instance**. The simplest free host is [Render](https://render.com);
the repository already contains a [`render.yaml`](render.yaml).

1. Create a free account on render.com (sign in with GitHub).
2. Click **New → Blueprint**, pick this repository, and click **Apply**.
   Render reads `render.yaml`: it runs `npm ci && npm run build`, then
   `npm start`, in Frankfurt (closest to Tunis), with `TRUST_PROXY=1`.
3. Wait for the first deploy (a few minutes). Your app is at
   `https://<service-name>.onrender.com`.
4. Every push to `main` deploys again automatically.

Good to know about the free plan:

- After 15 minutes without visitors the server sleeps; the next visit wakes it
  in about a minute. Installed phones still open instantly (the app is cached)
  and show "Offline… Retrying" until the server is awake.
- Sleeping or redeploying wipes the board. That is fine: spots only live for
  one prayer anyway.
- Rate limiting by IP relies on `TRUST_PROXY=1`. If every visitor seems to share
  one address, raise it to match the number of proxies in front of the app.

Any other host that runs `npm ci && npm run build` then `npm start` works the
same way (set `PORT` if the host requires it). Avoid serverless hosts: the board
needs one long-running process.

## Poster for the room

Open `/poster.html` on the deployed site (for example
`https://<service-name>.onrender.com/poster.html`) and click **Print this
poster**. It fits one A4 page and its QR code points to the site you opened it
from. To make a poster for another address, add `?url=`:
`/poster.html?url=https://example.org/`.

## Project layout

```
index.html, poster.html   pages
src/config.js             app settings (location, angles, offsets, groups)
src/strings.js            all UI text
src/prayer.js             prayer times (adhan) and Tunis time helpers
src/groups.js             which prayer the board shows, groups, time choices
src/main.js, style.css    the app screen
src/device.js, api.js     Boy/Girl choice, device token, server calls
src/sw.js                 offline cache (filled in at build time)
src/poster.js, poster.css printable QR poster
server/                   Express server, in-memory board, rate limits
scripts/                  print times, draw icons
test/                     prayer times, groups, server
render.yaml               Render deploy settings
```

## License

MIT.
