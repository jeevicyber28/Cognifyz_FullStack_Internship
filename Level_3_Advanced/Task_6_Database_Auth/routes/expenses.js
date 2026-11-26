const express = require("express");
const { queryAll, queryOne, execute } = require("../db/database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Cloud & Tools",
  "Utilities",
  "Learning",
  "Other"
];

router.use(requireAuth);

router.get("/", (req, res) => {
  const category = String(req.query.category || "").trim();
  const q = String(req.query.q || "").trim().toLowerCase();

  let sql = "SELECT id, title, category, amount, spent_on, note, created_at FROM expenses WHERE user_id = ?";
  const params = [req.user.id];

  if (category && category !== "All") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND (LOWER(title) LIKE ? OR LOWER(note) LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += " ORDER BY spent_on DESC, id DESC";
  const expenses = queryAll(sql, params);

  const breakdown = queryAll(
    "SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS entries FROM expenses WHERE user_id = ? GROUP BY category ORDER BY total DESC",
    [req.user.id]
  );

  const totalsRow = queryOne(
    "SELECT ROUND(COALESCE(SUM(amount), 0), 2) AS grandTotal, COUNT(*) AS totalEntries FROM expenses WHERE user_id = ?",
    [req.user.id]
  );

  res.json({
    expenses,
    breakdown,
    summary: {
      grandTotal: Number(totalsRow ? totalsRow.grandTotal : 0),
      totalEntries: Number(totalsRow ? totalsRow.totalEntries : 0)
    }
  });
});

router.post("/", (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = String(req.body.category || "").trim();
  const amount = Number(req.body.amount);
  const spentOn = String(req.body.spent_on || "").trim();
  const note = String(req.body.note || "").trim();

  if (title.length < 2 || title.length > 100) {
    return res.status(400).json({ error: "Title must be between 2 and 100 characters." });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Select a valid expense category." });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    return res.status(400).json({ error: "Amount must be a positive number." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return res.status(400).json({ error: "Date must use YYYY-MM-DD format." });
  }

  const result = execute(
    "INSERT INTO expenses (user_id, title, category, amount, spent_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, title, category, Math.round(amount * 100) / 100, spentOn, note, new Date().toISOString()]
  );

  const created = queryOne(
    "SELECT id, title, category, amount, spent_on, note, created_at FROM expenses WHERE id = ?",
    [result.lastInsertRowid]
  );

  res.status(201).json({ expense: created });
});

router.put("/:id", (req, res) => {
  const expenseId = Number(req.params.id);
  const existing = queryOne("SELECT * FROM expenses WHERE id = ?", [expenseId]);

  if (!existing) {
    return res.status(404).json({ error: "Expense entry not found." });
  }
  if (Number(existing.user_id) !== req.user.id) {
    return res.status(403).json({ error: "Forbidden: you do not own this record." });
  }

  const title = String(req.body.title || existing.title).trim();
  const category = String(req.body.category || existing.category).trim();
  const amount = req.body.amount !== undefined ? Number(req.body.amount) : Number(existing.amount);
  const spentOn = String(req.body.spent_on || existing.spent_on).trim();
  const note = req.body.note !== undefined ? String(req.body.note).trim() : existing.note;

  if (
    title.length < 2 ||
    title.length > 100 ||
    !CATEGORIES.includes(category) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10000000 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(spentOn)
  ) {
    return res.status(400).json({ error: "Invalid expense update fields." });
  }

  execute(
    "UPDATE expenses SET title = ?, category = ?, amount = ?, spent_on = ?, note = ? WHERE id = ? AND user_id = ?",
    [title, category, Math.round(amount * 100) / 100, spentOn, note, expenseId, req.user.id]
  );

  const updated = queryOne(
    "SELECT id, title, category, amount, spent_on, note, created_at FROM expenses WHERE id = ?",
    [expenseId]
  );
  res.json({ expense: updated });
});

router.delete("/:id", (req, res) => {
  const expenseId = Number(req.params.id);
  const existing = queryOne("SELECT id, user_id FROM expenses WHERE id = ?", [expenseId]);

  if (!existing) {
    return res.status(404).json({ error: "Expense entry not found." });
  }
  if (Number(existing.user_id) !== req.user.id) {
    return res.status(403).json({ error: "Forbidden: you cannot delete another user's record." });
  }

  execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", [expenseId, req.user.id]);
  res.json({ deletedId: expenseId });
});

module.exports = router;
