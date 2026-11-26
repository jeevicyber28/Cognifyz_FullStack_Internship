const { RateLimitError } = require("./errorHandler");

function createSlidingWindowLimiter({ windowMs = 60000, guestLimit = 10, authLimit = 30 } = {}) {
  const hitsByKey = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const windowStart = now - windowMs;
    const isAuthenticated = Boolean(req.oauthUser);
    const limit = isAuthenticated ? authLimit : guestLimit;
    const key = isAuthenticated ? `user:${req.oauthUser.sub}` : `ip:${req.ip || "local"}`;

    const existing = hitsByKey.get(key) || [];
    // Prune timestamps outside the active sliding window
    const recent = existing.filter((ts) => ts > windowStart);

    const resetTimestamp = recent.length > 0 ? Math.ceil((recent[0] + windowMs) / 1000) : Math.ceil((now + windowMs) / 1000);

    if (recent.length >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", String(resetTimestamp));
      hitsByKey.set(key, recent);
      return next(new RateLimitError(retryAfterSeconds));
    }

    recent.push(now);
    hitsByKey.set(key, recent);

    res.setHeader("X-RateLimit-Limit", String(limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - recent.length)));
    res.setHeader("X-RateLimit-Reset", String(resetTimestamp));
    res.setHeader("X-RateLimit-Tier", isAuthenticated ? "oauth-authenticated" : "guest");

    next();
  };
}

module.exports = {
  createSlidingWindowLimiter
};
