require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");

const { requestContextMiddleware, readRecentLogs } = require("./middleware/requestContext");
const { errorHandler } = require("./middleware/errorHandler");
const { LruTtlCache } = require("./cache/cacheStore");
const { PersistentJobQueue, EXPORT_DIR } = require("./queue/jobQueue");

const app = express();
const PORT = process.env.PORT || 3008;

const cache = new LruTtlCache({
  maxEntries: Number(process.env.CACHE_MAX_ENTRIES) || 50,
  defaultTtlMs: Number(process.env.CACHE_TTL_MS) || 30000
});

const jobQueue = new PersistentJobQueue({
  concurrency: Number(process.env.QUEUE_CONCURRENCY) || 2
});

app.use(requestContextMiddleware);
app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

const VALID_REGIONS = ["South-India", "North-India", "West-India", "East-India"];

function computeExpensiveRegionalSummary(region) {
  const started = process.hrtime.bigint();
  // Simulate CPU-bound aggregation across 180,000 ledger entries
  let checksum = 0;
  let revenue = 0;
  const seed = region.length * 19;
  for (let i = 1; i <= 180000; i += 1) {
    const val = ((i * seed) % 850) + 120;
    revenue += val;
    checksum = (checksum + val) % 9973;
  }

  // Ensure realistic minimum compute cost for visible HIT vs MISS comparison
  while (Number(process.hrtime.bigint() - started) / 1e6 < 55) {
    checksum = (checksum * 31 + 7) % 9973;
  }

  return {
    region,
    sampleRecords: 180000,
    totalRevenueInr: revenue,
    averageOrderInr: Number((revenue / 180000).toFixed(2)),
    checksum,
    generatedAt: new Date().toISOString()
  };
}

app.get("/api/analytics/summary", (req, res) => {
  const started = process.hrtime.bigint();
  const region = VALID_REGIONS.includes(req.query.region) ? req.query.region : "South-India";
  const cacheKey = `summary:${region}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    cache.recordLatency(true, elapsed);
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-Cache-TTL-Remaining", `${cached.ttlRemainingSec}s`);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      cacheStatus: "HIT",
      ttlRemainingSec: cached.ttlRemainingSec,
      computeMs: Number(elapsed.toFixed(2)),
      data: cached.value
    });
  }

  const computed = computeExpensiveRegionalSummary(region);
  cache.set(cacheKey, computed);
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  cache.recordLatency(false, elapsed);

  res.setHeader("X-Cache", "MISS");
  res.setHeader("X-Cache-TTL-Remaining", "30s");
  res.setHeader("Cache-Control", "no-store");
  res.json({
    cacheStatus: "MISS",
    ttlRemainingSec: 30,
    computeMs: Number(elapsed.toFixed(2)),
    data: computed
  });
});

app.get("/api/cache/stats", (req, res) => {
  res.json(cache.getSnapshot());
});

app.post("/api/cache/flush", (req, res) => {
  const cleared = cache.flush();
  res.json({ cleared, stats: cache.getSnapshot() });
});

app.get("/api/jobs", (req, res) => {
  res.json({ jobs: jobQueue.getAll() });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = jobQueue.getById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: `Job ${req.params.id} not found.` });
  }
  res.json({ job });
});

app.post("/api/jobs", (req, res) => {
  const allowedTypes = ["sales-csv-export", "log-anomaly-scan", "webhook-retry-demo"];
  const type = String(req.body.type || "").trim();
  const priority = req.body.priority === "high" ? "high" : "normal";
  const payload = req.body.payload && typeof req.body.payload === "object" ? req.body.payload : {};

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Unsupported job type requested." });
  }

  const job = jobQueue.enqueue({ type, payload, priority });
  res.status(202).json({ job });
});

app.get("/api/exports/:filename", (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(EXPORT_DIR, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Export file not found." });
  }
  res.download(filePath, safeName);
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: readRecentLogs(20) });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Task 8 DataPulse Server (Middleware + Queue + Cache) running at http://localhost:${PORT}`);
});
