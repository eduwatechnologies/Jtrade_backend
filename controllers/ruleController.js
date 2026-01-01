const Trade = require("../models/Trade");
const TradingRule = require("../models/TradingRule");
const mongoose = require("mongoose");

// Get all rules for the current user
const getRules = async (req, res) => {
  try {
    const rules = await TradingRule.find({ user: req.user._id });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get rule compliance statistics
const getRuleStats = async (req, res) => {
  try {
    const stats = await Trade.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: "$ruleEvaluations" },
      {
        $group: {
          _id: "$ruleEvaluations.rule",
          ruleName: { $first: "$ruleEvaluations.ruleName" },
          total: { $sum: 1 },
          passed: {
            $sum: { $cond: ["$ruleEvaluations.passed", 1, 0] },
          },
        },
      },
      {
        $project: {
          ruleId: "$_id",
          ruleName: 1,
          total: 1,
          passed: 1,
          passRate: { $multiply: [{ $divide: ["$passed", "$total"] }, 100] },
        },
      },
    ]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new rule
const createRule = async (req, res) => {
  try {
    const { name, category, condition } = req.body;

    const rule = new TradingRule({
      user: req.user._id,
      name,
      category,
      condition,
    });

    const createdRule = await rule.save();
    res.status(201).json(createdRule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a rule
const updateRule = async (req, res) => {
  try {
    const { name, category, condition, isActive } = req.body;

    const rule = await TradingRule.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }

    rule.name = name || rule.name;
    rule.category = category || rule.category;
    rule.condition = condition || rule.condition;
    if (typeof isActive !== "undefined") {
      rule.isActive = isActive;
    }

    const updatedRule = await rule.save();
    res.json(updatedRule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a rule
const deleteRule = async (req, res) => {
  try {
    const rule = await TradingRule.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }

    res.json({ message: "Rule removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  getRuleStats,
};
