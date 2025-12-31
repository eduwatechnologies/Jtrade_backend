const User = require("../models/User");
const { hashApiKey } = require("../utils/apiKey");

async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const secret = process.env.API_KEY_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Server configuration error" });
  }
  const hash = hashApiKey(apiKey, secret);
  const user = await User.findOne({ mt5ApiKeyHash: hash }).select("_id email");
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.mt5User = user;
  next();
}

module.exports = { apiKeyAuth };
