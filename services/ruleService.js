/**
 * Evaluate a single rule against a trade
 * @param {Object} trade - The trade object (plain object or mongoose doc)
 * @param {Object} rule - The rule object
 * @returns {Object} - { passed: Boolean, actualValue: Any }
 */
function evaluateRule(trade, rule) {
  const { field, operator, value } = rule.condition;
  let tradeValue = undefined;

  // Extract value from trade
  switch (field) {
    case "time": // Hour of day (0-23)
      if (trade.tradeDate) {
        tradeValue = new Date(trade.tradeDate).getHours();
      }
      break;
    case "duration": // Duration in minutes
      // Not always available unless we have exit time.
      // MT5 trades usually have it implied by tradeDate (exit?) vs ?
      // Actually Trade model has 'tradeDate' which is likely exit time for history.
      // We might not have duration easily for all trades. Skip for now or assume 0.
      break;
    case "dayOfWeek": // 0-6 (Sun-Sat) or 1-7
      if (trade.tradeDate) {
        tradeValue = new Date(trade.tradeDate).getDay();
      }
      break;
    default:
      tradeValue = trade[field];
  }

  // Handle derived values if missing
  if (
    field === "rrRatio" &&
    tradeValue === undefined &&
    trade.risk &&
    trade.reward
  ) {
    tradeValue = trade.reward / trade.risk;
  }

  // If value is missing and operator checks existence
  if (operator === "exists") {
    return {
      passed: tradeValue !== undefined && tradeValue !== null,
      actualValue: "N/A",
    };
  }
  if (operator === "not_exists") {
    return {
      passed: tradeValue === undefined || tradeValue === null,
      actualValue: "N/A",
    };
  }

  // If value is missing for comparison operators, fail or skip?
  // Let's fail safe (passed: false) or return null?
  // If we can't evaluate, maybe we shouldn't mark it as failed?
  // User wants to see "whether rules were followed". If data is missing, we can't say.
  if (tradeValue === undefined || tradeValue === null) {
    return { passed: false, actualValue: "Missing Data" };
  }

  // Compare
  let passed = false;
  const numTradeValue = Number(tradeValue);
  const numRuleValue = Number(value);

  // Check if we are comparing numbers
  const isNumeric = !isNaN(numTradeValue) && !isNaN(numRuleValue);

  switch (operator) {
    case ">":
      passed = isNumeric ? numTradeValue > numRuleValue : tradeValue > value;
      break;
    case "<":
      passed = isNumeric ? numTradeValue < numRuleValue : tradeValue < value;
      break;
    case ">=":
      passed = isNumeric ? numTradeValue >= numRuleValue : tradeValue >= value;
      break;
    case "<=":
      passed = isNumeric ? numTradeValue <= numRuleValue : tradeValue <= value;
      break;
    case "=":
      // strict equality might be tricky with floats, but let's stick to == for loose
      passed = tradeValue == value;
      break;
    case "!=":
      passed = tradeValue != value;
      break;
  }

  return { passed, actualValue: tradeValue };
}

/**
 * Evaluate all active rules for a user against a trade
 * @param {Object} trade - The trade object
 * @param {Array} rules - Array of TradingRule objects
 * @returns {Array} - Array of evaluation results
 */
function evaluateTradeRules(trade, rules) {
  if (!rules || rules.length === 0) return [];

  return rules.map((rule) => {
    const result = evaluateRule(trade, rule);
    return {
      rule: rule._id,
      ruleName: rule.name,
      passed: result.passed,
      actualValue: result.actualValue,
    };
  });
}

module.exports = {
  evaluateTradeRules,
};
