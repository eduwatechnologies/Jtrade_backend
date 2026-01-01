const asyncHandler = require("express-async-handler");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

// @desc    Extract trade details from image
// @route   POST /api/trades/extract
// @access  Private
const extractTradeFromImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided");
  }

  const imagePath = req.file.path; // Cloudinary URL or local path

  try {
    console.log(`Processing image for OCR: ${imagePath}`);
    
    // Recognize text from image
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      // logger: m => console.log(m) // Optional: Log progress
    });

    console.log("Extracted Text:", text);

    // Parsing Logic (Regex to find common patterns)
    const extractedData = parseTradeText(text);

    // If local file, clean it up (if using multer-disk-storage locally, but we are using cloudinary now usually)
    // If you are using memory storage or cloudinary, this might not be needed or path might be a URL.
    // Tesseract handles URLs fine.

    res.json({
      text, // Return raw text for debugging
      data: extractedData
    });

  } catch (error) {
    console.error("OCR Error:", error);
    res.status(500);
    throw new Error("Failed to extract text from image");
  }
});

// Helper: Parse text to find trade details
const parseTradeText = (text) => {
  const data = {
    asset: "",
    tradeType: "", // buy or sell
    entryPrice: "",
    exitPrice: "",
    stopLoss: "",
    takeProfit: "",
  };

  const lowerText = text.toLowerCase();

  // 1. Detect Asset (Common pairs usually 6 chars, e.g., EURUSD, BTCUSD, XAUUSD)
  // Look for 6 uppercase letters or common crypto symbols
  const assetMatch = text.match(/\b[A-Z]{3}\/?[A-Z]{3}\b/) || text.match(/\b(BTC|ETH|XRP|SOL|BNB)USD\b/i);
  if (assetMatch) {
    data.asset = assetMatch[0].replace("/", "");
  }

  // 2. Detect Type (Buy/Long or Sell/Short)
  if (lowerText.includes("buy") || lowerText.includes("long")) {
    data.tradeType = "buy";
  } else if (lowerText.includes("sell") || lowerText.includes("short")) {
    data.tradeType = "sell";
  }

  // 3. Detect Prices (Numbers with decimals)
  // This is tricky. We'll find all numbers and try to guess based on context or proximity to keywords.
  // Keywords: "Entry", "Open", "Price" -> Entry
  // "Exit", "Close" -> Exit
  // "SL", "Stop" -> Stop Loss
  // "TP", "Target", "Profit" -> Take Profit

  const lines = text.split('\n');
  
  lines.forEach(line => {
    const l = line.toLowerCase();
    const numbers = line.match(/\d+\.\d+/g); // Find decimals like 1.0500 or 2000.50

    if (!numbers) return;

    if (l.includes("entry") || l.includes("open") || l.includes("price")) {
      data.entryPrice = numbers[0];
    }
    if (l.includes("exit") || l.includes("close") || l.includes("current")) {
      data.exitPrice = numbers[0];
    }
    if (l.includes("sl") || l.includes("stop")) {
      data.stopLoss = numbers[0];
    }
    if (l.includes("tp") || l.includes("target") || l.includes("profit")) {
      data.takeProfit = numbers[0];
    }
  });

  // Fallback: If we have numbers but no specific keywords, we might guess?
  // Risk: Guessing is dangerous. Better to return empty if unsure.

  return data;
};

module.exports = {
  extractTradeFromImage,
};
