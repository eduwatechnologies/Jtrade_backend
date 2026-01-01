const express = require("express");
const router = express.Router();
const {
  getTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  getTradeStats,
  importTrades,
} = require("../controllers/tradeController");
const { extractTradeFromImage } = require("../controllers/ocrController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware"); // Assuming you have this or need to import multer config

router.route("/").get(protect, getTrades).post(protect, createTrade);

router.post("/extract", protect, upload.single("image"), extractTradeFromImage);

router.route("/import").post(protect, importTrades);

router.route("/stats").get(protect, getTradeStats);

router
  .route("/:id")
  .get(protect, getTradeById)
  .put(protect, updateTrade)
  .delete(protect, deleteTrade);

module.exports = router;
