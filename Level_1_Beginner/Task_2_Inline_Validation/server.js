const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3002;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));

const ALLOWED_SCOPES = ["New Build", "Site Redesign", "API & Backend"];
const ALLOWED_DELIVERABLES = [
  "Responsive UI",
  "User Auth",
  "REST API",
  "Admin Reports"
];

let nextInquiryId = 103;

const inquiryStore = [
  {
    id: 101,
    clientName: "Meenakshi Sundaram",
    email: "meenakshi@veltextiles.in",
    phone: "9840123456",
    scope: "Site Redesign",
    existingUrl: "https://veltextiles.example.in",
    budget: 65000,
    launchDate: "2026-12-20",
    deliverables: ["Responsive UI", "Admin Reports"],
    summary: "Modernize our wholesale catalog and add inquiry tracking for regional distributors.",
    createdAt: "2026-11-25 04:20 PM"
  },
  {
    id: 102,
    clientName: "Arjun Nair",
    email: "arjun.nair@keralaspicebox.com",
    phone: "9447112233",
    scope: "API & Backend",
    existingUrl: "",
    budget: 45000,
    launchDate: "2027-01-12",
    deliverables: ["User Auth", "REST API"],
    summary: "Need an inventory sync endpoint and JWT authentication for our mobile storefront.",
    createdAt: "2026-11-26 08:10 AM"
  }
];

function validateInquiryPayload(body) {
  const errors = {};
  const deliverablesRaw = body.deliverables;
  const deliverables = Array.isArray(deliverablesRaw)
    ? deliverablesRaw.filter((d) => ALLOWED_DELIVERABLES.includes(d))
    : deliverablesRaw && ALLOWED_DELIVERABLES.includes(deliverablesRaw)
      ? [deliverablesRaw]
      : [];

  const values = {
    clientName: String(body.clientName || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone || "").replace(/[\s-]/g, ""),
    scope: String(body.scope || "").trim(),
    existingUrl: String(body.existingUrl || "").trim(),
    budget: Number(body.budget),
    launchDate: String(body.launchDate || "").trim(),
    deliverables,
    summary: String(body.summary || "").trim(),
    termsAccepted: body.termsAccepted === "on" || body.termsAccepted === "true"
  };

  if (values.clientName.length < 2 || values.clientName.length > 80) {
    errors.clientName = "Enter a full name between 2 and 80 characters.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(values.email)) {
    errors.email = "Enter a valid work email address.";
  }

  if (!/^\d{10}$/.test(values.phone)) {
    errors.phone = "Enter a 10-digit mobile or contact number.";
  }

  if (!ALLOWED_SCOPES.includes(values.scope)) {
    errors.scope = "Choose a valid engagement type.";
  }

  if (values.scope === "Site Redesign") {
    try {
      const parsed = new URL(values.existingUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.existingUrl = "URL must start with http:// or https://.";
      }
    } catch {
      errors.existingUrl = "Existing website URL is required for a redesign.";
    }
  }

  if (!Number.isFinite(values.budget) || values.budget < 10000 || values.budget > 250000) {
    errors.budget = "Budget must be between INR 10,000 and INR 2,50,000.";
  }

  if (!values.launchDate) {
    errors.launchDate = "Select a target launch date.";
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(`${values.launchDate}T00:00:00`);
    if (Number.isNaN(chosen.getTime()) || chosen < today) {
      errors.launchDate = "Target launch date cannot be in the past.";
    }
  }

  if (values.deliverables.length === 0) {
    errors.deliverables = "Select at least one required deliverable.";
  }

  if (values.summary.length < 20 || values.summary.length > 400) {
    errors.summary = "Project brief must be between 20 and 400 characters.";
  }

  if (!values.termsAccepted) {
    errors.termsAccepted = "Please confirm that the scope details are accurate.";
  }

  return { errors, values };
}

function defaultFormValues() {
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 21);
  return {
    clientName: "",
    email: "",
    phone: "",
    scope: "New Build",
    existingUrl: "",
    budget: 50000,
    launchDate: nextMonth.toISOString().slice(0, 10),
    deliverables: ["Responsive UI"],
    summary: "",
    termsAccepted: false
  };
}

app.get("/", (req, res) => {
  res.render("quote", {
    inquiries: inquiryStore,
    errors: {},
    values: defaultFormValues(),
    statusMessage: req.query.saved ? "Inquiry validated and saved to temporary server memory." : null,
    allowedScopes: ALLOWED_SCOPES,
    allowedDeliverables: ALLOWED_DELIVERABLES
  });
});

app.post("/inquiries", (req, res) => {
  const { errors, values } = validateInquiryPayload(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).render("quote", {
      inquiries: inquiryStore,
      errors,
      values,
      statusMessage: null,
      allowedScopes: ALLOWED_SCOPES,
      allowedDeliverables: ALLOWED_DELIVERABLES
    });
  }

  inquiryStore.unshift({
    id: nextInquiryId++,
    ...values,
    createdAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    })
  });

  res.redirect("/?saved=1");
});

app.post("/inquiries/:id/delete", (req, res) => {
  const targetId = Number(req.params.id);
  const idx = inquiryStore.findIndex((item) => item.id === targetId);
  if (idx !== -1) {
    inquiryStore.splice(idx, 1);
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Task 2 Project Quote Intake running at http://localhost:${PORT}`);
});
