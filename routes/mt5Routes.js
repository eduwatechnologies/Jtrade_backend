const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { apiKeyAuth } = require("../middleware/apiKeyAuth");
const {
  regenerateKey,
  syncTrades,
  getKeyStatus,
  getSyncStatus,
} = require("../controllers/mt5Controller");
const { rateLimit } = require("../middleware/rateLimit");

// Get API key status
router.get("/api-key/status", protect, getKeyStatus);

// Regenerate MT5 API key (user must be authenticated with JWT)
router.post("/api-key/regenerate", protect, regenerateKey);

// Get sync status
router.get("/status", protect, getSyncStatus);

// Sync trades from MT5 EA using x-api-key
router.post(
  "/trades/sync",
  rateLimit({ windowMs: 60 * 1000, max: 120 }),
  apiKeyAuth,
  syncTrades
);
// Sync status for frontend (JWT)
router.get("/sync/status", protect, getSyncStatus);

module.exports = router;
