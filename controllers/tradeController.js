const asyncHandler = require("express-async-handler");
const Trade = require("../models/Trade");
const Strategy = require("../models/Strategy");

// Helper to calculate Risk/Reward
const calculateRiskMetrics = (
  entryPrice,
  stopLoss,
  takeProfit,
  positionSize,
  tradeType
) => {
  let risk = 0;
  let reward = 0;
  let rrRatio = 0;

  if (stopLoss) {
    risk = Math.abs(entryPrice - stopLoss) * positionSize;
  }

  if (takeProfit) {
    reward = Math.abs(takeProfit - entryPrice) * positionSize;
  }

  if (risk > 0 && reward > 0) {
    rrRatio = reward / risk;
  }

  return { risk, reward, rrRatio };
};

// @desc    Get all trades for logged in user
// @route   GET /api/trades
// @access  Private
const getTrades = asyncHandler(async (req, res) => {
  const { startDate, endDate, asset, result, strategy } = req.query;

  let query = { user: req.user._id };

  if (startDate || endDate) {
    query.tradeDate = {};
    if (startDate) query.tradeDate.$gte = new Date(startDate);
    if (endDate) query.tradeDate.$lte = new Date(endDate);
  }

  if (asset) {
    query.asset = { $regex: asset, $options: "i" };
  }

  if (result && result !== "all") {
    query.result = result;
  }

  if (strategy && strategy !== "all") {
    query.strategy = strategy;
  }

  const trades = await Trade.find(query)
    .populate("strategy", "name")
    .sort({ tradeDate: -1 });

  res.json(trades);
});

// @desc    Get single trade
// @route   GET /api/trades/:id
// @access  Private
const getTradeById = asyncHandler(async (req, res) => {
  const trade = await Trade.findById(req.params.id);

  if (trade) {
    if (trade.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized to view this trade");
    }
    res.json(trade);
  } else {
    res.status(404);
    throw new Error("Trade not found");
  }
});

// @desc    Create a trade
// @route   POST /api/trades
// @access  Private
const createTrade = asyncHandler(async (req, res) => {
  const {
    asset,
    market,
    tradeType,
    entryPrice,
    exitPrice,
    positionSize,
    stopLoss,
    takeProfit,
    notes,
    tradeDate,
    strategy,
    images,
    externalId,
  } = req.body;

  // Calculate profit/loss and result
  let profitLoss = 0;
  if (tradeType === "buy") {
    profitLoss = (exitPrice - entryPrice) * positionSize;
  } else {
    profitLoss = (entryPrice - exitPrice) * positionSize;
  }

  let result = "break-even";
  if (profitLoss > 0) result = "win";
  if (profitLoss < 0) result = "loss";

  // Check if externalId exists for this user to prevent duplicates
  if (externalId) {
    const tradeExists = await Trade.findOne({ user: req.user._id, externalId });
    if (tradeExists) {
      res.status(400);
      throw new Error("Trade with this External ID already exists");
    }
  }

  // Calculate Risk Metrics
  const { risk, reward, rrRatio } = calculateRiskMetrics(
    entryPrice,
    stopLoss,
    takeProfit,
    positionSize,
    tradeType
  );

  const trade = new Trade({
    user: req.user._id,
    asset,
    market,
    tradeType,
    entryPrice,
    exitPrice,
    positionSize,
    stopLoss,
    takeProfit,
    profitLoss,
    result,
    notes,
    tradeDate,
    strategy: strategy || null,
    risk,
    reward,
    rrRatio,
    images: images || [],
    externalId,
  });

  const createdTrade = await trade.save();
  res.status(201).json(createdTrade);
});

// @desc    Update a trade
// @route   PUT /api/trades/:id
// @access  Private
const updateTrade = asyncHandler(async (req, res) => {
  const {
    asset,
    market,
    tradeType,
    entryPrice,
    exitPrice,
    positionSize,
    stopLoss,
    takeProfit,
    notes,
    tradeDate,
    strategy,
    images,
  } = req.body;

  const trade = await Trade.findById(req.params.id);

  if (trade) {
    if (trade.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized to update this trade");
    }

    trade.asset = asset || trade.asset;
    trade.market = market || trade.market;
    trade.tradeType = tradeType || trade.tradeType;
    trade.entryPrice = entryPrice || trade.entryPrice;
    trade.exitPrice = exitPrice || trade.exitPrice;
    trade.positionSize = positionSize || trade.positionSize;
    trade.stopLoss = stopLoss !== undefined ? stopLoss : trade.stopLoss;
    trade.takeProfit = takeProfit !== undefined ? takeProfit : trade.takeProfit;
    trade.notes = notes || trade.notes;
    trade.tradeDate = tradeDate || trade.tradeDate;
    trade.images = images || trade.images;

    if (strategy !== undefined) {
      trade.strategy = strategy === "" ? null : strategy;
    }

    // Recalculate P/L if prices changed
    const tType = trade.tradeType;
    const ePrice = trade.entryPrice;
    const xPrice = trade.exitPrice;
    const pSize = trade.positionSize;

    let pL = 0;
    if (tType === "buy") {
      pL = (xPrice - ePrice) * pSize;
    } else {
      pL = (ePrice - xPrice) * pSize;
    }
    trade.profitLoss = pL;

    if (pL > 0) trade.result = "win";
    else if (pL < 0) trade.result = "loss";
    else trade.result = "break-even";

    // Recalculate Risk Metrics
    const { risk, reward, rrRatio } = calculateRiskMetrics(
      ePrice,
      trade.stopLoss,
      trade.takeProfit,
      pSize,
      tType
    );
    trade.risk = risk;
    trade.reward = reward;
    trade.rrRatio = rrRatio;

    const updatedTrade = await trade.save();
    res.json(updatedTrade);
  } else {
    res.status(404);
    throw new Error("Trade not found");
  }
});

// @desc    Delete a trade
// @route   DELETE /api/trades/:id
// @access  Private
const deleteTrade = asyncHandler(async (req, res) => {
  const trade = await Trade.findById(req.params.id);

  if (trade) {
    if (trade.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error("Not authorized to delete this trade");
    }

    await trade.deleteOne();
    res.json({ message: "Trade removed" });
  } else {
    res.status(404);
    throw new Error("Trade not found");
  }
});

// @desc    Get trade statistics
// @route   GET /api/trades/stats
// @access  Private
const getTradeStats = asyncHandler(async (req, res) => {
  const trades = await Trade.find({ user: req.user._id });

  if (!trades || trades.length === 0) {
    return res.json({
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      totalProfitLoss: 0,
      avgWin: 0,
      avgLoss: 0,
      avgRR: 0,
      monthlyPL: [],
      equityCurve: [],
      assetPerformance: [],
    });
  }

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win");
  const losses = trades.filter((t) => t.result === "loss");
  const totalWins = wins.length;
  const totalLosses = losses.length;

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;

  const totalProfitLoss = trades.reduce((acc, t) => acc + t.profitLoss, 0);

  const totalWinAmount = wins.reduce((acc, t) => acc + t.profitLoss, 0);
  const totalLossAmount = losses.reduce((acc, t) => acc + t.profitLoss, 0);

  const avgWin = totalWins > 0 ? totalWinAmount / totalWins : 0;
  const avgLoss = totalLosses > 0 ? totalLossAmount / totalLosses : 0;

  // Risk Stats
  const tradesWithRR = trades.filter((t) => t.rrRatio > 0);
  const avgRR =
    tradesWithRR.length > 0
      ? tradesWithRR.reduce((acc, t) => acc + t.rrRatio, 0) /
        tradesWithRR.length
      : 0;

  // Monthly P/L
  const monthlyPLMap = {};
  trades.forEach((trade) => {
    const date = new Date(trade.tradeDate);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
    if (!monthlyPLMap[monthYear]) monthlyPLMap[monthYear] = 0;
    monthlyPLMap[monthYear] += trade.profitLoss;
  });

  const monthlyPL = Object.keys(monthlyPLMap).map((key) => ({
    name: key,
    value: monthlyPLMap[key],
  }));

  // Equity Curve
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.tradeDate) - new Date(b.tradeDate)
  );
  let cumulative = 0;
  const equityCurve = sortedTrades.map((trade) => {
    cumulative += trade.profitLoss;
    return {
      date: trade.tradeDate,
      value: cumulative,
    };
  });

  // Asset Performance
  const assetPerformanceMap = {};
  trades.forEach((trade) => {
    if (!assetPerformanceMap[trade.asset]) assetPerformanceMap[trade.asset] = 0;
    assetPerformanceMap[trade.asset] += trade.profitLoss;
  });

  const assetPerformance = Object.keys(assetPerformanceMap)
    .map((key) => ({
      name: key,
      value: assetPerformanceMap[key],
    }))
    .sort((a, b) => b.value - a.value);

  res.json({
    totalTrades,
    totalWins,
    totalLosses,
    winRate,
    totalProfitLoss,
    avgWin,
    avgLoss,
    avgRR,
    monthlyPL,
    equityCurve,
    assetPerformance,
  });
});

// @desc    Import trades from CSV (parsed JSON)
// @route   POST /api/trades/import
// @access  Private
const importTrades = asyncHandler(async (req, res) => {
  const { trades } = req.body; // Expects an array of trade objects

  if (!trades || !Array.isArray(trades)) {
    res.status(400);
    throw new Error("Invalid trade data");
  }

  const createdTrades = [];

  for (const tradeData of trades) {
    // Validate required fields
    if (
      !tradeData.asset ||
      !tradeData.entryPrice ||
      !tradeData.exitPrice ||
      !tradeData.positionSize
    ) {
      continue; // Skip invalid rows
    }

    // Auto calculate fields if missing
    let profitLoss = tradeData.profitLoss;
    let tradeType = tradeData.tradeType || "buy";

    if (profitLoss === undefined) {
      if (tradeType.toLowerCase() === "buy") {
        profitLoss =
          (tradeData.exitPrice - tradeData.entryPrice) * tradeData.positionSize;
      } else {
        profitLoss =
          (tradeData.entryPrice - tradeData.exitPrice) * tradeData.positionSize;
      }
    }

    let result = tradeData.result;
    if (!result) {
      if (profitLoss > 0) result = "win";
      else if (profitLoss < 0) result = "loss";
      else result = "break-even";
    }

    const { risk, reward, rrRatio } = calculateRiskMetrics(
      tradeData.entryPrice,
      tradeData.stopLoss,
      tradeData.takeProfit,
      tradeData.positionSize,
      tradeType.toLowerCase()
    );

    // Find strategy by name if provided
    let strategyId = null;
    if (tradeData.strategy) {
      const strategyDoc = await Strategy.findOne({
        user: req.user._id,
        name: { $regex: new RegExp(`^${tradeData.strategy}$`, "i") },
      });
      if (strategyDoc) {
        strategyId = strategyDoc._id;
      }
    }

    const newTrade = new Trade({
      user: req.user._id,
      asset: tradeData.asset,
      market: tradeData.market || "forex",
      tradeType: tradeType.toLowerCase(),
      entryPrice: tradeData.entryPrice,
      exitPrice: tradeData.exitPrice,
      positionSize: tradeData.positionSize,
      stopLoss: tradeData.stopLoss,
      takeProfit: tradeData.takeProfit,
      profitLoss,
      result,
      notes: tradeData.notes,
      tradeDate: tradeData.tradeDate || new Date(),
      risk,
      reward,
      rrRatio,
      strategy: strategyId,
    });

    const savedTrade = await newTrade.save();
    createdTrades.push(savedTrade);
  }

  res.status(201).json(createdTrades);
});

module.exports = {
  getTrades,
  getTradeById,
  createTrade,
  updateTrade,
  deleteTrade,
  getTradeStats,
  importTrades,
};
