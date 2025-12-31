const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

const url = [
  "https://www.jtradebackend-production.up.railway.app",
  "http://localhost:3000",
];

app.use(express.json());
app.use(cors({ origin: url }));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Routes will be added here
const path = require("path");

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/trades", require("./routes/tradeRoutes"));
app.use("/api/strategies", require("./routes/strategyRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));

const __dirname_resolved = path.resolve();
app.use("/uploads", express.static(path.join(__dirname_resolved, "/uploads")));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
