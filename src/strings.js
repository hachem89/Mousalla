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
  loading: 'Loading…',
  girls: (yes) => `Girls: ${yes ? 'Yes' : 'No'}`,
  prayingNow: 'Praying now',
  now: 'Now',
  nobodyYet: 'Nobody yet',
  startsIn: (min) => `Starts in ${min} min`,
  onTheWay: 'Wait, someone is coming',
  groupLabel: (time) => `${time} group`,

  // Hints above the board
  hintBefore: (name, time) => `Starts at ${time}. Join a group or pick a time.`,
  hintPraying: `People are praying. Tap "I'm coming" so they wait.`,
  hintNobody: 'Nobody is praying. Start a group or pick a time.',
  hintMineLater: (time) => `You pray at ${time}.`,
  hintMineNow: 'Your group is praying now.',
  hintComing: "They'll wait for you.",
  hintOpens: (time) => `Opens at ${time}.`,

  // Sections
  comingButton: "I'm coming",
  startGroup: 'Start a group now',

  // "How many are you?" (boys only)
  howMany: 'How many are you?',
  howManyHint: 'Including you. Your friends are counted with you.',
  justMe: 'Just me',
  countLabel: (n) => (n === 1 ? 'Just me' : `${n} people: me and ${n - 1} ${n === 2 ? 'friend' : 'friends'}`),
  withFriends: (n) => `you + ${n} ${n === 1 ? 'friend' : 'friends'}`,
  changeCount: 'Change',
  cancelDialog: 'Cancel',

  // Room drawing
  roomLabel: (boys, coming, girls) => `Prayer room: ${boys} ${boys === 1 ? 'boy' : 'boys'}${coming ? `, ${coming} on the way` : ''}. Girls: ${girls ? 'Yes' : 'No'}.`,
  legendHere: 'In the group',
  legendComing: 'On the way',
  ownTitle: 'Other time',
  ownLabel: 'Time I will pray',
  ownCreate: 'Create group',

  // Group buttons and my state
  join: 'Join',
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
    too_late: 'That group is finishing. Tap again to start a new one.',
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
