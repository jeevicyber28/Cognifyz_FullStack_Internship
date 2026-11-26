const traceLog = [];
let searchTimer = null;

async function apiFetch(url, options = {}) {
  const started = performance.now();
  const method = (options.method || "GET").toUpperCase();
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const elapsed = Math.round(performance.now() - started);

  traceLog.unshift({
    method,
    url,
    status: response.status,
    elapsed
  });
  if (traceLog.length > 5) traceLog.pop();
  renderTraceLog();

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function renderTraceLog() {
  const box = document.getElementById("apiTrace");
  box.innerHTML = "";
  traceLog.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "trace-item";
    const left = document.createElement("span");
    left.textContent = `${entry.method} ${entry.url}`;
    const right = document.createElement("span");
    right.textContent = `HTTP ${entry.status} · ${entry.elapsed} ms`;
    row.append(left, right);
    box.appendChild(row);
  });
}

async function loadIssues() {
  const q = document.getElementById("searchInput").value.trim();
  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "All") params.set("status", status);
  if (priority !== "All") params.set("priority", priority);

  const queryString = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch(`/api/issues${queryString}`);

  document.getElementById("statTotal").textContent = data.summary.total;
  document.getElementById("statOpen").textContent = data.summary.open;
  document.getElementById("statProgress").textContent = data.summary.inProgress;
  document.getElementById("statResolved").textContent = data.summary.resolved;

  renderIssues(data.issues);
}

function renderIssues(issues) {
  const container = document.getElementById("issuesList");
  container.innerHTML = "";

  if (issues.length === 0) {
    container.innerHTML = '<p class="muted">No issues match your current filters.</p>';
    return;
  }

  issues.forEach((issue) => {
    const row = document.createElement("article");
    row.className = "issue-row";

    const main = document.createElement("div");
    main.className = "issue-main";

    const meta = document.createElement("div");
    meta.className = "issue-meta";

    const idSpan = document.createElement("span");
    idSpan.className = "issue-id";
    idSpan.textContent = issue.id;

    const prioSpan = document.createElement("span");
    prioSpan.className = `pill pill-${issue.priority.toLowerCase()}`;
    prioSpan.textContent = `${issue.priority} Priority`;

    meta.append(idSpan, prioSpan);

    const title = document.createElement("h3");
    title.className = "issue-title";
    title.textContent = issue.title;

    const desc = document.createElement("p");
    desc.className = "issue-desc";
    desc.textContent = issue.description;

    const foot = document.createElement("div");
    foot.className = "issue-foot";
    const dateText = new Date(issue.updatedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
    foot.textContent = `Assignee: ${issue.assignee} · Updated ${dateText}`;

    main.append(meta, title, desc, foot);

    const controls = document.createElement("div");
    controls.className = "issue-controls";

    const statusSelect = document.createElement("select");
    statusSelect.className = "status-select";
    statusSelect.setAttribute("aria-label", `Change status for ${issue.id}`);
    ["Open", "In Progress", "Resolved"].forEach((optVal) => {
      const opt = document.createElement("option");
      opt.value = optVal;
      opt.textContent = optVal;
      opt.selected = issue.status === optVal;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener("change", async () => {
      try {
        await apiFetch(`/api/issues/${issue.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: statusSelect.value })
        });
        await loadIssues();
      } catch (err) {
        alert(err.message);
        await loadIssues();
      }
    });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-link";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openEditModal(issue));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-link danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/issues/${issue.id}`, { method: "DELETE" });
        await loadIssues();
      } catch (err) {
        alert(err.message);
      }
    });

    controls.append(statusSelect, editBtn, delBtn);
    row.append(main, controls);
    container.appendChild(row);
  });
}

function openCreateModal() {
  document.getElementById("dialogTitle").textContent = "Log New Issue";
  document.getElementById("editingIssueId").value = "";
  document.getElementById("issueForm").reset();
  document.getElementById("dialogError").hidden = true;
  document.getElementById("issueDialog").showModal();
}

function openEditModal(issue) {
  document.getElementById("dialogTitle").textContent = `Edit ${issue.id}`;
  document.getElementById("editingIssueId").value = issue.id;
  document.getElementById("issueTitle").value = issue.title;
  document.getElementById("issuePriority").value = issue.priority;
  document.getElementById("issueStatus").value = issue.status;
  document.getElementById("issueAssignee").value = issue.assignee;
  document.getElementById("issueDesc").value = issue.description;
  document.getElementById("dialogError").hidden = true;
  document.getElementById("issueDialog").showModal();
}

document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("issueDialog");

  document.getElementById("openCreateBtn").addEventListener("click", openCreateModal);
  document.getElementById("closeDialogBtn").addEventListener("click", () => dialog.close());
  document.getElementById("cancelDialogBtn").addEventListener("click", () => dialog.close());
  document.getElementById("refreshBtn").addEventListener("click", loadIssues);

  document.getElementById("statusFilter").addEventListener("change", loadIssues);
  document.getElementById("priorityFilter").addEventListener("change", loadIssues);
  document.getElementById("searchInput").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadIssues, 220);
  });

  document.getElementById("issueForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const editingId = document.getElementById("editingIssueId").value;
    const errorBox = document.getElementById("dialogError");
    errorBox.hidden = true;

    const payload = {
      title: document.getElementById("issueTitle").value,
      priority: document.getElementById("issuePriority").value,
      status: document.getElementById("issueStatus").value,
      assignee: document.getElementById("issueAssignee").value,
      description: document.getElementById("issueDesc").value
    };

    try {
      if (editingId) {
        await apiFetch(`/api/issues/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/api/issues", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      dialog.close();
      await loadIssues();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });

  loadIssues();
});
