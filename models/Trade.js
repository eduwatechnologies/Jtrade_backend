const mongoose = require("mongoose");

const tradeSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    source: {
      type: String,
      enum: ["manual", "mt5"],
      default: "manual",
    },
    mt5AccountId: {
      type: String,
    },
    mt5Ticket: {
      type: String,
    },
    broker: {
      type: String,
    },
    strategy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Strategy",
    },
    asset: {
      type: String,
      required: true,
    },
    market: {
      type: String,
      required: true,
      enum: ["forex", "crypto", "stocks", "indices", "commodities", "other"],
      default: "forex",
    },
    tradeType: {
      type: String,
      required: true,
      enum: ["buy", "sell"],
    },
    entryPrice: {
      type: Number,
      required: true,
    },
    exitPrice: {
      type: Number,
      required: true,
    },
    positionSize: {
      type: Number,
      required: true,
    },
    stopLoss: {
      type: Number,
    },
    takeProfit: {
      type: Number,
    },
    risk: {
      type: Number,
    },
    reward: {
      type: Number,
    },
    rrRatio: {
      type: Number,
    },
    profitLoss: {
      type: Number,
      required: true,
    },
    result: {
      type: String,
      required: true,
      enum: ["win", "loss", "break-even"],
    },
    notes: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    tradeDate: {
      type: Date,
      required: true,
    },
    externalId: {
      type: String,
      description: "External ID from platform like MT5 (ticket number)",
    },
    ruleEvaluations: [
      {
        rule: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TradingRule",
        },
        ruleName: String,
        passed: Boolean,
        actualValue: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

tradeSchema.index({ user: 1, tradeDate: -1 });
tradeSchema.index({ user: 1, strategy: 1 });
tradeSchema.index({ user: 1, externalId: 1 }, { unique: true, sparse: true });
tradeSchema.index(
  { user: 1, mt5AccountId: 1, mt5Ticket: 1 },
  { unique: true, partialFilterExpression: { source: "mt5" } }
);

const Trade = mongoose.model("Trade", tradeSchema);

module.exports = Trade;
