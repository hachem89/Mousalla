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
};
