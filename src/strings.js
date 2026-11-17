// All UI text lives here.
export default {
  appName: 'Mousalla',
  place: 'INSAT prayer room',

  // Next prayer
  nextPrayer: 'Next prayer',
  tomorrow: 'tomorrow',
  in: 'in',
  now: 'Now',
  nowTag: 'now',
  noCurrent: 'Night',
  todayTimes: "Today's times",
  footer: 'Times for INSAT, Tunis',
  countdownLabel: (name, time) => `${name} in ${time}`,
  names: {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  },

  // First launch and settings
  askTitle: 'Boy or Girl?',
  askWhy: 'So the board can show who is coming. Girls are never counted: everyone only sees "Girls: Yes" or "No".',
  boy: 'Boy',
  girl: 'Girl',
  settings: 'Settings',
  settingsLabel: (section) => `Settings. You are: ${section}`,
  iAm: 'I am a',
  close: 'Close',
  privacyNote: 'No account, no name, no location. This choice stays on this phone.',

  // Board
  boardTitle: (name) => `${name}: who's coming?`,
  boys: (n) => `Boys: ${n}`,
  girls: (yes) => `Girls: ${yes ? 'Yes' : 'No'}`,
  loading: 'Loading…',
  noData: 'No data',
  join: 'Join',
  move: 'Move here',
  yourSpot: 'Your spot ✓',
  cancel: 'Cancel',
  cancelLabel: (time) => `Cancel my spot at ${time}`,
  opensAt: (time) => `Opens ${time}`,
  hintJoin: 'Tap a time to say you will pray then.',
  hintJoined: (time) => `You're in the ${time} group. Tap another time to move.`,
  hintNow: "Praying now? Say you're here, or that you're on your way.",
  later: 'Later',

  // Current slot
  hereCount: (n) => `${n} here`,
  wait: (min) => (min > 0 ? `Someone is on the way: wait about ${min} min.` : 'Someone is arriving now: wait for them.'),
  imHere: "I'm here",
  goingNow: 'Going now:',
  minutes: (m) => `${m} min`,
  goingLabel: (m) => `Going now, arriving in ${m} minutes`,
  myState: {
    joined: 'Your spot ✓',
    going: "You're on the way ✓",
    here: "You're here ✓",
  },

  // Imam banner (boys only)
  imamTitle: 'Pray aloud',
  imamText: 'Girls are praying behind you today. Please pray aloud.',

  install: 'Install app',

  // Printable poster for the prayer room
  poster: {
    print: 'Print this poster',
    lead: 'Prayer times, and who is coming to pray. Pray together, wait for each other.',
    qrLabel: (url) => `QR code for ${url}`,
    steps: [
      'Scan the code',
      'Choose Boy or Girl',
      'Tap the time you will pray, or "I\'m here"',
    ],
    privacy: 'No account, no name, no location. Girls are never counted: only "Yes" or "No" is shown.',
  },

  errors: {
    offline: "Offline: can't reach the board. Prayer times still work. Retrying…",
    too_many_requests: 'Too many taps. Wait a minute.',
    board_full: 'The board is full right now. Try again soon.',
    not_started: 'This time has not started yet.',
    default: 'Something went wrong. Try again.',
  },
};
