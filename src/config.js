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

  // How long after the adhan people may still come and pray together (minutes).
  windows: {
    fajr: 45,
    dhuhr: 75,
    asr: 60,
    maghrib: 40,
    isha: 60,
  },

  // "I'm coming in ... min" choices. A "coming" spot expires this many
  // minutes after the announced arrival.
  arrivalOptions: [1, 2, 5],
  goingGraceMinutes: 5,

  // How often the board is refreshed (milliseconds).
  pollMs: 5000,
};
