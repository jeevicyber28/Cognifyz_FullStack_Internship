const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const bcrypt = require("bcryptjs");

const DB_FILE = path.join(__dirname, "ledger.sqlite");
const SCHEMA_FILE = path.join(__dirname, "schema.sql");

let dbInstance = null;

function persistDatabase() {
  if (!dbInstance) return;
  const binary = dbInstance.export();
  fs.writeFileSync(DB_FILE, Buffer.from(binary));
}

function queryAll(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  stmt.run(params);
  stmt.free();
  const rowIdRow = queryOne("SELECT last_insert_rowid() AS id");
  persistDatabase();
  return { lastInsertRowid: rowIdRow ? Number(rowIdRow.id) : 0 };
}

async function seedDemoData() {
  const existing = queryOne("SELECT COUNT(*) AS count FROM users");
  if (existing && Number(existing.count) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const demoHash = await bcrypt.hash("Ledger#2026", 10);

  const karthik = execute(
    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    ["Karthik Raja", "karthik@ledger.local", demoHash, now]
  );

  const priya = execute(
    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    ["Priya Dharshini", "priya@ledger.local", demoHash, now]
  );

  const karthikExpenses = [
    ["DigitalOcean Droplet Renewal", "Cloud & Tools", 680, "2026-11-24", "Staging box for Node apps"],
    ["Filter Coffee & Tiffin", "Food & Dining", 210, "2026-11-25", "Morning breakfast near campus"],
    ["Coimbatore - Chennai Train Ticket", "Transport", 845, "2026-11-22", "2S chair car booking"],
    ["Domain Renewal (.dev)", "Cloud & Tools", 1150, "2026-11-18", "Annual registrar fee"],
    ["Fiber Broadband Monthly Bill", "Utilities", 943, "2026-11-15", "ACT 150 Mbps plan"]
  ];

  for (const [title, category, amount, spentOn, note] of karthikExpenses) {
    execute(
      "INSERT INTO expenses (user_id, title, category, amount, spent_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [karthik.lastInsertRowid, title, category, amount, spentOn, note, now]
    );
  }

  const priyaExpenses = [
    ["Design System Reference Book", "Learning", 1290, "2026-11-23", "Refactoring UI print copy"],
    ["Metro Smart Card Top-up", "Transport", 400, "2026-11-25", "Weekly commute pass"]
  ];

  for (const [title, category, amount, spentOn, note] of priyaExpenses) {
    execute(
      "INSERT INTO expenses (user_id, title, category, amount, spent_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [priya.lastInsertRowid, title, category, amount, spentOn, note, now]
    );
  }
}

async function initDatabase() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  const schemaSql = fs.readFileSync(SCHEMA_FILE, "utf8");
  dbInstance.exec(schemaSql);
  await seedDemoData();
  persistDatabase();

  return dbInstance;
}

module.exports = {
  initDatabase,
  queryAll,
  queryOne,
  execute
};
