const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getRuleStats,
} = require("../controllers/ruleController");

router.route("/").get(protect, getRules).post(protect, createRule);
router.route("/stats").get(protect, getRuleStats);
router.route("/:id").put(protect, updateRule).delete(protect, deleteRule);

module.exports = router;
