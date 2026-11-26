let activeUser = null;
let loadedExpenses = [];

function showError(elId, message) {
  const el = document.getElementById(elId);
  if (!message) {
    el.hidden = true;
    el.textContent = "";
  } else {
    el.hidden = false;
    el.textContent = message;
  }
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setAuthenticatedView(user) {
  activeUser = user;
  document.getElementById("authSection").hidden = Boolean(user);
  document.getElementById("appSection").hidden = !user;
  document.getElementById("userControls").hidden = !user;

  if (user) {
    document.getElementById("currentUserLabel").textContent = `${user.name} (${user.email})`;
    document.getElementById("expDate").value = new Date().toISOString().slice(0, 10);
    loadExpenses();
  }
}

async function checkSession() {
  try {
    const data = await requestJson("/api/auth/session");
    setAuthenticatedView(data.user);
  } catch {
    setAuthenticatedView(null);
  }
}

async function loadExpenses() {
  const q = document.getElementById("filterSearch").value.trim();
  const category = document.getElementById("filterCategory").value;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category !== "All") params.set("category", category);

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await requestJson(`/api/expenses${query}`);
  loadedExpenses = data.expenses;

  document.getElementById("totalSpend").textContent = `INR ${Number(
    data.summary.grandTotal
  ).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById("entryCount").textContent = String(data.summary.totalEntries);
  document.getElementById("topCategory").textContent =
    data.breakdown.length > 0 ? data.breakdown[0].category : "—";

  renderBreakdown(data.breakdown, data.summary.grandTotal);
  renderExpenseTable(data.expenses);
}

function renderBreakdown(breakdown, grandTotal) {
  const box = document.getElementById("breakdownList");
  box.innerHTML = "";

  if (breakdown.length === 0) {
    box.innerHTML = '<div class="sub">No expense categories recorded yet.</div>';
    return;
  }

  breakdown.forEach((row) => {
    const pct = grandTotal > 0 ? Math.round((Number(row.total) / grandTotal) * 100) : 0;
    const item = document.createElement("div");
    item.className = "breakdown-row";

    const top = document.createElement("div");
    top.className = "breakdown-top";
    const name = document.createElement("span");
    name.textContent = `${row.category} (${row.entries})`;
    const val = document.createElement("strong");
    val.className = "tabular";
    val.textContent = `INR ${Number(row.total).toLocaleString("en-IN")}`;
    top.append(name, val);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${pct}%`;
    track.appendChild(fill);

    item.append(top, track);
    box.appendChild(item);
  });
}

function renderExpenseTable(expenses) {
  const tbody = document.getElementById("expenseRows");
  tbody.innerHTML = "";

  if (expenses.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "sub";
    td.textContent = "No expenses found.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  expenses.forEach((row) => {
    const tr = document.createElement("tr");

    const dateTd = document.createElement("td");
    dateTd.className = "tabular";
    dateTd.textContent = row.spent_on;

    const itemTd = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = row.title;
    itemTd.appendChild(strong);
    if (row.note) {
      const noteDiv = document.createElement("div");
      noteDiv.className = "sub";
      noteDiv.textContent = row.note;
      itemTd.appendChild(noteDiv);
    }

    const catTd = document.createElement("td");
    const catSpan = document.createElement("span");
    catSpan.className = "cat-tag";
    catSpan.textContent = row.category;
    catTd.appendChild(catSpan);

    const amtTd = document.createElement("td");
    amtTd.className = "num tabular";
    amtTd.textContent = `INR ${Number(row.amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    const actTd = document.createElement("td");
    const actWrap = document.createElement("div");
    actWrap.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "act-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditing(row));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "act-btn del";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      await requestJson(`/api/expenses/${row.id}`, { method: "DELETE" });
      await loadExpenses();
    });

    actWrap.append(editBtn, delBtn);
    actTd.appendChild(actWrap);

    tr.append(dateTd, itemTd, catTd, amtTd, actTd);
    tbody.appendChild(tr);
  });
}

function startEditing(row) {
  document.getElementById("editingId").value = String(row.id);
  document.getElementById("expTitle").value = row.title;
  document.getElementById("expCategory").value = row.category;
  document.getElementById("expAmount").value = row.amount;
  document.getElementById("expDate").value = row.spent_on;
  document.getElementById("expNote").value = row.note || "";
  document.getElementById("saveExpBtn").textContent = "Update Entry";
  document.getElementById("cancelEditBtn").hidden = false;
}

function resetExpenseForm() {
  document.getElementById("editingId").value = "";
  document.getElementById("expenseForm").reset();
  document.getElementById("expDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("saveExpBtn").textContent = "Add Entry";
  document.getElementById("cancelEditBtn").hidden = true;
  showError("expError", "");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isLogin = btn.dataset.tab === "login";
      document.getElementById("loginForm").hidden = !isLogin;
      document.getElementById("registerForm").hidden = isLogin;
      showError("loginError", "");
      showError("regError", "");
    });
  });

  document.querySelectorAll(".btn-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById("loginEmail").value = chip.dataset.email;
      document.getElementById("loginPassword").value = chip.dataset.pass;
    });
  });

  document.getElementById("probeAuthBtn").addEventListener("click", async () => {
    const out = document.getElementById("probeOutput");
    out.hidden = false;
    try {
      await requestJson("/api/expenses");
    } catch (err) {
      out.textContent = `HTTP ${err.status}: ${err.message}`;
    }
  });

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("loginError", "");
    try {
      const data = await requestJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("loginEmail").value,
          password: document.getElementById("loginPassword").value
        })
      });
      setAuthenticatedView(data.user);
    } catch (err) {
      showError("loginError", err.message);
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("regError", "");
    try {
      const data = await requestJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("regName").value,
          email: document.getElementById("regEmail").value,
          password: document.getElementById("regPassword").value
        })
      });
      setAuthenticatedView(data.user);
    } catch (err) {
      showError("regError", err.message);
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await requestJson("/api/auth/logout", { method: "POST" });
    resetExpenseForm();
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterCategory").value = "All";
    document.getElementById("expenseRows").innerHTML = "";
    document.getElementById("breakdownList").innerHTML = "";
    setAuthenticatedView(null);
  });

  document.getElementById("expenseForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("expError", "");

    const editingId = document.getElementById("editingId").value;
    const payload = {
      title: document.getElementById("expTitle").value,
      category: document.getElementById("expCategory").value,
      amount: Number(document.getElementById("expAmount").value),
      spent_on: document.getElementById("expDate").value,
      note: document.getElementById("expNote").value
    };

    try {
      if (editingId) {
        await requestJson(`/api/expenses/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await requestJson("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      resetExpenseForm();
      await loadExpenses();
    } catch (err) {
      showError("expError", err.message);
    }
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetExpenseForm);
  document.getElementById("filterCategory").addEventListener("change", loadExpenses);
  document.getElementById("filterSearch").addEventListener("input", loadExpenses);

  checkSession();
});
