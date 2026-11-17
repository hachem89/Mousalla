# Mousalla

A live board for the prayer room at INSAT (Tunis).

It shows today's prayer times and a countdown to the next prayer. Later it will
let people say "I'm going to pray (now or later)" so others can join and wait
for each other.

> Status: **Phase 1** – prayer times and app shell. The live board (server,
> slots) comes in the next phases.

## Privacy

These are promises, not goals:

- No accounts, no names, no location access (no GPS), no analytics, no cookies.
- No third-party requests. Fonts and icons are served by the app itself.
- Prayer times are computed on your phone. Nothing leaves it in Phase 1.
- Coming in Phase 2: the server keeps only short-lived, anonymous data in memory
  (nothing on disk), and **never sends girls' counts to anyone** – only a yes/no.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev      # open http://localhost:5173
npm test         # run the tests
npm run times    # print today's and tomorrow's times
npm run times -- 2026-11-17   # times for a given day
npm run build    # production build in dist/
```

## Configuration

Everything is in [`src/config.js`](src/config.js):

| Option | Default | Meaning |
| --- | --- | --- |
| `latitude`, `longitude` | `36.843`, `10.196` | INSAT, Centre Urbain Nord |
| `timeZone` | `Africa/Tunis` | Used for "today" and for showing times |
| `fajrAngle`, `ishaAngle` | `18`, `18` | Sun angles below the horizon |
| `offsets` | all `0` | Minutes added to each time, to match the official timetable |

All UI text is in [`src/strings.js`](src/strings.js).

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
