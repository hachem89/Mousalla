// Server settings. Environment variables override the defaults.
export default {
  port: Number(process.env.PORT) || 3000,

  // Set to the number of proxies in front of the app (e.g. 1 on most hosts)
  // so rate limiting sees the real client address.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,

  // Maximum number of spots kept in memory at once.
  maxEntries: Number(process.env.MAX_ENTRIES) || 5000,

  // Requests allowed per minute. A whole campus can share one IP, so IP limits are high.
  // A phone refreshes 12 times a minute, which leaves room for taps.
  limits: {
    perToken: 40,
    perIp: 3000,
  },
};
