const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "requests.jsonl");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function requestContextMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  const requestId = crypto.randomUUID().slice(0, 8);
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Powered-By-Middleware", "DataPulse-Pipeline");

  const originalEnd = res.end.bind(res);
  res.end = function patchedEnd(...args) {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${durationMs.toFixed(2)}ms`);
    }
    return originalEnd(...args);
  };

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    const entry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      cacheStatus: res.getHeader("X-Cache") || null
    };

    if (!req.originalUrl.startsWith("/api/logs") && !(req.method === "GET" && req.originalUrl === "/api/jobs")) {
      fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, () => {});
    }
    console.log(`[${entry.requestId}] ${entry.method} ${entry.path} -> ${entry.status} (${entry.durationMs}ms)`);
  });

  next();
}

function readRecentLogs(limit = 25) {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean);
  return lines
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = {
  requestContextMiddleware,
  readRecentLogs,
  LOG_FILE
};
