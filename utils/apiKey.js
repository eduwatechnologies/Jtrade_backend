const crypto = require("crypto");

function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function hashApiKey(apiKey, secret) {
  return crypto.createHmac("sha256", secret).update(apiKey).digest("hex");
}

module.exports = { generateApiKey, hashApiKey };
