function enforceHttps(req, res, next) {
  const proto = req.headers["x-forwarded-proto"];
  if (req.secure || proto === "https") {
    return next();
  }
  return res.status(403).json({ message: "HTTPS is required" });
}

module.exports = { enforceHttps };
