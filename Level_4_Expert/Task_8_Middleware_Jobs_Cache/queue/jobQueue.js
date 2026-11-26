const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readRecentLogs } = require("../middleware/requestContext");

const DATA_DIR = path.join(__dirname, "..", "data");
const EXPORT_DIR = path.join(__dirname, "..", "storage", "exports");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

for (const dir of [DATA_DIR, EXPORT_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class PersistentJobQueue {
  constructor({ concurrency = 2 } = {}) {
    this.concurrency = concurrency;
    this.runningCount = 0;
    this.jobs = this.loadJobs();
    this.recoverInterruptedJobs();
  }

  loadJobs() {
    if (!fs.existsSync(JOBS_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(JOBS_FILE, "utf8"));
    } catch {
      return [];
    }
  }

  saveJobs() {
    this.jobs = this.jobs.slice(0, 40);
    fs.writeFileSync(JOBS_FILE, JSON.stringify(this.jobs, null, 2), "utf8");
  }

  recoverInterruptedJobs() {
    let changed = false;
    for (const job of this.jobs) {
      if (job.status === "processing") {
        job.status = "queued";
        changed = true;
      }
    }
    if (changed) this.saveJobs();
    this.pump();
  }

  enqueue({ type, payload = {}, priority = "normal", maxAttempts = 3 }) {
    const job = {
      id: `JOB-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      type,
      payload,
      priority: priority === "high" ? "high" : "normal",
      status: "queued",
      progress: 0,
      attempts: 0,
      maxAttempts,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: null,
      error: null
    };

    this.jobs.unshift(job);
    this.saveJobs();
    setImmediate(() => this.pump());
    return job;
  }

  getAll() {
    return this.jobs;
  }

  getById(id) {
    return this.jobs.find((j) => j.id === id) || null;
  }

  pump() {
    while (this.runningCount < this.concurrency) {
      const nextJob = this.pickNextQueuedJob();
      if (!nextJob) break;
      this.executeJob(nextJob);
    }
  }

  pickNextQueuedJob() {
    const queued = this.jobs.filter((j) => j.status === "queued");
    if (queued.length === 0) return null;
    const highPriority = queued.find((j) => j.priority === "high");
    return highPriority || queued[queued.length - 1];
  }

  async executeJob(job) {
    this.runningCount += 1;
    job.status = "processing";
    job.attempts += 1;
    job.error = null;
    job.updatedAt = new Date().toISOString();
    this.saveJobs();

    try {
      const result = await this.runHandler(job);
      job.status = "completed";
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date().toISOString();
      this.saveJobs();
    } catch (err) {
      if (job.attempts < job.maxAttempts) {
        const backoffMs = 450 * Math.pow(2, job.attempts - 1);
        job.status = "retrying";
        job.error = `${err.message} (retrying in ${backoffMs}ms)`;
        job.updatedAt = new Date().toISOString();
        this.saveJobs();

        setTimeout(() => {
          job.status = "queued";
          job.updatedAt = new Date().toISOString();
          this.saveJobs();
          this.pump();
        }, backoffMs);
      } else {
        job.status = "failed";
        job.error = err.message;
        job.updatedAt = new Date().toISOString();
        this.saveJobs();
      }
    } finally {
      this.runningCount -= 1;
      setImmediate(() => this.pump());
    }
  }

  async runHandler(job) {
    if (job.type === "sales-csv-export") {
      const totalRows = Number(job.payload.rows) || 1800;
      const region = String(job.payload.region || "South-India");
      const lines = ["order_id,region,category,units,amount_inr"];
      let revenue = 0;

      for (let i = 1; i <= totalRows; i += 1) {
        const amount = 250 + ((i * 73) % 4200);
        revenue += amount;
        const cat = ["Hardware", "Cloud", "Support", "Training"][i % 4];
        lines.push(`ORD-${10000 + i},${region},${cat},${(i % 5) + 1},${amount}`);
        if (i % 450 === 0) {
          job.progress = Math.min(90, Math.round((i / totalRows) * 100));
          job.updatedAt = new Date().toISOString();
          this.saveJobs();
          await sleep(160);
        }
      }

      const fileName = `${job.id.toLowerCase()}-${region.toLowerCase()}.csv`;
      fs.writeFileSync(path.join(EXPORT_DIR, fileName), lines.join("\n"), "utf8");

      return {
        rowsProcessed: totalRows,
        totalRevenueInr: revenue,
        fileName,
        downloadUrl: `/api/exports/${fileName}`
      };
    }

    if (job.type === "log-anomaly-scan") {
      job.progress = 35;
      this.saveJobs();
      await sleep(280);

      const recent = readRecentLogs(100);
      const slowRequests = recent.filter((r) => r.durationMs > 50).length;
      const errorResponses = recent.filter((r) => r.status >= 400).length;

      job.progress = 80;
      this.saveJobs();
      await sleep(220);

      return {
        scannedLines: recent.length,
        slowRequestsOver50ms: slowRequests,
        http4xx5xxCount: errorResponses
      };
    }

    if (job.type === "webhook-retry-demo") {
      job.progress = 30;
      this.saveJobs();
      await sleep(280);

      if (job.attempts === 1) {
        throw new Error("Simulated upstream 503 timeout on attempt 1");
      }

      job.progress = 85;
      this.saveJobs();
      await sleep(220);

      return {
        delivered: true,
        recoveredOnAttempt: job.attempts,
        target: job.payload.target || "https://hooks.internal/digest"
      };
    }

    throw new Error(`Unsupported job type: ${job.type}`);
  }
}

module.exports = {
  PersistentJobQueue,
  EXPORT_DIR
};
