async function refreshCacheStats() {
  const res = await fetch("/api/cache/stats");
  const stats = await res.json();
  document.getElementById("statHitRate").textContent = `${stats.hitRatePct}%`;
  document.getElementById("statHitMiss").textContent = `${stats.hits} / ${stats.misses}`;
  document.getElementById("statAvgHit").textContent = `${stats.avgHitMs} ms`;
  document.getElementById("statAvgMiss").textContent = `${stats.avgMissMs} ms`;
}

async function fetchSummary(region) {
  const res = await fetch(`/api/analytics/summary?region=${encodeURIComponent(region)}`, {
    cache: "no-store"
  });
  const body = await res.json();
  const reqId = res.headers.get("X-Request-Id") || "-";
  const cacheHeader = res.headers.get("X-Cache") || body.cacheStatus;
  const serverTime = res.headers.get("X-Response-Time") || `${body.computeMs}ms`;

  const box = document.getElementById("cacheLastCall");
  box.hidden = false;
  box.textContent = `[${reqId}] ${region} -> X-Cache: ${cacheHeader} | Latency: ${serverTime} | Revenue: INR ${Number(
    body.data.totalRevenueInr
  ).toLocaleString("en-IN")}`;

  await refreshCacheStats();
  await refreshLogs();
  return { cacheHeader, serverTime };
}

let jobPollTimer = null;

async function refreshJobs() {
  const res = await fetch("/api/jobs");
  const data = await res.json();
  const list = document.getElementById("jobsList");
  list.innerHTML = "";

  if (data.jobs.length === 0) {
    list.innerHTML = '<div class="sub">No jobs queued yet. Enqueue one above.</div>';
    if (jobPollTimer) {
      clearInterval(jobPollTimer);
      jobPollTimer = null;
    }
    return;
  }

  const hasActiveJobs = data.jobs.some((j) => ["queued", "processing", "retrying"].includes(j.status));
  if (hasActiveJobs && !jobPollTimer) {
    jobPollTimer = setInterval(refreshJobs, 900);
  } else if (!hasActiveJobs && jobPollTimer) {
    clearInterval(jobPollTimer);
    jobPollTimer = null;
  }

  data.jobs.slice(0, 8).forEach((job) => {
    const card = document.createElement("div");
    card.className = "job-card";

    const top = document.createElement("div");
    top.className = "job-top";

    const title = document.createElement("span");
    title.className = "job-id";
    title.textContent = `${job.id} · ${job.type} (${job.priority})`;

    const pill = document.createElement("span");
    pill.className = `status-pill status-${job.status}`;
    pill.textContent = `${job.status} (try ${job.attempts})`;

    top.append(title, pill);

    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${job.progress}%`;
    track.appendChild(fill);

    const detail = document.createElement("div");
    detail.className = "job-result";
    if (job.status === "completed" && job.result) {
      if (job.result.downloadUrl) {
        const text = document.createTextNode(`Processed ${job.result.rowsProcessed} rows · `);
        const link = document.createElement("a");
        link.href = job.result.downloadUrl;
        link.textContent = `Download ${job.result.fileName}`;
        detail.append(text, link);
      } else {
        detail.textContent = JSON.stringify(job.result);
      }
    } else if (job.error) {
      detail.textContent = job.error;
    } else {
      detail.textContent = `Progress: ${job.progress}%`;
    }

    card.append(top, track, detail);
    list.appendChild(card);
  });
}

async function refreshLogs() {
  const res = await fetch("/api/logs");
  const data = await res.json();
  const tbody = document.getElementById("logsRows");
  tbody.innerHTML = "";

  data.logs.slice(0, 12).forEach((entry) => {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.className = "mono";
    idTd.textContent = entry.requestId;

    const methodTd = document.createElement("td");
    methodTd.textContent = entry.method;

    const pathTd = document.createElement("td");
    pathTd.className = "mono";
    pathTd.textContent = entry.path;

    const statusTd = document.createElement("td");
    statusTd.className = "tabular";
    statusTd.textContent = String(entry.status);

    const cacheTd = document.createElement("td");
    cacheTd.className = "mono";
    cacheTd.textContent = entry.cacheStatus || "—";

    const latTd = document.createElement("td");
    latTd.className = "num tabular";
    latTd.textContent = `${entry.durationMs} ms`;

    tr.append(idTd, methodTd, pathTd, statusTd, cacheTd, latTd);
    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("fetchSummaryBtn").addEventListener("click", () => {
    fetchSummary(document.getElementById("regionSelect").value);
  });

  document.getElementById("benchmarkBtn").addEventListener("click", async () => {
    const region = document.getElementById("regionSelect").value;
    await fetch("/api/cache/flush", { method: "POST" });
    const first = await fetchSummary(region);
    const second = await fetchSummary(region);
    document.getElementById("cacheLastCall").textContent =
      `Benchmark (${region}): Run 1 [${first.cacheHeader} in ${first.serverTime}] -> Run 2 [${second.cacheHeader} in ${second.serverTime}]`;
  });

  document.getElementById("flushCacheBtn").addEventListener("click", async () => {
    await fetch("/api/cache/flush", { method: "POST" });
    await refreshCacheStats();
    await refreshLogs();
  });

  document.getElementById("enqueueForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const type = document.getElementById("jobType").value;
    const priority = document.getElementById("jobPriority").value;
    const region = document.getElementById("regionSelect").value;

    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, priority, payload: { region } })
    });
    await refreshJobs();
    await refreshLogs();
  });

  document.getElementById("refreshLogsBtn").addEventListener("click", refreshLogs);

  refreshCacheStats();
  refreshJobs();
  refreshLogs();
});
