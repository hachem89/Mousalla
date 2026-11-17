# Mousalla

**A live board for the prayer room at INSAT (Tunis): see who is going to pray,
and pray together.**

- **Open it:** https://mousalla-nvsu.onrender.com
- **Poster for the room (with QR code):** https://mousalla-nvsu.onrender.com/poster.html

Contents: [The problem](#the-problem) · [The solution](#the-solution) ·
[How to use it](#how-to-use-it) · [Install it on your phone](#install-it-on-your-phone) ·
[The QR code poster](#the-qr-code-poster) · [Privacy](#privacy) ·
[The rules in detail](#the-rules-in-detail) · [Prayer times](#how-prayer-times-are-computed) ·
[Run it yourself](#run-it-yourself) · [Configuration](#configuration) ·
[Deploy](#deploy) · [Contributing](#contributing) · [Project layout](#project-layout)

## The problem

Students at INSAT pray in the prayer room between classes, at different times.
Praying in jama'ah (together) is better than praying alone, but in practice:

- you arrive, find nobody, pray alone, and someone walks in two minutes later;
- a group starts while a friend is on the stairs, and nobody knew to wait;
- you would come later if you knew others were coming, but you can't tell;
- the imam doesn't know whether sisters are praying behind the curtain, so he
  doesn't know whether to recite aloud.

There is no simple way to say "I'm coming, wait for me" to people you may not
even know.

## The solution

Mousalla is one shared screen for the room, on everyone's phone:

- the **prayer times** for INSAT, with the current prayer and a countdown;
- the **groups** for the current prayer: who prays when, and how many;
- one tap to say **"I'm coming"** so the group waits for you;
- your **own time** if you can't make it now, so others can join you later;
- a small **drawing of the room** per group, so the imam sees at a glance who
  is there and who is still on the way;
- a banner for the brothers when **sisters are praying** too: "Please pray
  aloud."

It needs no account and no name, and it never counts the sisters: they only
appear as "Girls: Yes" or "No".

## How to use it

1. **Scan the QR code** on the poster in the prayer room, or open
   https://mousalla-nvsu.onrender.com.
2. **Answer one question: Boy or Girl?** That's all. You can change it later
   with **Settings** (top right).
3. **Look at the top card.** It shows the current prayer, its time and when it
   started, and the next prayer with a countdown.
4. **Look at the groups.** Each group shows its time, "Praying now" or
   "Starts in 12 min", and a drawing of the room:
   - ■ solid places: brothers in the group;
   - ▢ dashed places: brothers on their way;
   - the curtain at the back: "Girls: Yes" or "No".
5. **Do one thing:**
   - **I'm coming** on a group that is praying now: "wait for me, I'll be
     there in about 2 minutes";
   - **Join** a group that starts later;
   - **Start a group now** when nobody is praying;
   - **Other time:** type the time you can come and tap **Create group**.
     Others will see it and can join you.
6. **Brothers are asked "How many are you?"** (1 = just me, up to 11). Coming
   with 3 classmates? Tap 4, and the room shows 4 places. Sisters are not
   asked.
7. **Can't make it after all?** Tap **I can't come** in your group.

**For the imam:** count the brothers in the room and compare with the drawing.
When there are no dashed places left, everyone who said "I'm coming" is there.
If the banner "Girls are praying behind you today. Please pray aloud." is
shown, sisters are in the group.

## Install it on your phone

Mousalla is a web app you can install like a normal app. It has its own icon,
opens full screen, and works offline.

- **Android (Chrome):** open the site, then tap **Settings → Install app** in
  Mousalla, or Chrome's menu **⋮ → Install app / Add to Home screen**.
- **iPhone (Safari):** open the site, tap **Share** (the square with an arrow),
  then **Add to Home Screen**.
- **Computer (Chrome / Edge):** click the install icon in the address bar.

**Offline:** after your first visit, the app opens without internet. Prayer
times and the countdown keep working, because they are computed on your
phone. The board shows "Offline… Retrying" until the connection comes back.

**Updates** arrive by themselves: a new version is picked up the next time you
open the app.

## The QR code poster

The app makes its own printable poster for the prayer room:

1. Open https://mousalla-nvsu.onrender.com/poster.html.
2. Click **Print this poster**. It fits one A4 page.
3. Before hanging it, scan the QR code with a phone to check it opens the site.

The poster shows the Mousalla logo, a large QR code, the address, three steps
(scan, choose Boy or Girl, tap "I'm coming" or pick a time) and the privacy
promise. The QR code always points to the site you opened the poster from; to
make one for another address, add `?url=`, for example
`/poster.html?url=https://example.org/`.

## Privacy

These are promises, not goals:

- No accounts, no names, no location access (no GPS), no analytics, no cookies.
- No third-party requests. Fonts and icons are served by the app itself.
- Prayer times are computed on your phone.
- Your phone stores two things: your Boy/Girl choice and a random token. The
  token only lets you move or cancel your own spot, and stops one phone from
  joining twice.
- The server keeps, **in memory only** (never on disk): a salted hash of the
  token, boy/girl, the group (its time), a state (joined or coming), the
  number of friends coming along, and an expiry time. Every spot disappears
  when its group ends. A restart wipes everything.
- **Girls are never counted.** The server itself only ever sends "girls: yes or
  no" per group; the number of girls (and of their friends) never leaves it.
  Boys' counts are public.
- The server does not log requests, IP addresses or tokens. IPs and tokens are
  only used, hashed, for rate limiting.

## The rules in detail

- **Prayer windows.** People can pray together from the adhan until 5 minutes
  before the next prayer. Fajr ends 5 minutes before sunrise, and Isha 5
  minutes before the next Fajr (Isha times after midnight count as the same
  night). The board shows the current prayer during its window, then the next
  prayer. Any time inside the window can be chosen, however far ahead; nobody
  can announce Dhuhr during Asr.
- **The first group.** When a prayer enters, a group at the adhan time is on
  the board automatically, even before anyone joins it.
- **I'm coming** means "about 2 minutes". It is only offered on a group that is
  still on 2 minutes later, so a group never disappears before you arrive.
  When nobody is praying, or the group praying is about to end, **Start a group
  now** starts a new group in 2 minutes, like a second jama'ah, as long as that
  is still inside the prayer's time. The server applies the same rule.
- **Other time.** If the time you type is within 10 minutes of an existing
  group, the app asks "A group already prays at 12:40. Pray with them?" so
  people end up together.
- **How many are you?** 1 to 11 (you and up to 10 friends, checked by the
  server). Friends of brothers are added to the drawing; friends of sisters
  change nothing. "Change" in your group updates it.
- **The room drawing.** The mihrab, the imam's place, then rows of 5, 7, 7 and
  7 places (27 in all, then "+N"). Brothers fill it in prayer order, each row
  from the middle out. Empty groups just say "Nobody yet".
- **Imam banner.** On the brothers' view only, when a group praying now has at
  least one sister (joined or coming).
- **Expiry.** A group leaves the board 15 minutes after its time. "Coming" ends
  7 minutes after the tap (at the latest when the group ends). Nothing stays
  forever: a new prayer starts with an empty board.
- The board refreshes every 5 seconds while the app is open on screen.

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
saving), whatever the phone's own timezone is. The location is INSAT, Centre
Urbain Nord (36.843, 10.196).

The tests compare the results with independently computed reference values for
17 and 18 November 2026 (they must agree within one minute). If a time differs
from the official timetable, adjust `offsets` in
[`src/config.js`](src/config.js).

## Run it yourself

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
git clone https://github.com/hachem89/Mousalla.git
cd Mousalla
npm install
npm run build    # build the app into dist/
npm start        # serve it on http://localhost:3000
```

Other commands:

```bash
npm test                      # run the tests
npm run times                 # print today's and tomorrow's prayer times
npm run times -- 2026-11-17   # times for a given day
```

While developing, run `npm run dev:server` and `npm run dev` side by side and
open http://localhost:5173 (it reloads on every change and forwards `/api` to
the server). After changing server code, restart the server: Node does not
reload it by itself.

## Configuration

App settings are in [`src/config.js`](src/config.js):

| Option | Default | Meaning |
| --- | --- | --- |
| `latitude`, `longitude` | `36.843`, `10.196` | INSAT, Centre Urbain Nord |
| `timeZone` | `Africa/Tunis` | Used for "today" and for showing times |
| `fajrAngle`, `ishaAngle` | `18`, `18` | Sun angles below the horizon |
| `offsets` | all `0` | Minutes added to each time, to match the official timetable |
| `endBeforeNextMinutes` | `5` | A prayer's window runs from its adhan until this many minutes before the next prayer (Fajr: before sunrise; Isha: before the next Fajr) |
| `groupMinutes` | `15` | How long a group stays on the board after its time |
| `suggestJoinMinutes` | `10` | Picking a time this close to a group suggests joining it |
| `comingMinutes` | `2` | What "I'm coming" means; a new group starts this many minutes from now when nobody is praying |
| `comingExpiresMinutes` | `7` | A "coming" spot ends this long after the tap |
| `maxFriends` | `10` | Most friends one person can bring (checked by the server) |
| `pollMs` | `5000` | How often the board refreshes |

Server settings are in [`server/config.js`](server/config.js) and can be set with
environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `TRUST_PROXY` | `0` | Number of proxies in front of the app (set `1` on most hosts) |
| `MAX_ENTRIES` | `5000` | Maximum spots kept at once |

Rate limits (requests per minute) are in the same file: 40 per phone and 3000
per IP address (a whole campus can share one address).

All text shown in the app is in [`src/strings.js`](src/strings.js).

### API

All requests send the phone's token in an `X-Device-Token` header (32 hex
characters).

| Request | Body | Answer |
| --- | --- | --- |
| `GET /api/board?prayer=2026-11-17:dhuhr` | – | `{ groups: { "<group id>": { boys, boysComing, girls, coming } }, mine: { groupId, state, friends } \| null }` |
| `POST /api/join` | `{ section: "boy" \| "girl", groupId: "2026-11-17:dhuhr:12:10", state?: "joined" \| "going", friends?: 0–10 }` | same as board |
| `POST /api/cancel` | `{ prayer: "2026-11-17:dhuhr" }` | same as board |
| `GET /health` | – | `ok` (for an uptime monitor; no token needed) |

Per group: `boys` = number of boys (joined or coming, friends included),
`boysComing` = how many of them are on the way, `girls` = true/false only,
`coming` = true/false, someone said "I'm coming". `"going"` is "I'm coming".

Group ids are made by the phone: date of the adhan, prayer and time (Tunis),
any minute. The first person to choose a time creates the group. The server
does not compute prayer times; it checks the id format, that the time is
within 12 hours of now (the app keeps it inside the prayer window), and forgets
the spot when the group is over (time + `groupMinutes`).

## Deploy

The app is one small Node server with everything in memory, so it must run as
**a single instance**. It is hosted for free on [Render](https://render.com);
the repository contains a [`render.yaml`](render.yaml).

1. Create a free account on render.com (sign in with GitHub).
2. Click **New → Blueprint**, pick this repository, and click **Apply**.
   Render reads `render.yaml`: it runs `npm ci && npm run build`, then
   `npm start`, in Frankfurt (closest to Tunis), with `TRUST_PROXY=1`.
3. Wait for the first deploy (a few minutes). The app is at
   `https://<service-name>.onrender.com`.
4. Every push to `main` deploys again automatically. A deploy restarts the
   server and clears the board, so push outside prayer times.

**Keep it awake.** On the free plan, the server sleeps after 15 minutes
without requests and takes about a minute to wake up, and sleeping clears the
board. A free uptime monitor (for example [UptimeRobot](https://uptimerobot.com))
that requests `https://<service-name>.onrender.com/health` every 5 minutes
keeps it awake. `/health` only answers `ok`; the monitor never sees users or
the board. Running all month uses at most 744 of the 750 free hours Render
gives each month.

Any other host that runs `npm ci && npm run build` then `npm start` works the
same way (set `PORT` if the host requires it). Avoid serverless hosts: the board
needs one long-running process.

## Contributing

Ideas, bug reports and fixes are welcome.

- **Report a problem or suggest an idea:** open an
  [issue](https://github.com/hachem89/Mousalla/issues). Say what you did, what
  you expected and what happened (a screenshot helps).
- **Wrong prayer time?** Open an issue with the date, the prayer, the time
  shown in the app and the official time.
- **Send a change:**
  1. Fork the repository and create a branch (`git checkout -b fix-countdown`).
  2. Make your change and run `npm test`. Add a test when you fix a bug or
     change a rule.
  3. Check it in the browser (`npm run build` and `npm start`, or the dev
     servers above), on a phone-sized window.
  4. Write short, lowercase, imperative commit messages, for example
     `fix countdown at midnight` or `add room drawing`.
  5. Open a pull request explaining what changes for the people using the app.

Please keep these in mind:

- **Keep it simple.** The app should be understood in a few seconds and need
  at most two taps for anything. Prefer removing to adding.
- **Privacy rules are not negotiable:** no accounts, names, location,
  analytics, cookies or third-party requests; nothing written to disk; and the
  server must never send a number of girls, only yes/no.
- All text shown to users goes in [`src/strings.js`](src/strings.js).
- No frameworks: plain HTML, CSS and JavaScript, and as few dependencies as
  possible.
- Accessibility: real buttons, labels for screen readers, 48 px touch targets,
  and never color alone to say something.

## Project layout

```
index.html, poster.html   pages
src/config.js             app settings (location, angles, offsets, groups)
src/strings.js            all text shown in the app
src/prayer.js             prayer times (adhan) and Tunis time helpers
src/groups.js             prayer windows, which prayer the board shows, groups
src/main.js, style.css    the page, Boy/Girl, settings, clock
src/hero.js               the prayer card (current prayer big, next small)
src/board.js              the groups, "I'm coming", "How many are you?", "Other time"
src/room.js               the pixel drawing of the prayer room
src/device.js, api.js     Boy/Girl choice, device token, server calls
src/sw.js                 offline cache (filled in at build time)
src/poster.js, poster.css printable QR poster
server/                   Express server, in-memory board, rate limits
scripts/                  print prayer times
test/                     prayer times, groups, server
render.yaml               Render deploy settings
```

## License

[MIT](LICENSE).
