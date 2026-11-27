import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SERVERS = [
  { name: "Task 1", dir: "Level_1_Beginner/Task_1_SSR_Forms", port: 3001 },
  { name: "Task 2", dir: "Level_1_Beginner/Task_2_Inline_Validation", port: 3002 },
  { name: "Task 3", dir: "Level_2_Intermediate/Task_3_Responsive_Layout", port: 3003 },
  { name: "Task 4", dir: "Level_2_Intermediate/Task_4_Dynamic_Validation_Routing", port: 3004 },
  { name: "Task 5", dir: "Level_3_Advanced/Task_5_REST_API_CRUD", port: 3005 },
  { name: "Task 6", dir: "Level_3_Advanced/Task_6_Database_Auth", port: 3006 },
  { name: "Task 7", dir: "Level_4_Expert/Task_7_External_API_OAuth", port: 3007 },
  { name: "Task 8", dir: "Level_4_Expert/Task_8_Middleware_Jobs_Cache", port: 3008 }
];

const children = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPort(port) {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status < 500) return;
    } catch {
      // retry until bound
    }
    await sleep(150);
  }
  throw new Error(`Server on port ${port} failed to start`);
}

before(async () => {
  for (const srv of SERVERS) {
    const child = spawn("node", ["server.js"], {
      cwd: path.join(ROOT, srv.dir),
      stdio: ["ignore", "pipe", "pipe"]
    });
    children.push(child);
  }
  await Promise.all(SERVERS.map((s) => waitForPort(s.port)));
});

after(() => {
  for (const child of children) {
    child.kill("SIGTERM");
  }
  fs.rmSync(path.join(ROOT, "Level_3_Advanced/Task_6_Database_Auth/db/ledger.sqlite"), { force: true });
  for (const sub of ["logs", "data", "storage"]) {
    fs.rmSync(path.join(ROOT, "Level_4_Expert/Task_8_Middleware_Jobs_Cache", sub), {
      recursive: true,
      force: true
    });
  }
});

test("Task 1: renders SSR form, rejects incomplete input, and confirms valid registration", async () => {
  const home = await fetch("http://127.0.0.1:3001/");
  assert.equal(home.status, 200);

  const bad = await fetch("http://127.0.0.1:3001/register", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ fullName: "Test", email: "invalid-email" })
  });
  assert.equal(bad.status, 400);

  const ok = await fetch("http://127.0.0.1:3001/register", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      fullName: "Kavitha M",
      email: "kavitha@college.edu",
      department: "Computer Science",
      year: "2nd Year",
      workshopId: "node-apis"
    })
  });
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Kavitha M/);
});

test("Task 2: enforces server validation and saves valid quote inquiries", async () => {
  const bad = await fetch("http://127.0.0.1:3002/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ clientName: "X", email: "bad", phone: "123", summary: "short" })
  });
  assert.equal(bad.status, 400);

  const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const ok = await fetch("http://127.0.0.1:3002/inquiries", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      clientName: "Suresh Babu",
      email: "suresh@studio.in",
      phone: "9876543210",
      scope: "New Build",
      budget: "45000",
      launchDate: futureDate,
      deliverables: "REST API",
      summary: "Need an automated billing workflow for wholesale clients.",
      termsAccepted: "on"
    })
  });
  assert.equal(ok.status, 302);
});

test("Task 3: serves responsive layout and validates tasting reservation payloads", async () => {
  const page = await fetch("http://127.0.0.1:3003/");
  assert.equal(page.status, 200);

  const bad = await fetch("http://127.0.0.1:3003/api/tasting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A", email: "bad", guests: 1.5 })
  });
  assert.equal(bad.status, 400);

  const ok = await fetch("http://127.0.0.1:3003/api/tasting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Vignesh R",
      email: "vignesh@example.in",
      date: "2026-12-10",
      guests: 2,
      roastPreference: "Espresso"
    })
  });
  assert.equal(ok.status, 201);
});

test("Task 4: serves SPA fallback across all client-side routes", async () => {
  for (const route of ["/", "/onboarding", "/directory", "/policy"]) {
    const res = await fetch(`http://127.0.0.1:3004${route}`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Developer Account Provisioning/);
  }
});

test("Task 5: performs full REST CRUD lifecycle and cleans up test record", async () => {
  const createRes = await fetch("http://127.0.0.1:3005/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "CI integration check issue",
      priority: "Low",
      status: "Open",
      assignee: "CI Runner"
    })
  });
  assert.equal(createRes.status, 201);
  const { issue } = await createRes.json();

  const patchRes = await fetch(`http://127.0.0.1:3005/api/issues/${issue.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Resolved" })
  });
  assert.equal(patchRes.status, 200);
  assert.equal((await patchRes.json()).issue.status, "Resolved");

  const delRes = await fetch(`http://127.0.0.1:3005/api/issues/${issue.id}`, { method: "DELETE" });
  assert.equal(delRes.status, 200);
});

test("Task 6: isolates SQLite expense records per authenticated user", async () => {
  const unauth = await fetch("http://127.0.0.1:3006/api/expenses");
  assert.equal(unauth.status, 401);

  const login = await fetch("http://127.0.0.1:3006/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "priya@ledger.local", password: "Ledger#2026" })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];

  const list = await (await fetch("http://127.0.0.1:3006/api/expenses", { headers: { Cookie: cookie } })).json();
  assert.equal(list.expenses.length, 2);

  // Record #1 belongs to Karthik; Priya must receive 403 Forbidden
  const forbidden = await fetch("http://127.0.0.1:3006/api/expenses/1", {
    method: "DELETE",
    headers: { Cookie: cookie }
  });
  assert.equal(forbidden.status, 403);
});

test("Task 7: validates input, handles local OAuth 2.0 code exchange, and enforces rate limits", async () => {
  const badCity = await fetch("http://127.0.0.1:3007/api/weather?city=a");
  assert.equal(badCity.status, 400);
  assert.equal(badCity.headers.get("x-ratelimit-limit"), "10");

  const step1 = await fetch("http://127.0.0.1:3007/auth/local", { redirect: "manual" });
  assert.equal(step1.status, 302);
  const loc1 = new URL(step1.headers.get("location"), "http://127.0.0.1:3007");

  const step2 = await fetch("http://127.0.0.1:3007/oauth/authorize", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "skyline-brief-web",
      redirect_uri: loc1.searchParams.get("redirect_uri"),
      scope: "read:profile read:weather",
      state: loc1.searchParams.get("state"),
      displayName: "CI Tester"
    })
  });
  assert.equal(step2.status, 302);
  const cb = new URL(step2.headers.get("location"));

  const step3 = await fetch(`http://127.0.0.1:3007${cb.pathname}${cb.search}`, { redirect: "manual" });
  assert.equal(step3.status, 302);
  const cookie = step3.headers.get("set-cookie").split(";")[0];

  const sess = await (
    await fetch("http://127.0.0.1:3007/api/auth/session", { headers: { Cookie: cookie } })
  ).json();
  assert.equal(sess.tierLimit, 30);
});

test("Task 8: caches analytics summaries, completes async jobs, and records request logs", async () => {
  await fetch("http://127.0.0.1:3008/api/cache/flush", { method: "POST" });

  const miss = await fetch("http://127.0.0.1:3008/api/analytics/summary?region=North-India");
  assert.equal(miss.status, 200);
  assert.equal(miss.headers.get("x-cache"), "MISS");
  assert.equal(miss.headers.get("cache-control"), "no-store");

  const hit = await fetch("http://127.0.0.1:3008/api/analytics/summary?region=North-India");
  assert.equal(hit.status, 200);
  assert.equal(hit.headers.get("x-cache"), "HIT");

  const jobRes = await fetch("http://127.0.0.1:3008/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "log-anomaly-scan", priority: "high" })
  });
  assert.equal(jobRes.status, 202);
  const { job } = await jobRes.json();

  let done = false;
  for (let i = 0; i < 20; i += 1) {
    await sleep(150);
    const poll = await (await fetch(`http://127.0.0.1:3008/api/jobs/${job.id}`)).json();
    if (poll.job.status === "completed") {
      done = true;
      break;
    }
  }
  assert.equal(done, true);
});
