// App settings. Edit these, then rebuild.
export default {
  // INSAT, Centre Urbain Nord, Tunis
  latitude: 36.843,
  longitude: 10.196,
  timeZone: 'Africa/Tunis',

  // Tunisian Ministry of Religious Affairs
  fajrAngle: 18,
  ishaAngle: 18,

  // Minutes added to each computed time (can be negative).
  // Use these to match the official timetable.
  offsets: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },

  // People pick the time they will pray. Everyone who picks the same time is a group.
  // A group stays on the board this many minutes after its time.
  groupMinutes: 15,

  // Picking a time this close to an existing group suggests joining that group instead.
  suggestJoinMinutes: 10,

  // People can pray together from the adhan until this many minutes before the
  // next prayer (for Fajr: before sunrise).
  endBeforeNextMinutes: 5,

  // "I'm coming, wait for me" means about this many minutes. When nobody is
  // praying, it starts a new group this many minutes from now.
  comingMinutes: 2,
  // A "coming" spot expires this many minutes after the tap.
  comingExpiresMinutes: 7,

  // Someone can say how many friends come with them (0 to this many).
  maxFriends: 10,

  // How often the board is refreshed (milliseconds).
  pollMs: 5000,
};
