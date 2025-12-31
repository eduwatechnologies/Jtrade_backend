const asyncHandler = require("express-async-handler");
const Strategy = require("../models/Strategy");
const Trade = require("../models/Trade");

// @desc    Get all strategies
// @route   GET /api/strategies
// @access  Private
const getStrategies = asyncHandler(async (req, res) => {
  const strategies = await Strategy.find({ user: req.user._id }).sort({
    name: 1,
  });
  res.json(strategies);
});

// @desc    Create a strategy
// @route   POST /api/strategies
// @access  Private
const createStrategy = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const strategyExists = await Strategy.findOne({ name, user: req.user._id });

  if (strategyExists) {
    res.status(400);
    throw new Error("Strategy already exists");
  }

  const strategy = await Strategy.create({
    user: req.user._id,
    name,
    description,
  });

  res.status(201).json(strategy);
});

// @desc    Update a strategy
// @route   PUT /api/strategies/:id
// @access  Private
const updateStrategy = asyncHandler(async (req, res) => {
  const strategy = await Strategy.findById(req.params.id);

  if (!strategy) {
    res.status(404);
    throw new Error("Strategy not found");
  }

  if (strategy.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized");
  }

  strategy.name = req.body.name || strategy.name;
  strategy.description = req.body.description || strategy.description;

  const updatedStrategy = await strategy.save();
  res.json(updatedStrategy);
});

// @desc    Delete a strategy
// @route   DELETE /api/strategies/:id
// @access  Private
const deleteStrategy = asyncHandler(async (req, res) => {
  const strategy = await Strategy.findById(req.params.id);

  if (!strategy) {
    res.status(404);
    throw new Error("Strategy not found");
  }

  if (strategy.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized");
  }

  // Optional: Remove strategy reference from trades or prevent deletion if used
  // For now, we'll just set strategy to null in trades
  await Trade.updateMany(
    { strategy: strategy._id },
    { $unset: { strategy: "" } }
  );

  await strategy.deleteOne();
  res.json({ message: "Strategy removed" });
});

// @desc    Get strategy performance stats
// @route   GET /api/strategies/stats
// @access  Private
const getStrategyStats = asyncHandler(async (req, res) => {
  const strategies = await Strategy.find({ user: req.user._id });
  const trades = await Trade.find({ user: req.user._id });

  const stats = strategies.map((strategy) => {
    const strategyTrades = trades.filter(
      (t) => t.strategy && t.strategy.toString() === strategy._id.toString()
    );

    const totalTrades = strategyTrades.length;
    const wins = strategyTrades.filter((t) => t.result === "win").length;
    const losses = strategyTrades.filter((t) => t.result === "loss").length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPL = strategyTrades.reduce((acc, t) => acc + t.profitLoss, 0);

    const winTrades = strategyTrades.filter((t) => t.profitLoss > 0);
    const lossTrades = strategyTrades.filter((t) => t.profitLoss < 0);

    const avgWin =
      winTrades.length > 0
        ? winTrades.reduce((acc, t) => acc + t.profitLoss, 0) / winTrades.length
        : 0;

    const avgLoss =
      lossTrades.length > 0
        ? lossTrades.reduce((acc, t) => acc + t.profitLoss, 0) /
          lossTrades.length
        : 0;

    return {
      _id: strategy._id,
      name: strategy.name,
      totalTrades,
      winRate,
      totalPL,
      avgWin,
      avgLoss,
    };
  });

  // Also include "No Strategy" stats
  const noStrategyTrades = trades.filter((t) => !t.strategy);
  if (noStrategyTrades.length > 0) {
    const wins = noStrategyTrades.filter((t) => t.result === "win").length;
    const totalTrades = noStrategyTrades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPL = noStrategyTrades.reduce((acc, t) => acc + t.profitLoss, 0);
    const winTrades = noStrategyTrades.filter((t) => t.profitLoss > 0);
    const lossTrades = noStrategyTrades.filter((t) => t.profitLoss < 0);

    const avgWin =
      winTrades.length > 0
        ? winTrades.reduce((acc, t) => acc + t.profitLoss, 0) / winTrades.length
        : 0;

    const avgLoss =
      lossTrades.length > 0
        ? lossTrades.reduce((acc, t) => acc + t.profitLoss, 0) /
          lossTrades.length
        : 0;

    stats.push({
      _id: "none",
      name: "No Strategy",
      totalTrades,
      winRate,
      totalPL,
      avgWin,
      avgLoss,
    });
  }

  // Sort by Total P/L descending
  stats.sort((a, b) => b.totalPL - a.totalPL);

  res.json(stats);
});

module.exports = {
  getStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  getStrategyStats,
};
