// Prints today's and tomorrow's prayer times (Tunis time).
// Usage: npm run times [-- YYYY-MM-DD]
import { TIMES, computeTimes, localDate, addDays, formatTime } from '../src/prayer.js';

const start = process.argv[2] || localDate();
for (const date of [start, addDays(start, 1)]) {
  const times = computeTimes(date);
  console.log(date + '  ' + TIMES.map((k) => `${k} ${formatTime(times[k])}`).join('  '));
}
