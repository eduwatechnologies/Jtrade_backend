const mongoose = require("mongoose");

const tradingRuleSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["risk", "entry", "trade", "time"],
      default: "risk",
    },
    // Condition structure: e.g., { field: "risk", operator: "<", value: 2 }
    condition: {
      field: {
        type: String,
        required: true,
        // Supported fields: risk, reward, rrRatio, profitLoss, entryPrice, exitPrice, duration, tradeType, symbol, time(hour)
      },
      operator: {
        type: String,
        required: true,
        enum: [">", "<", ">=", "<=", "=", "!=", "exists", "not_exists"],
      },
      value: {
        type: mongoose.Schema.Types.Mixed, // Can be number or string
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

tradingRuleSchema.index({ user: 1 });

const TradingRule = mongoose.model("TradingRule", tradingRuleSchema);

module.exports = TradingRule;
