const express = require("express");
const bcrypt = require("bcryptjs");
const { queryOne, execute } = require("../db/database");
const { COOKIE_NAME, signAuthToken, readOptionalUser, requireAuth } = require("../middleware/auth");

const router = express.Router();

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();
  const result = execute(
    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash, createdAt]
  );

  const user = { id: result.lastInsertRowid, name, email };
  const token = signAuthToken(user);
  setSessionCookie(res, token);

  res.status(201).json({ user });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const userRow = queryOne(
    "SELECT id, name, email, password_hash FROM users WHERE email = ?",
    [email]
  );
  if (!userRow) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordMatches = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const user = { id: Number(userRow.id), name: userRow.name, email: userRow.email };
  const token = signAuthToken(user);
  setSessionCookie(res, token);

  res.json({ user });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/session", (req, res) => {
  const tokenUser = readOptionalUser(req);
  if (!tokenUser) {
    return res.json({ authenticated: false, user: null });
  }
  const userRow = queryOne("SELECT id, name, email, created_at FROM users WHERE id = ?", [
    tokenUser.id
  ]);
  if (!userRow) {
    res.clearCookie(COOKIE_NAME);
    return res.json({ authenticated: false, user: null });
  }
  res.json({ authenticated: true, user: userRow });
});

router.get("/me", requireAuth, (req, res) => {
  const userRow = queryOne("SELECT id, name, email, created_at FROM users WHERE id = ?", [
    req.user.id
  ]);
  if (!userRow) {
    return res.status(401).json({ error: "Account no longer exists." });
  }
  res.json({ user: userRow });
});

module.exports = router;
