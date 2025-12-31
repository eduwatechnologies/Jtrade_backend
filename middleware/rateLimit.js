const store = new Map();

function rateLimit(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 60;
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const bucket = store.get(key) || { count: 0, start: now };
    if (now - bucket.start > windowMs) {
      bucket.count = 0;
      bucket.start = now;
    }
    bucket.count += 1;
    store.set(key, bucket);
    if (bucket.count > max) {
      return res.status(429).json({ message: "Too many requests" });
    }
    next();
  };
}

module.exports = { rateLimit };
