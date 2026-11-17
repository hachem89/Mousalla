// All UI text lives here.
export default {
  appName: 'Mousalla',
  place: 'INSAT prayer room',

  // Next prayer
  nextPrayer: 'Next prayer',
  tomorrow: 'tomorrow',
  in: 'in',
  now: 'Now',
  noCurrent: 'Night',
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
  askWhy: 'So others know who is coming. Girls are never counted: everyone only sees "Girls: Yes" or "No".',
  boy: 'Boy',
  girl: 'Girl',
  settings: 'Settings',
  settingsLabel: (section) => `Settings. You are: ${section}`,
  iAm: 'I am a',
  close: 'Close',
  privacyNote: 'No account, no name, no location. This choice stays on this phone.',
  install: 'Install app',

  // Board
  boardTitle: (name) => `${name}: who's praying?`,
  boys: (n) => `Boys: ${n}`,
  boysHere: (n, here) => (here > 0 ? `Boys: ${n} (${here} already here)` : `Boys: ${n}`),
  girls: (yes) => `Girls: ${yes ? 'Yes' : 'No'}`,
  startsIn: (min) => (min <= 1 ? 'Starts in 1 min' : `Starts in ${min} min`),
  prayingNow: 'Praying now',
  wait: (min) => (min > 0 ? `Someone is on the way. Wait about ${min} min.` : 'Someone is arriving now. Wait for them.'),

  // Hints above the board
  loading: 'Loading the board…',
  hintEmpty: "Nobody has picked a time yet. Choose when you'll pray, and others can join you.",
  hintChoose: "Join a group below, or choose your own time.",
  hintMineLater: (time) => `You'll pray at ${time}. Others can see it and join you.`,
  hintMineNow: "It's time! Tap \"I'm here\" when you arrive.",
  hintOpens: (time) => `You can choose a time from ${time}.`,

  // My group
  myGroupTitle: (time) => `You pray at ${time}`,
  myState: {
    joined: "You're in this group ✓",
    going: "You're on your way ✓",
    here: "You're here ✓",
  },
  imHere: "I'm here",
  onMyWay: 'On my way, arriving in:',
  minutes: (m) => `${m} min`,
  onMyWayLabel: (m) => `On my way, arriving in ${m} minutes`,
  leave: "I can't come",
  leaveLabel: (time) => `Leave the ${time} group`,

  // Other groups
  groupsTitle: 'Groups',
  otherGroupsTitle: 'Other groups',
  groupLabel: (time) => `${time} group`,
  joinGroup: 'Pray with them',
  switchGroup: 'Switch to this group',

  // Choosing a time
  pickTitle: "When will you pray?",
  pickOther: 'Choose a different time',
  pickNow: 'Now',
  pickLabel: (time) => `Pray at ${time}`,
  suggest: (time) => `A group already prays at ${time}. Pray with them?`,
  suggestYes: (time) => `Yes, join ${time}`,
  suggestNo: (time) => `No, keep ${time}`,

  errors: {
    offline: "Offline: can't reach the board. Prayer times still work. Retrying…",
    too_many_requests: 'Too many taps. Wait a minute.',
    board_full: 'The board is full right now. Try again soon.',
    not_started: 'This group has not started yet.',
    default: 'Something went wrong. Try again.',
  },

  // Imam banner (boys only)
  imamTitle: 'Pray aloud',
  imamText: 'Girls are praying behind you today. Please pray aloud.',

  // Printable poster for the prayer room
  poster: {
    print: 'Print this poster',
    lead: 'Prayer times, and who is coming to pray. Pray together, wait for each other.',
    qrLabel: (url) => `QR code for ${url}`,
    steps: [
      'Scan the code',
      'Choose Boy or Girl',
      'Join a group, or choose the time you will pray',
    ],
    privacy: 'No account, no name, no location. Girls are never counted: only "Yes" or "No" is shown.',
  },
};
