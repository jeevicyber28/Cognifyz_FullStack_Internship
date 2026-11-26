const RESERVED_HANDLES = new Set(["admin", "root", "system", "support", "staff"]);
const WEAK_FRAGMENTS = ["password", "qwerty", "123456", "admin123", "letmein"];

const state = {
  skills: ["Node.js", "Express"],
  members: [
    {
      fullName: "Nandhini Balasubramanian",
      handle: "nandhini-b",
      email: "nandhini@devportal.in",
      role: "Full Stack Engineer",
      githubUrl: "https://github.com/nandhini-b",
      skills: ["Node.js", "SQLite", "TypeScript"],
      addedAt: "2026-11-24"
    },
    {
      fullName: "Vikramaditya Rao",
      handle: "vikram-sec",
      email: "vikram@devportal.in",
      role: "Security Analyst",
      githubUrl: "https://github.com/vikram-sec",
      skills: ["Express", "OAuth2", "Docker"],
      addedAt: "2026-11-25"
    },
    {
      fullName: "Harini Venkat",
      handle: "harini-ui",
      email: "harini@devportal.in",
      role: "Frontend Engineer",
      githubUrl: "https://github.com/harini-ui",
      skills: ["TypeScript", "CSS Grid", "Accessibility"],
      addedAt: "2026-11-26"
    }
  ]
};

const ROUTES = {
  "/": "onboarding",
  "/onboarding": "onboarding",
  "/directory": "directory",
  "/policy": "policy"
};

function navigateTo(pathname, push = true) {
  const canonical = pathname === "/" || !ROUTES[pathname] ? "/onboarding" : pathname;
  const viewName = ROUTES[canonical];

  if (push && window.location.pathname !== canonical) {
    window.history.pushState({ viewName }, "", canonical);
  }

  document.querySelectorAll(".route-view").forEach((section) => {
    section.hidden = section.id !== `view-${viewName}`;
  });

  document.querySelectorAll(".nav-link[data-link]").forEach((link) => {
    const linkTarget = link.getAttribute("href");
    link.classList.toggle("active", linkTarget === canonical);
  });

  const readout = document.getElementById("currentRouteReadout");
  if (readout) {
    readout.textContent = canonical;
  }

  if (viewName === "directory") {
    renderDirectory();
  }
}

function evaluatePassword(password, handle) {
  const normalizedHandle = (handle || "").trim().toLowerCase();
  const lowered = password.toLowerCase();

  const rules = {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    notCommon:
      password.length > 0 &&
      !WEAK_FRAGMENTS.some((frag) => lowered.includes(frag)) &&
      (!normalizedHandle || normalizedHandle.length < 3 || !lowered.includes(normalizedHandle))
  };

  const passedCount = Object.values(rules).filter(Boolean).length;
  let tier = "Weak";
  let color = "#cf222e";

  if (passedCount === 6 && password.length >= 13) {
    tier = "Very Strong";
    color = "#1a7f37";
  } else if (passedCount >= 5) {
    tier = "Strong";
    color = "#2da44e";
  } else if (passedCount >= 3) {
    tier = "Moderate";
    color = "#9a6700";
  }

  return {
    rules,
    passedCount,
    percent: password.length === 0 ? 0 : Math.round((passedCount / 6) * 100),
    tier,
    color,
    isAcceptable: passedCount === 6
  };
}

function validateHandle(rawHandle) {
  const val = rawHandle.trim().toLowerCase();
  if (!val) return { ok: false, message: "Workspace handle is required." };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,18}[a-z0-9])$/.test(val)) {
    return {
      ok: false,
      message: "Use 3-20 lowercase letters, numbers, or hyphens (cannot start/end with hyphen)."
    };
  }
  if (RESERVED_HANDLES.has(val)) {
    return { ok: false, message: `'${val}' is a reserved system handle.` };
  }
  if (state.members.some((m) => m.handle === val)) {
    return { ok: false, message: `Handle '@${val}' is already taken in the directory.` };
  }
  return { ok: true, message: `Handle '@${val}' is available.` };
}

function setFieldFeedback(inputEl, msgEl, ok, text) {
  inputEl.classList.toggle("input-valid", ok);
  inputEl.classList.toggle("input-invalid", !ok);
  msgEl.className = `field-msg ${ok ? "ok" : "error"}`;
  msgEl.textContent = text;
}

function renderSkillTags() {
  const selectedBox = document.getElementById("selectedTags");
  const previewBox = document.getElementById("previewTags");
  const msgEl = document.getElementById("msg-skills");

  selectedBox.innerHTML = "";
  previewBox.innerHTML = "";

  if (state.skills.length === 0) {
    previewBox.innerHTML = '<span class="muted-note">No tags added yet</span>';
  }

  state.skills.forEach((skill) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    const label = document.createElement("span");
    label.textContent = skill;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.setAttribute("aria-label", `Remove ${skill}`);
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      state.skills = state.skills.filter((item) => item !== skill);
      renderSkillTags();
    });
    pill.append(label, removeBtn);
    selectedBox.appendChild(pill);

    const previewPill = document.createElement("span");
    previewPill.className = "tag-pill";
    previewPill.textContent = skill;
    previewBox.appendChild(previewPill);
  });

  if (state.skills.length < 2) {
    msgEl.className = "field-msg error";
    msgEl.textContent = `Add ${2 - state.skills.length} more skill tag(s).`;
  } else {
    msgEl.className = "field-msg ok";
    msgEl.textContent = `${state.skills.length} / 6 stack tags selected.`;
  }
}

function addSkill(raw) {
  const cleaned = raw.trim();
  if (!cleaned) return;
  if (state.skills.length >= 6) {
    const msgEl = document.getElementById("msg-skills");
    msgEl.className = "field-msg error";
    msgEl.textContent = "Maximum 6 stack tags allowed.";
    return;
  }
  if (!state.skills.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
    state.skills.push(cleaned);
    renderSkillTags();
  }
}

function updateLivePreview() {
  const fullName = document.getElementById("fullName").value.trim();
  const handle = document.getElementById("handle").value.trim().toLowerCase();
  const role = document.getElementById("role").value;
  const email = document.getElementById("email").value.trim();
  const url = document.getElementById("githubUrl").value.trim();

  document.getElementById("previewName").textContent = fullName || "New Member";
  document.getElementById("previewHandle").textContent = handle ? `@${handle}` : "@handle";
  document.getElementById("previewRole").textContent = role || "Not selected";
  document.getElementById("previewEmail").textContent = email || "—";
  document.getElementById("previewUrl").textContent = url || "—";

  const initials = fullName
    ? fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "?";
  document.getElementById("previewAvatar").textContent = initials;
}

function updatePasswordChecklist() {
  const password = document.getElementById("password").value;
  const handle = document.getElementById("handle").value;
  const result = evaluatePassword(password, handle);

  const fill = document.getElementById("strengthFill");
  fill.style.width = `${result.percent}%`;
  fill.style.backgroundColor = result.color;

  const label = document.getElementById("strengthLabel");
  label.textContent = password
    ? `Strength: ${result.tier} (${result.passedCount}/6 rules satisfied)`
    : "Strength: Not evaluated";
  label.style.color = password ? result.color : "#59636e";

  document.querySelectorAll("#passwordRules li").forEach((li) => {
    const ruleKey = li.dataset.rule;
    li.classList.toggle("met", Boolean(result.rules[ruleKey]));
  });

  validateConfirmPassword();
  return result;
}

function validateConfirmPassword() {
  const pwd = document.getElementById("password").value;
  const confirmEl = document.getElementById("confirmPassword");
  const msgEl = document.getElementById("msg-confirmPassword");

  if (!confirmEl.value) {
    confirmEl.classList.remove("input-valid", "input-invalid");
    msgEl.textContent = "";
    return false;
  }

  const matches = pwd === confirmEl.value;
  setFieldFeedback(confirmEl, msgEl, matches, matches ? "Passwords match." : "Passwords do not match.");
  return matches;
}

function validateAllFields() {
  const fullNameEl = document.getElementById("fullName");
  const handleEl = document.getElementById("handle");
  const emailEl = document.getElementById("email");
  const roleEl = document.getElementById("role");
  const urlEl = document.getElementById("githubUrl");
  const confirmEl = document.getElementById("confirmPassword");

  const nameOk = fullNameEl.value.trim().length >= 3;
  setFieldFeedback(
    fullNameEl,
    document.getElementById("msg-fullName"),
    nameOk,
    nameOk ? "Looks good." : "Enter at least 3 characters."
  );

  const handleCheck = validateHandle(handleEl.value);
  setFieldFeedback(handleEl, document.getElementById("msg-handle"), handleCheck.ok, handleCheck.message);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailEl.value.trim());
  setFieldFeedback(
    emailEl,
    document.getElementById("msg-email"),
    emailOk,
    emailOk ? "Valid work email." : "Enter a valid email address."
  );

  const roleOk = Boolean(roleEl.value);
  setFieldFeedback(
    roleEl,
    document.getElementById("msg-role"),
    roleOk,
    roleOk ? "Role selected." : "Choose a primary role."
  );

  let urlOk = false;
  try {
    const parsed = new URL(urlEl.value.trim());
    urlOk = parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    urlOk = false;
  }
  setFieldFeedback(
    urlEl,
    document.getElementById("msg-githubUrl"),
    urlOk,
    urlOk ? "Valid profile URL." : "Provide a full URL starting with https://."
  );

  const skillsOk = state.skills.length >= 2 && state.skills.length <= 6;
  const pwdCheck = updatePasswordChecklist();
  const confirmOk = Boolean(confirmEl.value) && validateConfirmPassword();

  return nameOk && handleCheck.ok && emailOk && roleOk && urlOk && skillsOk && pwdCheck.isAcceptable && confirmOk;
}

function renderDirectory() {
  const grid = document.getElementById("directoryGrid");
  const query = document.getElementById("dirSearch").value.trim().toLowerCase();
  const roleFilter = document.getElementById("dirRoleFilter").value;

  document.getElementById("dirCountBadge").textContent = String(state.members.length);

  const filtered = state.members.filter((member) => {
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const haystack = `${member.fullName} ${member.handle} ${member.skills.join(" ")}`.toLowerCase();
    return matchesRole && (!query || haystack.includes(query));
  });

  grid.innerHTML = "";
  if (filtered.length === 0) {
    grid.innerHTML = '<p class="muted-note">No team members match the current filter.</p>';
    return;
  }

  filtered.forEach((member) => {
    const card = document.createElement("article");
    card.className = "dir-card";

    const top = document.createElement("div");
    top.className = "dir-card-top";

    const identity = document.createElement("div");
    const nameEl = document.createElement("strong");
    nameEl.textContent = member.fullName;
    const handleEl = document.createElement("div");
    handleEl.className = "member-handle";
    handleEl.textContent = `@${member.handle}`;
    identity.append(nameEl, handleEl);

    const roleEl = document.createElement("span");
    roleEl.className = "dir-role";
    roleEl.textContent = member.role;
    top.append(identity, roleEl);

    const emailEl = document.createElement("div");
    emailEl.className = "small-copy muted-note";
    emailEl.textContent = member.email;

    const tagsEl = document.createElement("div");
    tagsEl.className = "tag-pills";
    member.skills.forEach((skill) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = skill;
      tagsEl.appendChild(pill);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-member-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      state.members = state.members.filter((item) => item.handle !== member.handle);
      renderDirectory();
    });

    card.append(top, emailEl, tagsEl, removeBtn);
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    event.preventDefault();
    navigateTo(link.getAttribute("href"), true);
  });

  window.addEventListener("popstate", () => {
    navigateTo(window.location.pathname, false);
  });

  renderSkillTags();
  updateLivePreview();
  document.getElementById("dirCountBadge").textContent = String(state.members.length);

  ["fullName", "handle", "email", "role", "githubUrl"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      updateLivePreview();
      if (id === "handle") {
        const res = validateHandle(document.getElementById("handle").value);
        setFieldFeedback(
          document.getElementById("handle"),
          document.getElementById("msg-handle"),
          res.ok,
          res.message
        );
        updatePasswordChecklist();
      }
    });
  });

  document.getElementById("password").addEventListener("input", updatePasswordChecklist);
  document.getElementById("confirmPassword").addEventListener("input", validateConfirmPassword);

  document.getElementById("togglePwdBtn").addEventListener("click", () => {
    const pwd = document.getElementById("password");
    const confirm = document.getElementById("confirmPassword");
    const nextType = pwd.type === "password" ? "text" : "password";
    pwd.type = nextType;
    confirm.type = nextType;
    document.getElementById("togglePwdBtn").textContent = nextType === "text" ? "Hide" : "Show";
  });

  document.getElementById("addSkillBtn").addEventListener("click", () => {
    const input = document.getElementById("skillInput");
    addSkill(input.value);
    input.value = "";
  });

  document.getElementById("skillInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill(event.target.value);
      event.target.value = "";
    }
  });

  document.querySelectorAll("#quickChips .chip").forEach((chip) => {
    chip.addEventListener("click", () => addSkill(chip.dataset.skill));
  });

  document.getElementById("onboardingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const banner = document.getElementById("formBanner");

    if (!validateAllFields()) {
      banner.textContent = "Please resolve highlighted validation errors.";
      banner.style.color = "#cf222e";
      return;
    }

    const newMember = {
      fullName: document.getElementById("fullName").value.trim(),
      handle: document.getElementById("handle").value.trim().toLowerCase(),
      email: document.getElementById("email").value.trim(),
      role: document.getElementById("role").value,
      githubUrl: document.getElementById("githubUrl").value.trim(),
      skills: [...state.skills],
      addedAt: new Date().toISOString().slice(0, 10)
    };

    state.members.unshift(newMember);
    document.getElementById("dirCountBadge").textContent = String(state.members.length);
    document.getElementById("onboardingForm").reset();
    state.skills = ["Node.js", "Express"];
    renderSkillTags();
    updateLivePreview();
    updatePasswordChecklist();
    document.querySelectorAll(".input-valid, .input-invalid").forEach((el) => {
      el.classList.remove("input-valid", "input-invalid");
    });
    document.querySelectorAll("#onboardingForm .field-msg:not(#msg-skills)").forEach((el) => {
      el.className = "field-msg";
      el.textContent = "";
    });

    banner.textContent = `Member @${newMember.handle} provisioned. Switching to directory...`;
    banner.style.color = "#1a7f37";
    setTimeout(() => {
      banner.textContent = "";
      navigateTo("/directory", true);
    }, 600);
  });

  document.getElementById("dirSearch").addEventListener("input", renderDirectory);
  document.getElementById("dirRoleFilter").addEventListener("change", renderDirectory);

  document.getElementById("sandboxHandle").addEventListener("input", (event) => {
    const res = validateHandle(event.target.value);
    const out = document.getElementById("sandboxHandleResult");
    out.className = `field-msg ${res.ok ? "ok" : "error"}`;
    out.textContent = res.message;
  });

  document.getElementById("sandboxPwd").addEventListener("input", (event) => {
    const handle = document.getElementById("sandboxHandle").value;
    const res = evaluatePassword(event.target.value, handle);
    const out = document.getElementById("sandboxPwdScore");
    if (!event.target.value) {
      out.textContent = "";
      return;
    }
    out.style.color = res.color;
    out.textContent = `${res.tier} (${res.passedCount}/6 rules passed)`;
  });

  navigateTo(window.location.pathname, false);
});
