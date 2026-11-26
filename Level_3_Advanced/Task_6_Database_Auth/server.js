const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const { initDatabase } = require("./db/database");
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Task 6 PocketLedger (SQLite + Auth) running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
