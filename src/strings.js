// All UI text lives here.
export default {
  appName: 'Mousalla',
  place: 'INSAT prayer room',

  // Prayer card
  nowLabel: 'Now',
  nextLabel: 'Next prayer',
  tomorrow: 'tomorrow',
  in: 'in',
  startedAgo: (min) => (min < 60 ? `Started ${min} min ago` : `Started ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min ago`),
  nextLine: (name, time, left) => `Next: ${name} ${time} · in ${left}`,
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
  loading: 'Loading the board…',
  boys: (n) => `Boys: ${n}`,
  girls: (yes) => `Girls: ${yes ? 'Yes' : 'No'}`,
  mainGroup: 'Main group',
  prayingNow: 'Praying now',
  openNow: 'Open now, nobody yet',
  startsIn: (min) => `Starts in ${min} min`,
  wait: (min) => (min > 0 ? `Someone is coming. Wait about ${min} min.` : 'Someone is arriving now. Wait for them.'),
  groupLabel: (time) => `${time} group`,

  // Hints above the board
  hintBefore: (name, time) => `${name} starts at ${time}. Join the main group, or pick your own time.`,
  hintPraying: `People are praying now. Tap "I'm coming" so they wait for you.`,
  hintNobody: `Nobody is praying right now. Tap "I'm coming" to start a group, or pick your own time.`,
  hintMineLater: (time) => `You'll pray at ${time}. Others can see it and join you.`,
  hintMineNow: `Your group is praying now. Tap "I'm coming" so they wait for you.`,
  hintComing: "Others can see you're coming. They'll wait for you.",
  hintOpens: (time) => `You can join from ${time}.`,

  // Sections
  groupsTitle: (name) => `${name} groups`,
  comingTitle: "I'm coming, wait for me:",
  minutes: (m) => `${m} min`,
  comingLabel: (m) => `I'm coming in ${m} minutes, wait for me`,
  ownTitle: "Can't make it? Pick your own time",
  ownLabel: 'My time',
  ownCreate: 'Create group',

  // Group buttons and my state
  join: 'Join',
  joinInstead: 'Join instead',
  myState: {
    joined: "You're in this group ✓",
    going: "You're coming ✓",
  },
  leave: "I can't come",
  leaveLabel: (time) => `Leave the ${time} group`,

  // Own time
  suggest: (time) => `A group already prays at ${time}. Pray with them?`,
  suggestYes: (time) => `Yes, join ${time}`,
  suggestNo: (time) => `No, create ${time}`,
  ownErrors: {
    empty: 'Choose a time first.',
    outside: (name, from, to) => `Choose a time between ${from} and ${to} (${name} time).`,
    past: 'That time has already passed.',
    too_early: 'That is more than 2 hours away. Try again closer to the time.',
  },

  errors: {
    offline: "Offline: can't reach the board. Prayer times still work. Retrying…",
    too_many_requests: 'Too many taps. Wait a minute.',
    board_full: 'The board is full right now. Try again soon.',
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
      "Tap \"I'm coming\", join a group, or pick your time",
    ],
    privacy: 'No account, no name, no location. Girls are never counted: only "Yes" or "No" is shown.',
  },
};
