const Trade = require("../models/Trade");
const User = require("../models/User");
const { generateApiKey, hashApiKey } = require("../utils/apiKey");

async function regenerateKey(req, res) {
  const userId = req.user._id;
  const apiKey = generateApiKey();
  const hash = hashApiKey(apiKey, process.env.API_KEY_SECRET);
  await User.findByIdAndUpdate(userId, {
    mt5ApiKeyHash: hash,
    mt5ApiKeyCreatedAt: new Date(),
  });
  res.json({ apiKey });
}

async function getKeyStatus(req, res) {
  const user = await User.findById(req.user._id).select("mt5ApiKeyHash mt5ApiKeyCreatedAt");
  res.json({
    hasKey: !!user.mt5ApiKeyHash,
    createdAt: user.mt5ApiKeyCreatedAt || null,
  });
}

function validateTradePayload(trade) {
  if (!trade) return false;
  if (!trade.accountId) return false;
  if (typeof trade.ticket === "undefined") return false;
  if (!trade.symbol) return false;
  if (!trade.type) return false;
  if (typeof trade.volume === "undefined") return false;
  if (typeof trade.entryPrice === "undefined") return false;
  if (typeof trade.exitPrice === "undefined") return false;
  if (typeof trade.profit === "undefined") return false;
  if (!trade.datetime) return false;
  return true;
}

async function syncTrades(req, res) {
  const trades = Array.isArray(req.body?.trades) ? req.body.trades : null;
  if (!trades || trades.length === 0) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  const user = req.mt5User;
  let created = 0;
  let updated = 0;
  for (const t of trades) {
    if (!validateTradePayload(t)) {
      continue;
    }
    const doc = {
      user: user._id,
      source: "mt5",
      mt5AccountId: String(t.accountId),
      mt5Ticket: String(t.ticket),
      broker: t.broker || "",
      asset: t.symbol,
      market: t.market || "forex",
      tradeType: t.type.toLowerCase() === "buy" ? "buy" : "sell",
      entryPrice: Number(t.entryPrice),
      exitPrice: Number(t.exitPrice),
      positionSize: Number(t.volume),
      stopLoss: typeof t.stopLoss !== "undefined" ? Number(t.stopLoss) : undefined,
      takeProfit: typeof t.takeProfit !== "undefined" ? Number(t.takeProfit) : undefined,
      profitLoss: Number(t.profit),
      result: Number(t.profit) > 0 ? "win" : Number(t.profit) < 0 ? "loss" : "break-even",
      notes: t.comment || "",
      tradeDate: new Date(t.datetime),
      externalId: String(t.ticket),
      rrRatio: typeof t.rrRatio !== "undefined" ? Number(t.rrRatio) : undefined,
    };
    const existing = await Trade.findOne({
      user: user._id,
      mt5AccountId: doc.mt5AccountId,
      mt5Ticket: doc.mt5Ticket,
    });
    if (existing) {
      await Trade.updateOne({ _id: existing._id }, doc);
      updated += 1;
    } else {
      try {
        await Trade.create(doc);
        created += 1;
      } catch (e) {
        updated += 1;
      }
    }
  }
  res.json({ created, updated, total: trades.length });
}

async function getSyncStatus(req, res) {
  const userId = req.user._id;
  const last = await Trade.findOne({ user: userId, source: "mt5" })
    .sort({ updatedAt: -1 })
    .select("updatedAt tradeDate profitLoss");
  const count = await Trade.countDocuments({ user: userId, source: "mt5" });
  res.json({
    totalTrades: count,
    lastSyncAt: last ? last.updatedAt : null,
    lastTradeDate: last ? last.tradeDate : null,
  });
}

module.exports = { regenerateKey, getKeyStatus, syncTrades, getSyncStatus };
