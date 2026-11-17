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
  join: 'Join',
  move: 'Move here',
  yourSpot: 'Your spot ✓',
  cancel: 'Cancel',
  cancelLabel: (time) => `Cancel my spot at ${time}`,
  opensAt: (time) => `Opens ${time}`,
  hintJoin: 'Tap a time to say you will pray then.',
  hintJoined: (time) => `You're in the ${time} group. Tap another time to move.`,
  errors: {
    offline: "Can't reach the board. Retrying…",
    too_many_requests: 'Too many taps. Wait a minute.',
    board_full: 'The board is full right now. Try again soon.',
    default: 'Something went wrong. Try again.',
  },
};
