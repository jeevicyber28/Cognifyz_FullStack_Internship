const fs = require("fs");
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3005;
const DATA_FILE = path.join(__dirname, "data", "issues.json");

const VALID_STATUSES = ["Open", "In Progress", "Resolved"];
const VALID_PRIORITIES = ["Low", "Medium", "High"];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readIssues() {
  const raw = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(raw);
}

function writeIssues(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function nextIssueId(items) {
  let maxNum = 100;
  for (const item of items) {
    const match = /^ISS-(\d+)$/.exec(item.id);
    if (match) {
      maxNum = Math.max(maxNum, Number(match[1]));
    }
  }
  return `ISS-${maxNum + 1}`;
}

app.get("/api/issues", (req, res) => {
  const statusFilter = String(req.query.status || "").trim();
  const priorityFilter = String(req.query.priority || "").trim();
  const query = String(req.query.q || "").trim().toLowerCase();

  const allIssues = readIssues();
  const filtered = allIssues.filter((issue) => {
    if (statusFilter && statusFilter !== "All" && issue.status !== statusFilter) return false;
    if (priorityFilter && priorityFilter !== "All" && issue.priority !== priorityFilter) return false;
    if (query) {
      const hay = `${issue.id} ${issue.title} ${issue.description} ${issue.assignee}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const summary = {
    total: allIssues.length,
    open: allIssues.filter((i) => i.status === "Open").length,
    inProgress: allIssues.filter((i) => i.status === "In Progress").length,
    resolved: allIssues.filter((i) => i.status === "Resolved").length
  };

  res.json({ issues: filtered, summary });
});

app.get("/api/issues/:id", (req, res) => {
  const issues = readIssues();
  const found = issues.find((item) => item.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: `Issue ${req.params.id} not found.` });
  }
  res.json({ issue: found });
});

app.post("/api/issues", (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const status = String(req.body.status || "Open").trim();
  const priority = String(req.body.priority || "Medium").trim();
  const assignee = String(req.body.assignee || "Unassigned").trim();

  if (title.length < 4 || title.length > 120) {
    return res.status(400).json({ error: "Title must be between 4 and 120 characters." });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority value." });
  }

  const issues = readIssues();
  const created = {
    id: nextIssueId(issues),
    title,
    description: description || "No additional context provided.",
    status,
    priority,
    assignee: assignee || "Unassigned",
    updatedAt: new Date().toISOString()
  };

  issues.unshift(created);
  writeIssues(issues);

  res.status(201).json({ issue: created });
});

function handleUpdate(req, res) {
  const issues = readIssues();
  const idx = issues.findIndex((item) => item.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: `Issue ${req.params.id} not found.` });
  }

  const current = issues[idx];
  const nextTitle = req.body.title !== undefined ? String(req.body.title).trim() : current.title;
  const nextDesc = req.body.description !== undefined ? String(req.body.description).trim() : current.description;
  const nextStatus = req.body.status !== undefined ? String(req.body.status).trim() : current.status;
  const nextPriority = req.body.priority !== undefined ? String(req.body.priority).trim() : current.priority;
  const nextAssignee = req.body.assignee !== undefined ? String(req.body.assignee).trim() : current.assignee;

  if (nextTitle.length < 4 || nextTitle.length > 120) {
    return res.status(400).json({ error: "Title must be between 4 and 120 characters." });
  }
  if (!VALID_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  if (!VALID_PRIORITIES.includes(nextPriority)) {
    return res.status(400).json({ error: "Invalid priority value." });
  }

  issues[idx] = {
    ...current,
    title: nextTitle,
    description: nextDesc || current.description,
    status: nextStatus,
    priority: nextPriority,
    assignee: nextAssignee || "Unassigned",
    updatedAt: new Date().toISOString()
  };

  writeIssues(issues);
  res.json({ issue: issues[idx] });
}

app.put("/api/issues/:id", handleUpdate);
app.patch("/api/issues/:id", handleUpdate);

app.delete("/api/issues/:id", (req, res) => {
  const issues = readIssues();
  const idx = issues.findIndex((item) => item.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: `Issue ${req.params.id} not found.` });
  }

  const [removed] = issues.splice(idx, 1);
  writeIssues(issues);
  res.json({ deleted: removed });
});

app.listen(PORT, () => {
  console.log(`Task 5 TrackDesk REST API running at http://localhost:${PORT}`);
});
